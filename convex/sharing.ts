import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// Helper to get authenticated user
async function getLoggedInUser(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("User not authenticated");
  }
  return userId;
}

/**
 * Generate a cryptographically secure random token for invite links.
 * Uses Web Crypto API for secure randomness (not Math.random which is predictable).
 * Returns a URL-safe base64 string of 32 bytes (43 characters).
 */
function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  // Convert to URL-safe base64 (no padding, replace + with -, / with _)
  const base64 = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  return base64;
}

/**
 * Add an anonymous share (just a name, no user account needed)
 */
export const addAnonymousShare = mutation({
  args: {
    subscriptionId: v.id("subscriptions"),
    name: v.string(),
  },
  returns: v.id("subscriptionShares"),
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);

    // Verify ownership of subscription
    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription || subscription.userId !== userId) {
      throw new Error("Subscription not found or access denied");
    }

    return await ctx.db.insert("subscriptionShares", {
      subscriptionId: args.subscriptionId,
      type: "anonymous",
      name: args.name,
      isHidden: false,
      createdAt: Date.now(),
    });
  },
});

/**
 * Create an invite link for sharing a subscription
 */
export const createInviteLink = mutation({
  args: {
    subscriptionId: v.id("subscriptions"),
    expiresInDays: v.optional(v.number()),
  },
  returns: v.object({
    token: v.string(),
    expiresAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);

    // Verify ownership of subscription
    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription || subscription.userId !== userId) {
      throw new Error("Subscription not found or access denied");
    }

    const token = generateToken();
    const expiresAt = Date.now() + (args.expiresInDays || 7) * 24 * 60 * 60 * 1000;

    await ctx.db.insert("shareInvites", {
      subscriptionId: args.subscriptionId,
      token,
      expiresAt,
      createdAt: Date.now(),
    });

    return { token, expiresAt };
  },
});

/**
 * Get invite info by token (for preview before claiming)
 */
export const getInviteInfo = query({
  args: { token: v.string() },
  returns: v.union(
    v.object({
      valid: v.literal(true),
      subscriptionName: v.string(),
      ownerName: v.optional(v.string()),
      cost: v.number(),
      currency: v.string(),
      billingCycle: v.string(),
      maxSlots: v.optional(v.number()),
      expiresAt: v.number(),
    }),
    v.object({
      valid: v.literal(false),
      reason: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const invite = await ctx.db
      .query("shareInvites")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invite) {
      return { valid: false as const, reason: "Invite not found" };
    }

    if (invite.claimedBy) {
      return { valid: false as const, reason: "Invite already claimed" };
    }

    if (invite.expiresAt < Date.now()) {
      return { valid: false as const, reason: "Invite expired" };
    }

    const subscription = await ctx.db.get(invite.subscriptionId);
    if (!subscription) {
      return { valid: false as const, reason: "Subscription no longer exists" };
    }

    const owner = await ctx.db.get(subscription.userId);

    return {
      valid: true as const,
      subscriptionName: subscription.name,
      ownerName: owner?.name,
      cost: subscription.cost,
      currency: subscription.currency,
      billingCycle: subscription.billingCycle,
      maxSlots: subscription.maxSlots,
      expiresAt: invite.expiresAt,
    };
  },
});

/**
 * Claim an invite link (authenticated user becomes beneficiary)
 */
export const claimInvite = mutation({
  args: { token: v.string() },
  returns: v.union(
    v.object({
      success: v.literal(true),
      subscriptionId: v.id("subscriptions"),
    }),
    v.object({
      success: v.literal(false),
      reason: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);

    const invite = await ctx.db
      .query("shareInvites")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invite) {
      return { success: false as const, reason: "Invite not found" };
    }

    if (invite.claimedBy) {
      return { success: false as const, reason: "Invite already claimed" };
    }

    if (invite.expiresAt < Date.now()) {
      return { success: false as const, reason: "Invite expired" };
    }

    const subscription = await ctx.db.get(invite.subscriptionId);
    if (!subscription) {
      return { success: false as const, reason: "Subscription no longer exists" };
    }

    // Check if user is the owner
    if (subscription.userId === userId) {
      return { success: false as const, reason: "You cannot share with yourself" };
    }

    // Check if already shared with this user
    const existingShare = await ctx.db
      .query("subscriptionShares")
      .withIndex("by_subscription", (q) => q.eq("subscriptionId", invite.subscriptionId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    if (existingShare) {
      return { success: false as const, reason: "Already shared with you" };
    }

    // Create the share
    await ctx.db.insert("subscriptionShares", {
      subscriptionId: invite.subscriptionId,
      type: "user",
      userId,
      isHidden: false,
      createdAt: Date.now(),
    });

    // Mark invite as claimed
    await ctx.db.patch(invite._id, { claimedBy: userId });

    return { success: true as const, subscriptionId: invite.subscriptionId };
  },
});

/**
 * Get shares for a subscription (owner view)
 */
export const getSubscriptionShares = query({
  args: { subscriptionId: v.id("subscriptions") },
  returns: v.array(
    v.object({
      _id: v.id("subscriptionShares"),
      type: v.union(v.literal("user"), v.literal("anonymous")),
      name: v.optional(v.string()),
      userId: v.optional(v.id("users")),
      userName: v.optional(v.string()),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);

    // Verify ownership
    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription || subscription.userId !== userId) {
      throw new Error("Subscription not found or access denied");
    }

    const shares = await ctx.db
      .query("subscriptionShares")
      .withIndex("by_subscription", (q) => q.eq("subscriptionId", args.subscriptionId))
      .collect();

    return await Promise.all(
      shares.map(async (share) => {
        let userName: string | undefined;
        if (share.type === "user" && share.userId) {
          const user = await ctx.db.get(share.userId);
          userName = user?.name ?? user?.email ?? undefined;
        }
        return {
          _id: share._id,
          type: share.type,
          name: share.name,
          userId: share.userId,
          userName,
          createdAt: share.createdAt,
        };
      }),
    );
  },
});

/**
 * Remove a share (owner action)
 */
export const removeShare = mutation({
  args: { shareId: v.id("subscriptionShares") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);

    const share = await ctx.db.get(args.shareId);
    if (!share) {
      throw new Error("Share not found");
    }

    // Verify ownership of the subscription
    const subscription = await ctx.db.get(share.subscriptionId);
    if (!subscription || subscription.userId !== userId) {
      throw new Error("Access denied");
    }

    await ctx.db.delete(args.shareId);
    return null;
  },
});

/**
 * Toggle hide status for a shared subscription (beneficiary action)
 */
export const toggleHideShare = mutation({
  args: { shareId: v.id("subscriptionShares") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);

    const share = await ctx.db.get(args.shareId);
    if (!share) {
      throw new Error("Share not found");
    }

    // Verify this share belongs to the current user
    if (share.type !== "user" || share.userId !== userId) {
      throw new Error("Access denied");
    }

    const newHiddenState = !share.isHidden;
    await ctx.db.patch(args.shareId, { isHidden: newHiddenState });
    return newHiddenState;
  },
});

/**
 * Get subscriptions shared with the current user (beneficiary view)
 */
export const getSharedWithMe = query({
  args: { includeHidden: v.optional(v.boolean()) },
  returns: v.array(
    v.object({
      shareId: v.id("subscriptionShares"),
      subscriptionId: v.id("subscriptions"),
      name: v.string(),
      cost: v.number(),
      currency: v.string(),
      billingCycle: v.union(
        v.literal("monthly"),
        v.literal("yearly"),
        v.literal("weekly"),
        v.literal("daily"),
      ),
      nextBillingDate: v.number(),
      maxSlots: v.optional(v.number()),
      ownerName: v.optional(v.string()),
      isHidden: v.boolean(),
      isActive: v.boolean(),
    }),
  ),
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);

    let sharesQuery = ctx.db
      .query("subscriptionShares")
      .withIndex("by_user", (q) => q.eq("userId", userId));

    if (!args.includeHidden) {
      sharesQuery = ctx.db
        .query("subscriptionShares")
        .withIndex("by_user_and_hidden", (q) => q.eq("userId", userId).eq("isHidden", false));
    }

    const shares = await sharesQuery.collect();

    const results = await Promise.all(
      shares.map(async (share) => {
        const subscription = await ctx.db.get(share.subscriptionId);
        if (!subscription) return null;

        const owner = await ctx.db.get(subscription.userId);

        return {
          shareId: share._id,
          subscriptionId: subscription._id,
          name: subscription.name,
          cost: subscription.cost,
          currency: subscription.currency,
          billingCycle: subscription.billingCycle,
          nextBillingDate: subscription.nextBillingDate,
          maxSlots: subscription.maxSlots,
          ownerName: owner?.name ?? owner?.email ?? undefined,
          isHidden: share.isHidden,
          isActive: subscription.isActive,
        };
      }),
    );

    return results.filter((r): r is NonNullable<typeof r> => r !== null);
  },
});

/**
 * Get pending invites for a subscription (owner can see/revoke)
 */
export const getPendingInvites = query({
  args: { subscriptionId: v.id("subscriptions") },
  returns: v.array(
    v.object({
      _id: v.id("shareInvites"),
      token: v.string(),
      expiresAt: v.number(),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);

    // Verify ownership
    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription || subscription.userId !== userId) {
      throw new Error("Subscription not found or access denied");
    }

    const invites = await ctx.db
      .query("shareInvites")
      .withIndex("by_subscription", (q) => q.eq("subscriptionId", args.subscriptionId))
      .filter((q) =>
        q.and(q.eq(q.field("claimedBy"), undefined), q.gt(q.field("expiresAt"), Date.now())),
      )
      .collect();

    return invites.map((inv) => ({
      _id: inv._id,
      token: inv.token,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
    }));
  },
});

/**
 * Revoke an invite link
 */
export const revokeInvite = mutation({
  args: { inviteId: v.id("shareInvites") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);

    const invite = await ctx.db.get(args.inviteId);
    if (!invite) {
      throw new Error("Invite not found");
    }

    // Verify ownership of the subscription
    const subscription = await ctx.db.get(invite.subscriptionId);
    if (!subscription || subscription.userId !== userId) {
      throw new Error("Access denied");
    }

    await ctx.db.delete(args.inviteId);
    return null;
  },
});

/**
 * Calculate ROI/waste for a family subscription (owner view)
 */
export const getSubscriptionROI = query({
  args: { subscriptionId: v.id("subscriptions") },
  returns: v.union(
    v.object({
      hasSlots: v.literal(true),
      maxSlots: v.number(),
      usedSlots: v.number(), // includes owner
      unusedSlots: v.number(),
      costPerSlot: v.number(),
      wastedAmount: v.number(),
      currency: v.string(),
    }),
    v.object({
      hasSlots: v.literal(false),
    }),
  ),
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);

    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription || subscription.userId !== userId) {
      throw new Error("Subscription not found or access denied");
    }

    if (!subscription.maxSlots) {
      return { hasSlots: false as const };
    }

    const shares = await ctx.db
      .query("subscriptionShares")
      .withIndex("by_subscription", (q) => q.eq("subscriptionId", args.subscriptionId))
      .collect();

    const usedSlots = shares.length + 1; // +1 for owner
    const unusedSlots = Math.max(0, subscription.maxSlots - usedSlots);
    const costPerSlot = subscription.cost / subscription.maxSlots;
    const wastedAmount = unusedSlots * costPerSlot;

    return {
      hasSlots: true as const,
      maxSlots: subscription.maxSlots,
      usedSlots,
      unusedSlots,
      costPerSlot,
      wastedAmount,
      currency: subscription.currency,
    };
  },
});

/**
 * Internal mutation to claim invite (used by HTTP route)
 */
export const claimInviteInternal = internalMutation({
  args: {
    token: v.string(),
    userId: v.id("users"),
  },
  returns: v.union(
    v.object({
      success: v.literal(true),
      subscriptionId: v.id("subscriptions"),
    }),
    v.object({
      success: v.literal(false),
      reason: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const invite = await ctx.db
      .query("shareInvites")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invite) {
      return { success: false as const, reason: "Invite not found" };
    }

    if (invite.claimedBy) {
      return { success: false as const, reason: "Invite already claimed" };
    }

    if (invite.expiresAt < Date.now()) {
      return { success: false as const, reason: "Invite expired" };
    }

    const subscription = await ctx.db.get(invite.subscriptionId);
    if (!subscription) {
      return { success: false as const, reason: "Subscription no longer exists" };
    }

    if (subscription.userId === args.userId) {
      return { success: false as const, reason: "You cannot share with yourself" };
    }

    const existingShare = await ctx.db
      .query("subscriptionShares")
      .withIndex("by_subscription", (q) => q.eq("subscriptionId", invite.subscriptionId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (existingShare) {
      return { success: false as const, reason: "Already shared with you" };
    }

    await ctx.db.insert("subscriptionShares", {
      subscriptionId: invite.subscriptionId,
      type: "user",
      userId: args.userId,
      isHidden: false,
      createdAt: Date.now(),
    });

    await ctx.db.patch(invite._id, { claimedBy: args.userId });

    return { success: true as const, subscriptionId: invite.subscriptionId };
  },
});

import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/admin";

async function getLoggedInUser(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("User not authenticated");
  }
  return userId;
}

export const create = mutation({
  args: {
    serviceName: v.string(),
    website: v.optional(v.string()),
  },
  returns: v.id("serviceRequests"),
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);

    return await ctx.db.insert("serviceRequests", {
      serviceName: args.serviceName,
      website: args.website,
      requestedBy: userId,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

// List pending requests - ADMIN ONLY
export const listPending = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("serviceRequests"),
      serviceName: v.string(),
      website: v.optional(v.string()),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    // Require admin access
    await requireAdmin(ctx);

    return await ctx.db
      .query("serviceRequests")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
  },
});

// Approve a service request - ADMIN ONLY
export const approve = mutation({
  args: {
    requestId: v.id("serviceRequests"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    await ctx.db.patch(args.requestId, {
      status: "approved",
    });

    return null;
  },
});

// Reject a service request - ADMIN ONLY
export const reject = mutation({
  args: {
    requestId: v.id("serviceRequests"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    await ctx.db.patch(args.requestId, {
      status: "rejected",
    });

    return null;
  },
});

// List user's own requests
export const listMine = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("serviceRequests"),
      serviceName: v.string(),
      website: v.optional(v.string()),
      status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const userId = await getLoggedInUser(ctx);

    return await ctx.db
      .query("serviceRequests")
      .filter((q) => q.eq(q.field("requestedBy"), userId))
      .collect();
  },
});

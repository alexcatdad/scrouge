import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

async function getLoggedInUser(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("User not authenticated");
  }
  return userId;
}

export const list = query({
  args: { activeOnly: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);
    
    let query = ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId));
    
    if (args.activeOnly) {
      query = ctx.db
        .query("subscriptions")
        .withIndex("by_user_and_active", (q) => 
          q.eq("userId", userId).eq("isActive", true)
        );
    }
    
    const subscriptions = await query.collect();
    
    // Get payment methods for each subscription
    const subscriptionsWithPayment = await Promise.all(
      subscriptions.map(async (sub) => {
        const paymentMethod = await ctx.db.get(sub.paymentMethodId);
        return {
          ...sub,
          paymentMethod,
        };
      })
    );
    
    return subscriptionsWithPayment;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    cost: v.number(),
    currency: v.string(),
    billingCycle: v.union(
      v.literal("monthly"),
      v.literal("yearly"),
      v.literal("weekly"),
      v.literal("daily")
    ),
    nextBillingDate: v.number(),
    paymentMethodId: v.id("paymentMethods"),
    category: v.string(),
    website: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);
    
    return await ctx.db.insert("subscriptions", {
      userId,
      ...args,
      isActive: true,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("subscriptions"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    cost: v.optional(v.number()),
    currency: v.optional(v.string()),
    billingCycle: v.optional(v.union(
      v.literal("monthly"),
      v.literal("yearly"),
      v.literal("weekly"),
      v.literal("daily")
    )),
    nextBillingDate: v.optional(v.number()),
    paymentMethodId: v.optional(v.id("paymentMethods")),
    category: v.optional(v.string()),
    website: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);
    const { id, ...updates } = args;
    
    const subscription = await ctx.db.get(id);
    if (!subscription || subscription.userId !== userId) {
      throw new Error("Subscription not found or access denied");
    }
    
    return await ctx.db.patch(id, updates);
  },
});

export const remove = mutation({
  args: { id: v.id("subscriptions") },
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);
    
    const subscription = await ctx.db.get(args.id);
    if (!subscription || subscription.userId !== userId) {
      throw new Error("Subscription not found or access denied");
    }
    
    return await ctx.db.delete(args.id);
  },
});

export const getUpcoming = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);
    const days = args.days || 30;
    const cutoffDate = Date.now() + (days * 24 * 60 * 60 * 1000);
    
    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_user_and_active", (q) => 
        q.eq("userId", userId).eq("isActive", true)
      )
      .filter((q) => q.lte(q.field("nextBillingDate"), cutoffDate))
      .collect();
    
    const subscriptionsWithPayment = await Promise.all(
      subscriptions.map(async (sub) => {
        const paymentMethod = await ctx.db.get(sub.paymentMethodId);
        return {
          ...sub,
          paymentMethod,
        };
      })
    );
    
    return subscriptionsWithPayment.sort((a, b) => a.nextBillingDate - b.nextBillingDate);
  },
});

export const getTotalCost = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getLoggedInUser(ctx);
    
    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_user_and_active", (q) => 
        q.eq("userId", userId).eq("isActive", true)
      )
      .collect();
    
    const totals = subscriptions.reduce((acc, sub) => {
      let monthlyCost = sub.cost;
      
      switch (sub.billingCycle) {
        case "yearly":
          monthlyCost = sub.cost / 12;
          break;
        case "weekly":
          monthlyCost = sub.cost * 4.33;
          break;
        case "daily":
          monthlyCost = sub.cost * 30;
          break;
      }
      
      if (!acc[sub.currency]) {
        acc[sub.currency] = 0;
      }
      acc[sub.currency] += monthlyCost;
      
      return acc;
    }, {} as Record<string, number>);
    
    return totals;
  },
});

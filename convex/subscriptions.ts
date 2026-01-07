import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Shared validators
const billingCycleValidator = v.union(
  v.literal("monthly"),
  v.literal("yearly"),
  v.literal("weekly"),
  v.literal("daily")
);

const paymentMethodTypeValidator = v.union(
  v.literal("credit_card"),
  v.literal("debit_card"),
  v.literal("bank_account"),
  v.literal("paypal"),
  v.literal("other")
);

// Payment method validator (for nested objects)
const paymentMethodValidator = v.union(
  v.object({
    _id: v.id("paymentMethods"),
    _creationTime: v.number(),
    userId: v.id("users"),
    name: v.string(),
    type: paymentMethodTypeValidator,
    lastFourDigits: v.optional(v.string()),
    expiryDate: v.optional(v.string()),
    isDefault: v.boolean(),
  }),
  v.null()
);

// Subscription with payment method validator
const subscriptionWithPaymentValidator = v.object({
  _id: v.id("subscriptions"),
  _creationTime: v.number(),
  userId: v.id("users"),
  name: v.string(),
  description: v.optional(v.string()),
  cost: v.number(),
  currency: v.string(),
  billingCycle: billingCycleValidator,
  nextBillingDate: v.number(),
  paymentMethodId: v.id("paymentMethods"),
  category: v.string(),
  website: v.optional(v.string()),
  isActive: v.boolean(),
  notes: v.optional(v.string()),
  paymentMethod: paymentMethodValidator,
});

async function getLoggedInUser(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("User not authenticated");
  }
  return userId;
}

export const list = query({
  args: { activeOnly: v.optional(v.boolean()) },
  returns: v.array(subscriptionWithPaymentValidator),
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
    billingCycle: billingCycleValidator,
    nextBillingDate: v.number(),
    paymentMethodId: v.id("paymentMethods"),
    category: v.string(),
    website: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  returns: v.id("subscriptions"),
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
    billingCycle: v.optional(billingCycleValidator),
    nextBillingDate: v.optional(v.number()),
    paymentMethodId: v.optional(v.id("paymentMethods")),
    category: v.optional(v.string()),
    website: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);
    const { id, ...updates } = args;
    
    const subscription = await ctx.db.get(id);
    if (!subscription || subscription.userId !== userId) {
      throw new Error("Subscription not found or access denied");
    }
    
    await ctx.db.patch(id, updates);
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("subscriptions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);
    
    const subscription = await ctx.db.get(args.id);
    if (!subscription || subscription.userId !== userId) {
      throw new Error("Subscription not found or access denied");
    }
    
    await ctx.db.delete(args.id);
    return null;
  },
});

export const getUpcoming = query({
  args: { days: v.optional(v.number()) },
  returns: v.array(subscriptionWithPaymentValidator),
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
  returns: v.record(v.string(), v.number()),
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

/**
 * Internal mutation to create a subscription (called from chat action)
 */
export const createInternal = internalMutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    cost: v.number(),
    currency: v.string(),
    billingCycle: billingCycleValidator,
    nextBillingDate: v.number(),
    paymentMethodId: v.id("paymentMethods"),
    category: v.string(),
    website: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  returns: v.id("subscriptions"),
  handler: async (ctx, args) => {
    const { userId, ...subscriptionData } = args;
    
    return await ctx.db.insert("subscriptions", {
      userId,
      ...subscriptionData,
      isActive: true,
    });
  },
});

/**
 * Internal mutation to update a subscription (called from chat action)
 */
export const updateInternal = internalMutation({
  args: {
    id: v.id("subscriptions"),
    userId: v.id("users"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    cost: v.optional(v.number()),
    currency: v.optional(v.string()),
    billingCycle: v.optional(billingCycleValidator),
    nextBillingDate: v.optional(v.number()),
    paymentMethodId: v.optional(v.id("paymentMethods")),
    category: v.optional(v.string()),
    website: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, userId, ...updates } = args;
    
    const subscription = await ctx.db.get(id);
    if (!subscription || subscription.userId !== userId) {
      throw new Error("Subscription not found or access denied");
    }
    
    await ctx.db.patch(id, updates);
    return null;
  },
});

/**
 * Internal query to list subscriptions for a specific user (called from chat action)
 */
export const listInternal = internalQuery({
  args: {
    userId: v.id("users"),
    activeOnly: v.optional(v.boolean()),
  },
  returns: v.array(subscriptionWithPaymentValidator),
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId));
    
    if (args.activeOnly) {
      query = ctx.db
        .query("subscriptions")
        .withIndex("by_user_and_active", (q) => 
          q.eq("userId", args.userId).eq("isActive", true)
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

/**
 * Migration mutation to import guest data when user signs up
 * Maps local payment method IDs to new Convex IDs
 */
export const migrateFromGuest = mutation({
  args: {
    paymentMethods: v.array(
      v.object({
        localId: v.string(),
        name: v.string(),
        type: paymentMethodTypeValidator,
        lastFourDigits: v.optional(v.string()),
        expiryDate: v.optional(v.string()),
        isDefault: v.boolean(),
      })
    ),
    subscriptions: v.array(
      v.object({
        localId: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
        cost: v.number(),
        currency: v.string(),
        billingCycle: billingCycleValidator,
        nextBillingDate: v.number(),
        paymentMethodLocalId: v.string(),
        category: v.string(),
        website: v.optional(v.string()),
        isActive: v.boolean(),
        notes: v.optional(v.string()),
      })
    ),
  },
  returns: v.object({
    migratedPaymentMethods: v.number(),
    migratedSubscriptions: v.number(),
  }),
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);
    
    // Map local payment method IDs to new Convex IDs
    const localIdToConvexId: Record<string, any> = {};
    let skippedSubscriptions = 0;
    
    // First, insert all payment methods and build the ID mapping
    for (const pm of args.paymentMethods) {
      const { localId, ...pmData } = pm;
      const newId = await ctx.db.insert("paymentMethods", {
        userId,
        ...pmData,
      });
      localIdToConvexId[localId] = newId;
    }
    
    // Then, insert all subscriptions with mapped payment method IDs
    for (const sub of args.subscriptions) {
      const { localId, paymentMethodLocalId, ...subData } = sub;
      const paymentMethodId = localIdToConvexId[paymentMethodLocalId];
      
      if (!paymentMethodId) {
        // Skip subscriptions with missing payment methods
        skippedSubscriptions++;
        continue;
      }
      
      await ctx.db.insert("subscriptions", {
        userId,
        ...subData,
        paymentMethodId,
      });
    }
    
    return {
      migratedPaymentMethods: args.paymentMethods.length,
      migratedSubscriptions: args.subscriptions.length - skippedSubscriptions,
    };
  },
});

import { query, mutation, internalQuery } from "./_generated/server";
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
  args: {},
  handler: async (ctx) => {
    const userId = await getLoggedInUser(ctx);
    
    return await ctx.db
      .query("paymentMethods")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    type: v.union(
      v.literal("credit_card"),
      v.literal("debit_card"),
      v.literal("bank_account"),
      v.literal("paypal"),
      v.literal("other")
    ),
    lastFourDigits: v.optional(v.string()),
    expiryDate: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);
    
    // If this is set as default, unset other defaults
    if (args.isDefault) {
      const existingMethods = await ctx.db
        .query("paymentMethods")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      
      for (const method of existingMethods) {
        if (method.isDefault) {
          await ctx.db.patch(method._id, { isDefault: false });
        }
      }
    }
    
    return await ctx.db.insert("paymentMethods", {
      userId,
      ...args,
      isDefault: args.isDefault || false,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("paymentMethods"),
    name: v.optional(v.string()),
    type: v.optional(v.union(
      v.literal("credit_card"),
      v.literal("debit_card"),
      v.literal("bank_account"),
      v.literal("paypal"),
      v.literal("other")
    )),
    lastFourDigits: v.optional(v.string()),
    expiryDate: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);
    const { id, ...updates } = args;
    
    const paymentMethod = await ctx.db.get(id);
    if (!paymentMethod || paymentMethod.userId !== userId) {
      throw new Error("Payment method not found or access denied");
    }
    
    // If this is set as default, unset other defaults
    if (updates.isDefault) {
      const existingMethods = await ctx.db
        .query("paymentMethods")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      
      for (const method of existingMethods) {
        if (method.isDefault && method._id !== id) {
          await ctx.db.patch(method._id, { isDefault: false });
        }
      }
    }
    
    return await ctx.db.patch(id, updates);
  },
});

export const remove = mutation({
  args: { id: v.id("paymentMethods") },
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);
    
    const paymentMethod = await ctx.db.get(args.id);
    if (!paymentMethod || paymentMethod.userId !== userId) {
      throw new Error("Payment method not found or access denied");
    }
    
    // Check if any subscriptions use this payment method
    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("paymentMethodId"), args.id))
      .collect();
    
    if (subscriptions.length > 0) {
      throw new Error("Cannot delete payment method that is being used by subscriptions");
    }
    
    return await ctx.db.delete(args.id);
  },
});

/**
 * Internal query to list payment methods for a specific user (called from chat action)
 */
export const listInternal = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("paymentMethods")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

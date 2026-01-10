import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";

// Shared validator for payment method type
const paymentMethodTypeValidator = v.union(
  v.literal("credit_card"),
  v.literal("debit_card"),
  v.literal("bank_account"),
  v.literal("paypal"),
  v.literal("other"),
);

// Shared validator for payment method document
const paymentMethodValidator = v.object({
  _id: v.id("paymentMethods"),
  _creationTime: v.number(),
  userId: v.id("users"),
  name: v.string(),
  type: paymentMethodTypeValidator,
  lastFourDigits: v.optional(v.string()),
  expiryDate: v.optional(v.string()),
  isDefault: v.boolean(),
});

async function getLoggedInUser(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("User not authenticated");
  }
  return userId;
}

export const list = query({
  args: {},
  returns: v.array(paymentMethodValidator),
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
    type: paymentMethodTypeValidator,
    lastFourDigits: v.optional(v.string()),
    expiryDate: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
  },
  returns: v.id("paymentMethods"),
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
    type: v.optional(paymentMethodTypeValidator),
    lastFourDigits: v.optional(v.string()),
    expiryDate: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
  },
  returns: v.null(),
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

    await ctx.db.patch(id, updates);
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("paymentMethods") },
  returns: v.null(),
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

    await ctx.db.delete(args.id);
    return null;
  },
});

/**
 * Internal query to list payment methods for a specific user (called from chat action)
 */
export const listInternal = internalQuery({
  args: {
    userId: v.id("users"),
  },
  returns: v.array(paymentMethodValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("paymentMethods")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

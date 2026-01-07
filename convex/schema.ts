import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  subscriptions: defineTable({
    userId: v.id("users"),
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
    isActive: v.boolean(),
    notes: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_active", ["userId", "isActive"])
    .index("by_next_billing", ["nextBillingDate"]),

  paymentMethods: defineTable({
    userId: v.id("users"),
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
    isDefault: v.boolean(),
  }).index("by_user", ["userId"]),

  chatMessages: defineTable({
    userId: v.id("users"),
    content: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    subscriptionId: v.optional(v.id("subscriptions")),
    timestamp: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_timestamp", ["userId", "timestamp"]),

  servicePricing: defineTable({
    serviceName: v.string(),
    website: v.string(),
    plans: v.array(v.object({
      name: v.string(),
      price: v.number(),
      currency: v.string(),
      billingCycle: v.string(),
      features: v.array(v.string()),
    })),
    lastUpdated: v.number(),
  })
    .index("by_service", ["serviceName"])
    .index("by_website", ["website"]),

  userAISettings: defineTable({
    userId: v.id("users"),
    provider: v.union(
      v.literal("openai"),
      v.literal("xai"),
      v.literal("mistral"),
      v.literal("ollama")
    ),
    encryptedApiKey: v.string(),
    modelId: v.optional(v.string()),
    ollamaBaseUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});

import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

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
      v.literal("daily"),
    ),
    nextBillingDate: v.number(),
    paymentMethodId: v.id("paymentMethods"),
    category: v.string(),
    website: v.optional(v.string()),
    isActive: v.boolean(),
    notes: v.optional(v.string()),
    // Family plan fields
    maxSlots: v.optional(v.number()), // e.g., 5 for a family plan
  })
    .index("by_user", ["userId"])
    .index("by_user_and_active", ["userId", "isActive"])
    .index("by_next_billing", ["nextBillingDate"]),

  // Subscription sharing - links subscriptions to beneficiaries
  subscriptionShares: defineTable({
    subscriptionId: v.id("subscriptions"),
    // Either a real user or just a name (anonymous)
    type: v.union(v.literal("user"), v.literal("anonymous")),
    userId: v.optional(v.id("users")), // if type === "user"
    name: v.optional(v.string()), // if type === "anonymous" (e.g., "Mom")
    // Beneficiary preference
    isHidden: v.boolean(), // beneficiary can hide from their list
    createdAt: v.number(),
  })
    .index("by_subscription", ["subscriptionId"])
    .index("by_user", ["userId"])
    .index("by_user_and_hidden", ["userId", "isHidden"]),

  // Invite links for sharing subscriptions
  shareInvites: defineTable({
    subscriptionId: v.id("subscriptions"),
    token: v.string(),
    expiresAt: v.number(),
    claimedBy: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_subscription", ["subscriptionId"]),

  paymentMethods: defineTable({
    userId: v.id("users"),
    name: v.string(),
    type: v.union(
      v.literal("credit_card"),
      v.literal("debit_card"),
      v.literal("bank_account"),
      v.literal("paypal"),
      v.literal("other"),
    ),
    lastFourDigits: v.optional(v.string()),
    expiryDate: v.optional(v.string()),
    isDefault: v.boolean(),
  }).index("by_user", ["userId"]),

  servicePricing: defineTable({
    serviceName: v.string(),
    website: v.string(),
    plans: v.array(
      v.object({
        name: v.string(),
        price: v.number(),
        currency: v.string(),
        billingCycle: v.string(),
        features: v.array(v.string()),
      }),
    ),
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
      v.literal("ollama"),
      v.literal("webllm"),
    ),
    encryptedApiKey: v.string(),
    modelId: v.optional(v.string()),
    ollamaBaseUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // MCP API keys for external integrations
  mcpApiKeys: defineTable({
    userId: v.id("users"),
    keyHash: v.string(), // SHA-256 hash of the API key
    name: v.string(), // User-friendly name for the key
    lastUsed: v.optional(v.number()),
    createdAt: v.number(),
    expiresAt: v.optional(v.number()), // Optional expiration
    isActive: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_key_hash", ["keyHash"]),

  // Rate limiting table for tracking request counts
  rateLimits: defineTable({
    key: v.string(), // Unique key combining operation type and identifier
    count: v.number(), // Number of requests in current window
    windowStart: v.number(), // Start time of current window
    lastRequest: v.number(), // Timestamp of last request
  }).index("by_key", ["key"]),

  // Service templates for quick subscription creation
  serviceTemplates: defineTable({
    name: v.string(),
    category: v.union(
      v.literal("streaming"),
      v.literal("music"),
      v.literal("gaming"),
      v.literal("productivity"),
      v.literal("news"),
      v.literal("fitness"),
      v.literal("cloud"),
      v.literal("other"),
    ),
    website: v.optional(v.string()),
    icon: v.optional(v.string()),
    defaultPrice: v.optional(v.number()),
    defaultCurrency: v.optional(v.string()),
    defaultBillingCycle: v.optional(v.string()),
  })
    .index("by_category", ["category"])
    .searchIndex("search_name", { searchField: "name" }),

  // User requests for new service templates
  serviceRequests: defineTable({
    serviceName: v.string(),
    website: v.optional(v.string()),
    requestedBy: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
    createdAt: v.number(),
  }).index("by_status", ["status"]),

  // User roles for admin access control
  userRoles: defineTable({
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("user")),
    grantedAt: v.number(),
    grantedBy: v.optional(v.id("users")),
  })
    .index("by_user", ["userId"])
    .index("by_role", ["role"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});

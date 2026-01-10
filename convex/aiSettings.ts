import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";
import { decrypt, encrypt } from "./lib/encryption";

// Shared validator for AI provider
const aiProviderValidator = v.union(
  v.literal("openai"),
  v.literal("xai"),
  v.literal("mistral"),
  v.literal("ollama"),
  v.literal("webllm"),
);

async function getLoggedInUser(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("User not authenticated");
  }
  return userId;
}

/**
 * Get current user's AI settings (without decrypted API key)
 */
export const get = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("userAISettings"),
      userId: v.id("users"),
      provider: aiProviderValidator,
      modelId: v.optional(v.string()),
      ollamaBaseUrl: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
      hasApiKey: v.boolean(),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const userId = await getLoggedInUser(ctx);

    const settings = await ctx.db
      .query("userAISettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!settings) {
      return null;
    }

    // Return settings without the encrypted key for security
    return {
      _id: settings._id,
      userId: settings.userId,
      provider: settings.provider,
      modelId: settings.modelId,
      ollamaBaseUrl: settings.ollamaBaseUrl,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
      hasApiKey: true, // Indicate that a key exists
    };
  },
});

/**
 * Save or update user's AI settings
 */
export const save = mutation({
  args: {
    provider: aiProviderValidator,
    apiKey: v.string(),
    modelId: v.optional(v.string()),
    ollamaBaseUrl: v.optional(v.string()),
  },
  returns: v.id("userAISettings"),
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);

    // Encrypt the API key before storing
    const encryptedApiKey = await encrypt(args.apiKey);

    // Check if settings already exist
    const existing = await ctx.db
      .query("userAISettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const now = Date.now();

    if (existing) {
      // Update existing settings
      await ctx.db.patch(existing._id, {
        provider: args.provider,
        encryptedApiKey,
        modelId: args.modelId,
        ollamaBaseUrl: args.ollamaBaseUrl,
        updatedAt: now,
      });
      return existing._id;
    } else {
      // Create new settings
      return await ctx.db.insert("userAISettings", {
        userId,
        provider: args.provider,
        encryptedApiKey,
        modelId: args.modelId,
        ollamaBaseUrl: args.ollamaBaseUrl,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

/**
 * Delete user's AI settings
 */
export const remove = mutation({
  args: {},
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx) => {
    const userId = await getLoggedInUser(ctx);

    const settings = await ctx.db
      .query("userAISettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (settings) {
      await ctx.db.delete(settings._id);
    }

    return { success: true };
  },
});

/**
 * Get decrypted AI settings for internal use (chat action only)
 * This should never be exposed to the client
 */
export const getDecrypted = internalQuery({
  args: {
    userId: v.id("users"),
  },
  returns: v.union(
    v.object({
      _id: v.id("userAISettings"),
      _creationTime: v.number(),
      userId: v.id("users"),
      provider: aiProviderValidator,
      encryptedApiKey: v.string(),
      modelId: v.optional(v.string()),
      ollamaBaseUrl: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
      apiKey: v.string(), // Decrypted key
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("userAISettings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!settings) {
      return null;
    }

    // Decrypt the API key for use in AI calls
    const apiKey = await decrypt(settings.encryptedApiKey);

    return {
      ...settings,
      apiKey, // Decrypted key
    };
  },
});

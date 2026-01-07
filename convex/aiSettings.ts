import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { encrypt, decrypt } from "./lib/encryption";

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
    provider: v.union(
      v.literal("openai"),
      v.literal("xai"),
      v.literal("mistral"),
      v.literal("ollama")
    ),
    apiKey: v.string(),
    modelId: v.optional(v.string()),
    ollamaBaseUrl: v.optional(v.string()),
  },
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
      return await ctx.db.patch(existing._id, {
        provider: args.provider,
        encryptedApiKey,
        modelId: args.modelId,
        ollamaBaseUrl: args.ollamaBaseUrl,
        updatedAt: now,
      });
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


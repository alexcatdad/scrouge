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

/**
 * Generate a secure random API key
 */
function generateApiKey(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return "mcp_" + Array.from(array, b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Hash an API key using SHA-256
 */
async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * List all MCP API keys for the current user
 * Returns key metadata (not the actual keys)
 */
export const list = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("mcpApiKeys"),
    name: v.string(),
    lastUsed: v.union(v.number(), v.null()),
    createdAt: v.number(),
    expiresAt: v.union(v.number(), v.null()),
    isActive: v.boolean(),
  })),
  handler: async (ctx) => {
    const userId = await getLoggedInUser(ctx);
    
    const keys = await ctx.db
      .query("mcpApiKeys")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    
    return keys.map(key => ({
      _id: key._id,
      name: key.name,
      lastUsed: key.lastUsed ?? null,
      createdAt: key.createdAt,
      expiresAt: key.expiresAt ?? null,
      isActive: key.isActive,
    }));
  },
});

/**
 * Create a new MCP API key
 * Returns the full API key (only shown once)
 */
export const create = mutation({
  args: {
    name: v.string(),
    expiresInDays: v.optional(v.number()),
  },
  returns: v.object({
    keyId: v.id("mcpApiKeys"),
    apiKey: v.string(),
    name: v.string(),
    expiresAt: v.union(v.number(), v.null()),
  }),
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);
    
    // Generate new API key
    const apiKey = generateApiKey();
    const keyHash = await hashApiKey(apiKey);
    
    // Calculate expiration if specified
    const expiresAt = args.expiresInDays
      ? Date.now() + args.expiresInDays * 24 * 60 * 60 * 1000
      : undefined;
    
    // Store the key hash (never store the actual key)
    const keyId = await ctx.db.insert("mcpApiKeys", {
      userId,
      keyHash,
      name: args.name,
      createdAt: Date.now(),
      expiresAt,
      isActive: true,
    });
    
    // Return the full API key (only shown once)
    return {
      keyId,
      apiKey,
      name: args.name,
      expiresAt: expiresAt ?? null,
    };
  },
});

/**
 * Revoke an MCP API key
 */
export const revoke = mutation({
  args: {
    keyId: v.id("mcpApiKeys"),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);
    
    const key = await ctx.db.get(args.keyId);
    if (!key || key.userId !== userId) {
      throw new Error("API key not found or access denied");
    }
    
    await ctx.db.patch(args.keyId, { isActive: false });
    
    return { success: true };
  },
});

/**
 * Delete an MCP API key permanently
 */
export const remove = mutation({
  args: {
    keyId: v.id("mcpApiKeys"),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);
    
    const key = await ctx.db.get(args.keyId);
    if (!key || key.userId !== userId) {
      throw new Error("API key not found or access denied");
    }
    
    await ctx.db.delete(args.keyId);
    
    return { success: true };
  },
});

/**
 * Update last used timestamp for an API key
 * Called internally when a key is used
 */
export const updateLastUsed = mutation({
  args: {
    keyId: v.id("mcpApiKeys"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.keyId, { lastUsed: Date.now() });
    return null;
  },
});


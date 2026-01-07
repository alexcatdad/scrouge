import { httpRouter } from "convex/server";
import { httpAction, internalQuery, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { checkRateLimit, RATE_LIMITS } from "./lib/rateLimit";

/**
 * Internal query to validate MCP API key
 * Returns the userId if the key is valid, null otherwise
 */
export const validateApiKey = internalQuery({
  args: { apiKey: v.string() },
  returns: v.union(v.object({ userId: v.id("users") }), v.null()),
  handler: async (ctx, args) => {
    // Hash the provided API key to compare against stored hash
    const encoder = new TextEncoder();
    const data = encoder.encode(args.apiKey);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const keyHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    
    // Look up the API key by hash
    const apiKeyRecord = await ctx.db
      .query("mcpApiKeys")
      .withIndex("by_key_hash", (q) => q.eq("keyHash", keyHash))
      .first();
    
    if (!apiKeyRecord) {
      return null;
    }
    
    // Check if key is active
    if (!apiKeyRecord.isActive) {
      return null;
    }
    
    // Check if key has expired
    if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < Date.now()) {
      return null;
    }
    
    return { userId: apiKeyRecord.userId };
  },
});

/**
 * Internal mutation to check rate limit for MCP API
 */
export const checkMcpRateLimit = internalMutation({
  args: { userId: v.id("users") },
  returns: v.object({
    allowed: v.boolean(),
    remaining: v.number(),
    resetAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const key = `mcpApi:${args.userId}`;
    return await checkRateLimit(ctx, key, RATE_LIMITS.mcpApi);
  },
});

const http = httpRouter();

// Standard JSON response headers
const jsonHeaders = { "Content-Type": "application/json" };

/**
 * Validate MCP API key from Authorization header
 * Returns the userId associated with the API key, or null if invalid
 */
async function validateMcpApiKey(
  ctx: any,
  request: Request
): Promise<Id<"users"> | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  
  const apiKey = authHeader.slice(7); // Remove "Bearer " prefix
  if (!apiKey) {
    return null;
  }
  
  // Validate API key and get associated user
  const result = await ctx.runQuery(internal.router.validateApiKey, { apiKey });
  return result?.userId ?? null;
}

/**
 * Create error response with consistent format
 */
function errorResponse(message: string, status: number): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: jsonHeaders }
  );
}

/**
 * Create success response with consistent format
 */
function successResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(
    JSON.stringify(data),
    { status, headers: jsonHeaders }
  );
}

// MCP endpoint for AI agents to add subscriptions
// Requires Bearer token authentication
http.route({
  path: "/mcp/subscriptions",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Authenticate request
    const userId = await validateMcpApiKey(ctx, request);
    if (!userId) {
      return errorResponse("Unauthorized: Invalid or missing API key", 401);
    }
    
    // Check rate limit
    const rateLimit = await ctx.runMutation(internal.router.checkMcpRateLimit, { userId });
    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded", retryAfter }),
        { 
          status: 429, 
          headers: { 
            ...jsonHeaders,
            "Retry-After": String(retryAfter),
            "X-RateLimit-Remaining": String(rateLimit.remaining),
            "X-RateLimit-Reset": String(rateLimit.resetAt),
          } 
        }
      );
    }
    
    try {
      const body = await request.json();
      const { subscription } = body;
      
      if (!subscription) {
        return errorResponse("Missing subscription data", 400);
      }
      
      // Validate required subscription fields
      const requiredFields = ["name", "cost", "currency", "billingCycle", "paymentMethodId", "category"];
      for (const field of requiredFields) {
        if (!subscription[field]) {
          return errorResponse(`Missing required field: ${field}`, 400);
        }
      }
      
      // Validate billing cycle
      const validCycles = ["monthly", "yearly", "weekly", "daily"];
      if (!validCycles.includes(subscription.billingCycle)) {
        return errorResponse(`Invalid billingCycle. Must be one of: ${validCycles.join(", ")}`, 400);
      }
      
      // Calculate next billing date if not provided
      if (!subscription.nextBillingDate) {
        const now = new Date();
        switch (subscription.billingCycle) {
          case "monthly":
            now.setMonth(now.getMonth() + 1);
            break;
          case "yearly":
            now.setFullYear(now.getFullYear() + 1);
            break;
          case "weekly":
            now.setDate(now.getDate() + 7);
            break;
          case "daily":
            now.setDate(now.getDate() + 1);
            break;
        }
        subscription.nextBillingDate = now.getTime();
      }
      
      // Use internal mutation with authenticated userId
      const subscriptionId = await ctx.runMutation(internal.subscriptions.createInternal, {
        userId,
        name: subscription.name,
        cost: subscription.cost,
        currency: subscription.currency,
        billingCycle: subscription.billingCycle,
        nextBillingDate: subscription.nextBillingDate,
        paymentMethodId: subscription.paymentMethodId,
        category: subscription.category,
        website: subscription.website,
        description: subscription.description,
        notes: subscription.notes,
      });
      
      return successResponse({ 
        success: true, 
        subscriptionId,
        message: "Subscription added successfully" 
      });
      
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error";
      return errorResponse(message, 500);
    }
  }),
});

// MCP endpoint to get user subscriptions
// Requires Bearer token authentication
http.route({
  path: "/mcp/subscriptions",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    // Authenticate request
    const userId = await validateMcpApiKey(ctx, request);
    if (!userId) {
      return errorResponse("Unauthorized: Invalid or missing API key", 401);
    }
    
    // Check rate limit
    const rateLimit = await ctx.runMutation(internal.router.checkMcpRateLimit, { userId });
    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded", retryAfter }),
        { 
          status: 429, 
          headers: { 
            ...jsonHeaders,
            "Retry-After": String(retryAfter),
            "X-RateLimit-Remaining": String(rateLimit.remaining),
            "X-RateLimit-Reset": String(rateLimit.resetAt),
          } 
        }
      );
    }
    
    try {
      // Use internal query with authenticated userId
      const subscriptions = await ctx.runQuery(internal.subscriptions.listInternal, {
        userId,
      });
      
      return successResponse({ subscriptions });
      
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error";
      return errorResponse(message, 500);
    }
  }),
});

// MCP endpoint for payment methods
// Requires Bearer token authentication
http.route({
  path: "/mcp/payment-methods",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    // Authenticate request
    const userId = await validateMcpApiKey(ctx, request);
    if (!userId) {
      return errorResponse("Unauthorized: Invalid or missing API key", 401);
    }
    
    // Check rate limit
    const rateLimit = await ctx.runMutation(internal.router.checkMcpRateLimit, { userId });
    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded", retryAfter }),
        { 
          status: 429, 
          headers: { 
            ...jsonHeaders,
            "Retry-After": String(retryAfter),
            "X-RateLimit-Remaining": String(rateLimit.remaining),
            "X-RateLimit-Reset": String(rateLimit.resetAt),
          } 
        }
      );
    }
    
    try {
      // Use internal query with authenticated userId
      const paymentMethods = await ctx.runQuery(internal.paymentMethods.listInternal, {
        userId,
      });
      
      return successResponse({ paymentMethods });
      
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error";
      return errorResponse(message, 500);
    }
  }),
});

export default http;

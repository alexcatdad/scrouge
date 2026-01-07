import { v } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  /** Maximum number of requests allowed in the time window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
}

/**
 * Default rate limit configurations for different operations
 */
export const RATE_LIMITS = {
  // AI chat: 20 requests per minute
  aiChat: { maxRequests: 20, windowMs: 60 * 1000 },
  // Authentication: 10 attempts per 15 minutes
  auth: { maxRequests: 10, windowMs: 15 * 60 * 1000 },
  // MCP API: 100 requests per minute
  mcpApi: { maxRequests: 100, windowMs: 60 * 1000 },
  // General mutations: 60 per minute
  mutations: { maxRequests: 60, windowMs: 60 * 1000 },
} as const;

/**
 * Rate limit key generator
 */
export function getRateLimitKey(
  operation: keyof typeof RATE_LIMITS,
  identifier: string
): string {
  return `${operation}:${identifier}`;
}

/**
 * Check if a request should be rate limited
 * Uses a simple sliding window counter approach
 * 
 * This is a lightweight implementation that doesn't require a separate table.
 * For production, consider using a dedicated rate limiting service.
 */
export async function checkRateLimit(
  ctx: MutationCtx,
  key: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const windowStart = now - config.windowMs;
  
  // Get existing rate limit record
  const existing = await ctx.db
    .query("rateLimits")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();
  
  if (!existing) {
    // First request - create new record
    await ctx.db.insert("rateLimits", {
      key,
      count: 1,
      windowStart: now,
      lastRequest: now,
    });
    
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
    };
  }
  
  // Check if we're in a new window
  if (existing.windowStart < windowStart) {
    // Reset the window
    await ctx.db.patch(existing._id, {
      count: 1,
      windowStart: now,
      lastRequest: now,
    });
    
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
    };
  }
  
  // Within the same window - check count
  if (existing.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.windowStart + config.windowMs,
    };
  }
  
  // Increment counter
  await ctx.db.patch(existing._id, {
    count: existing.count + 1,
    lastRequest: now,
  });
  
  return {
    allowed: true,
    remaining: config.maxRequests - existing.count - 1,
    resetAt: existing.windowStart + config.windowMs,
  };
}

/**
 * Rate limit error class
 */
export class RateLimitError extends Error {
  public readonly resetAt: number;
  public readonly remaining: number;
  
  constructor(resetAt: number, remaining: number) {
    const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
    super(`Rate limit exceeded. Try again in ${retryAfter} seconds.`);
    this.name = "RateLimitError";
    this.resetAt = resetAt;
    this.remaining = remaining;
  }
}

/**
 * Helper to enforce rate limit and throw if exceeded
 */
export async function enforceRateLimit(
  ctx: MutationCtx,
  operation: keyof typeof RATE_LIMITS,
  identifier: string
): Promise<void> {
  const key = getRateLimitKey(operation, identifier);
  const config = RATE_LIMITS[operation];
  const result = await checkRateLimit(ctx, key, config);
  
  if (!result.allowed) {
    throw new RateLimitError(result.resetAt, result.remaining);
  }
}

/**
 * Validator for rate limit table
 */
export const rateLimitValidator = v.object({
  key: v.string(),
  count: v.number(),
  windowStart: v.number(),
  lastRequest: v.number(),
});


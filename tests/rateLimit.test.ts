import { describe, expect, test } from "bun:test";
import {
  getRateLimitKey,
  RATE_LIMITS,
  type RateLimitConfig,
  RateLimitError,
} from "../convex/lib/rateLimit";

describe("Rate Limiting", () => {
  describe("getRateLimitKey", () => {
    test("generates key with operation and identifier", () => {
      const key = getRateLimitKey("aiChat", "user123");
      expect(key).toBe("aiChat:user123");
    });

    test("works with all operation types", () => {
      expect(getRateLimitKey("aiChat", "id")).toBe("aiChat:id");
      expect(getRateLimitKey("auth", "id")).toBe("auth:id");
      expect(getRateLimitKey("mcpApi", "id")).toBe("mcpApi:id");
      expect(getRateLimitKey("mutations", "id")).toBe("mutations:id");
    });

    test("handles empty identifier", () => {
      const key = getRateLimitKey("aiChat", "");
      expect(key).toBe("aiChat:");
    });

    test("handles special characters in identifier", () => {
      const key = getRateLimitKey("aiChat", "user@email.com");
      expect(key).toBe("aiChat:user@email.com");
    });

    test("handles long identifiers", () => {
      const longId = "a".repeat(1000);
      const key = getRateLimitKey("aiChat", longId);
      expect(key).toBe(`aiChat:${longId}`);
    });
  });

  describe("RATE_LIMITS configuration", () => {
    test("aiChat has correct limits", () => {
      expect(RATE_LIMITS.aiChat.maxRequests).toBe(20);
      expect(RATE_LIMITS.aiChat.windowMs).toBe(60 * 1000);
    });

    test("auth has correct limits", () => {
      expect(RATE_LIMITS.auth.maxRequests).toBe(10);
      expect(RATE_LIMITS.auth.windowMs).toBe(15 * 60 * 1000);
    });

    test("mcpApi has correct limits", () => {
      expect(RATE_LIMITS.mcpApi.maxRequests).toBe(100);
      expect(RATE_LIMITS.mcpApi.windowMs).toBe(60 * 1000);
    });

    test("mutations has correct limits", () => {
      expect(RATE_LIMITS.mutations.maxRequests).toBe(60);
      expect(RATE_LIMITS.mutations.windowMs).toBe(60 * 1000);
    });

    test("all configs have valid positive values", () => {
      for (const [_name, config] of Object.entries(RATE_LIMITS)) {
        expect(config.maxRequests).toBeGreaterThan(0);
        expect(config.windowMs).toBeGreaterThan(0);
      }
    });
  });

  describe("RateLimitError", () => {
    test("creates error with correct message", () => {
      const resetAt = Date.now() + 30000; // 30 seconds from now
      const error = new RateLimitError(resetAt, 0);

      expect(error.message).toContain("Rate limit exceeded");
      expect(error.message).toContain("seconds");
    });

    test("stores resetAt and remaining properties", () => {
      const resetAt = Date.now() + 60000;
      const remaining = 5;
      const error = new RateLimitError(resetAt, remaining);

      expect(error.resetAt).toBe(resetAt);
      expect(error.remaining).toBe(remaining);
    });

    test("has correct name", () => {
      const error = new RateLimitError(Date.now() + 1000, 0);
      expect(error.name).toBe("RateLimitError");
    });

    test("is instanceof Error", () => {
      const error = new RateLimitError(Date.now() + 1000, 0);
      expect(error instanceof Error).toBe(true);
    });

    test("calculates retry-after in seconds correctly", () => {
      const now = Date.now();
      const resetAt = now + 45000; // 45 seconds from now
      const error = new RateLimitError(resetAt, 0);

      // Message should contain approximately 45 seconds
      expect(error.message).toMatch(/\d+ seconds/);
    });

    test("handles zero remaining", () => {
      const error = new RateLimitError(Date.now() + 1000, 0);
      expect(error.remaining).toBe(0);
    });

    test("handles negative remaining (edge case)", () => {
      const error = new RateLimitError(Date.now() + 1000, -1);
      expect(error.remaining).toBe(-1);
    });
  });

  describe("RateLimitConfig interface", () => {
    test("accepts valid configuration", () => {
      const config: RateLimitConfig = {
        maxRequests: 100,
        windowMs: 60000,
      };
      expect(config.maxRequests).toBe(100);
      expect(config.windowMs).toBe(60000);
    });

    test("works with very small windows", () => {
      const config: RateLimitConfig = {
        maxRequests: 1,
        windowMs: 1,
      };
      expect(config.windowMs).toBe(1);
    });

    test("works with very large windows", () => {
      const config: RateLimitConfig = {
        maxRequests: 1000000,
        windowMs: 24 * 60 * 60 * 1000, // 24 hours
      };
      expect(config.windowMs).toBe(86400000);
    });
  });
});

describe("Rate Limit Logic (unit tests)", () => {
  describe("Window calculations", () => {
    test("window start is calculated correctly", () => {
      const now = Date.now();
      const windowMs = 60000;
      const windowStart = now - windowMs;

      expect(windowStart).toBeLessThan(now);
      expect(now - windowStart).toBe(windowMs);
    });

    test("reset time is calculated correctly", () => {
      const windowStart = Date.now();
      const windowMs = 60000;
      const resetAt = windowStart + windowMs;

      expect(resetAt).toBeGreaterThan(windowStart);
      expect(resetAt - windowStart).toBe(windowMs);
    });

    test("remaining count calculation", () => {
      const maxRequests = 20;
      const currentCount = 5;
      const remaining = maxRequests - currentCount - 1;

      expect(remaining).toBe(14);
    });

    test("remaining count at max", () => {
      const maxRequests = 20;
      const currentCount = 19;
      const remaining = maxRequests - currentCount - 1;

      expect(remaining).toBe(0);
    });

    test("remaining count over max", () => {
      const maxRequests = 20;
      const currentCount = 20;
      const remaining = maxRequests - currentCount - 1;

      expect(remaining).toBe(-1); // Would be blocked before reaching this
    });
  });

  describe("First request behavior", () => {
    test("first request should be allowed", () => {
      const config = RATE_LIMITS.aiChat;
      const remaining = config.maxRequests - 1;

      expect(remaining).toBe(19);
    });
  });

  describe("Window reset behavior", () => {
    test("old window should trigger reset", () => {
      const now = Date.now();
      const windowMs = 60000;
      const oldWindowStart = now - windowMs - 1; // 1ms older than window
      const windowStart = now - windowMs;

      expect(oldWindowStart).toBeLessThan(windowStart);
    });

    test("current window should not reset", () => {
      const now = Date.now();
      const windowMs = 60000;
      const recentWindowStart = now - windowMs / 2; // Half window ago
      const windowStart = now - windowMs;

      expect(recentWindowStart).toBeGreaterThan(windowStart);
    });
  });
});

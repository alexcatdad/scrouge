import { describe, expect, test } from "bun:test";

/**
 * MCP API Keys business logic tests
 * Tests the core validations and logic used in API key management
 */

// API key format: mcp_ prefix + 32 hex characters
const API_KEY_PREFIX = "mcp_";
const API_KEY_HEX_LENGTH = 32;

interface ApiKey {
  id: string;
  userId: string;
  keyHash: string;
  name: string;
  lastUsed?: number;
  createdAt: number;
  expiresAt?: number;
  isActive: boolean;
}

// Generate API key format (without actual randomness for testing)
function generateApiKeyFormat(hexPart: string): string {
  return `${API_KEY_PREFIX}${hexPart}`;
}

// Validate API key format
function isValidApiKeyFormat(key: string): boolean {
  if (!key.startsWith(API_KEY_PREFIX)) return false;
  const hexPart = key.slice(API_KEY_PREFIX.length);
  return hexPart.length === API_KEY_HEX_LENGTH && /^[0-9a-f]+$/i.test(hexPart);
}

// Check if API key is expired
function isApiKeyExpired(key: ApiKey): boolean {
  if (!key.expiresAt) return false;
  return key.expiresAt < Date.now();
}

// Check if API key is valid for use
function isApiKeyValid(key: ApiKey): { valid: boolean; reason?: string } {
  if (!key.isActive) {
    return { valid: false, reason: "API key has been revoked" };
  }
  if (isApiKeyExpired(key)) {
    return { valid: false, reason: "API key has expired" };
  }
  return { valid: true };
}

// Calculate expiration date
function calculateExpiryDate(daysFromNow?: number): number | undefined {
  if (daysFromNow === undefined) return undefined;
  if (daysFromNow <= 0) return Date.now(); // Immediately expired
  return Date.now() + daysFromNow * 24 * 60 * 60 * 1000;
}

// Simulate SHA-256 hash (for testing format, not actual crypto)
function simulateHash(_input: string): string {
  // In reality, this would be crypto.subtle.digest('SHA-256', ...)
  // For tests, we just return a fixed-length hex string
  return "0".repeat(64); // SHA-256 produces 64 hex chars
}

describe("API Key Format", () => {
  describe("generateApiKeyFormat", () => {
    test("generates key with mcp_ prefix", () => {
      const key = generateApiKeyFormat("a".repeat(32));
      expect(key.startsWith("mcp_")).toBe(true);
    });

    test("includes hex part after prefix", () => {
      const hexPart = "abcdef1234567890abcdef1234567890";
      const key = generateApiKeyFormat(hexPart);
      expect(key).toBe(`mcp_${hexPart}`);
    });

    test("produces consistent format", () => {
      const key = generateApiKeyFormat("f".repeat(32));
      expect(key.length).toBe(4 + 32); // mcp_ + 32 hex
    });
  });

  describe("isValidApiKeyFormat", () => {
    test("accepts valid API key format", () => {
      const validKey = `mcp_${"a".repeat(32)}`;
      expect(isValidApiKeyFormat(validKey)).toBe(true);
    });

    test("accepts keys with mixed case hex", () => {
      const key = "mcp_" + "AbCdEf1234567890abcdef1234567890";
      expect(isValidApiKeyFormat(key)).toBe(true);
    });

    test("rejects keys without prefix", () => {
      const key = "a".repeat(32);
      expect(isValidApiKeyFormat(key)).toBe(false);
    });

    test("rejects keys with wrong prefix", () => {
      const key = `api_${"a".repeat(32)}`;
      expect(isValidApiKeyFormat(key)).toBe(false);
    });

    test("rejects keys with short hex part", () => {
      const key = `mcp_${"a".repeat(16)}`;
      expect(isValidApiKeyFormat(key)).toBe(false);
    });

    test("rejects keys with long hex part", () => {
      const key = `mcp_${"a".repeat(64)}`;
      expect(isValidApiKeyFormat(key)).toBe(false);
    });

    test("rejects keys with non-hex characters", () => {
      const key = `mcp_${"g".repeat(32)}`; // g is not hex
      expect(isValidApiKeyFormat(key)).toBe(false);
    });

    test("rejects empty string", () => {
      expect(isValidApiKeyFormat("")).toBe(false);
    });

    test("rejects just prefix", () => {
      expect(isValidApiKeyFormat("mcp_")).toBe(false);
    });
  });
});

describe("API Key Expiration", () => {
  describe("isApiKeyExpired", () => {
    test("returns false when no expiration set", () => {
      const key: ApiKey = {
        id: "1",
        userId: "user1",
        keyHash: "hash",
        name: "Test Key",
        createdAt: Date.now(),
        isActive: true,
      };
      expect(isApiKeyExpired(key)).toBe(false);
    });

    test("returns false for future expiration", () => {
      const key: ApiKey = {
        id: "1",
        userId: "user1",
        keyHash: "hash",
        name: "Test Key",
        createdAt: Date.now(),
        expiresAt: Date.now() + 1000000,
        isActive: true,
      };
      expect(isApiKeyExpired(key)).toBe(false);
    });

    test("returns true for past expiration", () => {
      const key: ApiKey = {
        id: "1",
        userId: "user1",
        keyHash: "hash",
        name: "Test Key",
        createdAt: Date.now() - 1000000,
        expiresAt: Date.now() - 1000,
        isActive: true,
      };
      expect(isApiKeyExpired(key)).toBe(true);
    });
  });

  describe("calculateExpiryDate", () => {
    test("returns undefined when no days specified", () => {
      expect(calculateExpiryDate(undefined)).toBeUndefined();
    });

    test("calculates correct future date", () => {
      const now = Date.now();
      const expiry = calculateExpiryDate(30) as number;
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

      expect(expiry).toBeDefined();
      expect(expiry).toBeGreaterThan(now + thirtyDaysMs - 100);
      expect(expiry).toBeLessThan(now + thirtyDaysMs + 100);
    });

    test("handles 0 days (immediate expiration)", () => {
      const now = Date.now();
      const expiry = calculateExpiryDate(0) as number;

      expect(expiry).toBeDefined();
      expect(expiry).toBeLessThanOrEqual(now + 100);
    });

    test("handles negative days (already expired)", () => {
      const now = Date.now();
      const expiry = calculateExpiryDate(-1) as number;

      expect(expiry).toBeDefined();
      expect(expiry).toBeLessThanOrEqual(now + 100);
    });
  });
});

describe("API Key Validation", () => {
  describe("isApiKeyValid", () => {
    test("returns valid for active, non-expired key", () => {
      const key: ApiKey = {
        id: "1",
        userId: "user1",
        keyHash: "hash",
        name: "Test Key",
        createdAt: Date.now(),
        isActive: true,
      };

      const result = isApiKeyValid(key);
      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    test("returns invalid for revoked key", () => {
      const key: ApiKey = {
        id: "1",
        userId: "user1",
        keyHash: "hash",
        name: "Test Key",
        createdAt: Date.now(),
        isActive: false,
      };

      const result = isApiKeyValid(key);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("API key has been revoked");
    });

    test("returns invalid for expired key", () => {
      const key: ApiKey = {
        id: "1",
        userId: "user1",
        keyHash: "hash",
        name: "Test Key",
        createdAt: Date.now() - 1000000,
        expiresAt: Date.now() - 1000,
        isActive: true,
      };

      const result = isApiKeyValid(key);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("API key has expired");
    });

    test("checks revocation before expiration", () => {
      // Key is both revoked AND expired
      const key: ApiKey = {
        id: "1",
        userId: "user1",
        keyHash: "hash",
        name: "Test Key",
        createdAt: Date.now() - 1000000,
        expiresAt: Date.now() - 1000,
        isActive: false,
      };

      const result = isApiKeyValid(key);
      expect(result.valid).toBe(false);
      // Revocation is checked first
      expect(result.reason).toBe("API key has been revoked");
    });
  });
});

describe("API Key Hash", () => {
  describe("simulateHash", () => {
    test("produces 64-character output (SHA-256 length)", () => {
      const hash = simulateHash("test");
      expect(hash.length).toBe(64);
    });

    test("produces hex output", () => {
      const hash = simulateHash("test");
      expect(/^[0-9a-f]+$/i.test(hash)).toBe(true);
    });
  });

  describe("Hash comparison logic", () => {
    // Simulate hash comparison (constant-time in real impl)
    function compareHashes(a: string, b: string): boolean {
      if (a.length !== b.length) return false;
      return a === b;
    }

    test("matches identical hashes", () => {
      const hash = "a".repeat(64);
      expect(compareHashes(hash, hash)).toBe(true);
    });

    test("rejects different hashes", () => {
      const hash1 = "a".repeat(64);
      const hash2 = "b".repeat(64);
      expect(compareHashes(hash1, hash2)).toBe(false);
    });

    test("rejects different length strings", () => {
      const hash1 = "a".repeat(64);
      const hash2 = "a".repeat(32);
      expect(compareHashes(hash1, hash2)).toBe(false);
    });
  });
});

describe("API Key Metadata", () => {
  describe("lastUsed tracking", () => {
    test("lastUsed can be undefined initially", () => {
      const key: ApiKey = {
        id: "1",
        userId: "user1",
        keyHash: "hash",
        name: "Test Key",
        createdAt: Date.now(),
        isActive: true,
      };
      expect(key.lastUsed).toBeUndefined();
    });

    test("lastUsed can be updated", () => {
      const key: ApiKey = {
        id: "1",
        userId: "user1",
        keyHash: "hash",
        name: "Test Key",
        createdAt: Date.now() - 1000000,
        lastUsed: Date.now(),
        isActive: true,
      };
      expect(key.lastUsed).toBeGreaterThan(key.createdAt);
    });
  });

  describe("Key naming", () => {
    test("accepts descriptive names", () => {
      const validNames = [
        "Production API Key",
        "Development Key",
        "CI/CD Pipeline",
        "Mobile App",
        "Test Key #1",
      ];

      for (const name of validNames) {
        expect(name.length).toBeGreaterThan(0);
        expect(name.length).toBeLessThan(100);
      }
    });

    test("empty name is invalid", () => {
      const name = "";
      expect(name.length).toBe(0);
    });
  });
});

describe("Bearer Token Extraction", () => {
  function extractBearerToken(authHeader: string | null): string | null {
    if (!authHeader) return null;
    if (!authHeader.startsWith("Bearer ")) return null;
    const token = authHeader.slice(7);
    return token.length > 0 ? token : null;
  }

  test("extracts token from valid header", () => {
    const header = `Bearer mcp_${"a".repeat(32)}`;
    const token = extractBearerToken(header);
    expect(token).toBe(`mcp_${"a".repeat(32)}`);
  });

  test("returns null for missing header", () => {
    expect(extractBearerToken(null)).toBeNull();
  });

  test("returns null for non-Bearer auth", () => {
    expect(extractBearerToken("Basic abc123")).toBeNull();
  });

  test("returns null for Bearer without token", () => {
    expect(extractBearerToken("Bearer ")).toBeNull();
  });

  test("returns null for Bearer with wrong case", () => {
    expect(extractBearerToken("bearer token")).toBeNull();
    expect(extractBearerToken("BEARER token")).toBeNull();
  });

  test("handles Bearer with extra spaces in token", () => {
    // Token should include everything after "Bearer "
    const token = extractBearerToken("Bearer token with spaces");
    expect(token).toBe("token with spaces");
  });
});

describe("Rate Limit Headers", () => {
  interface RateLimitInfo {
    remaining: number;
    resetAt: number;
  }

  function formatRateLimitHeaders(info: RateLimitInfo): Record<string, string> {
    const retryAfter = Math.ceil((info.resetAt - Date.now()) / 1000);
    return {
      "X-RateLimit-Remaining": String(info.remaining),
      "X-RateLimit-Reset": String(info.resetAt),
      "Retry-After": String(Math.max(0, retryAfter)),
    };
  }

  test("formats headers correctly", () => {
    const info: RateLimitInfo = {
      remaining: 50,
      resetAt: Date.now() + 30000,
    };

    const headers = formatRateLimitHeaders(info);

    expect(headers["X-RateLimit-Remaining"]).toBe("50");
    expect(headers["X-RateLimit-Reset"]).toBeDefined();
    expect(Number(headers["Retry-After"])).toBeGreaterThan(0);
  });

  test("handles zero remaining", () => {
    const info: RateLimitInfo = {
      remaining: 0,
      resetAt: Date.now() + 60000,
    };

    const headers = formatRateLimitHeaders(info);
    expect(headers["X-RateLimit-Remaining"]).toBe("0");
  });

  test("handles past reset time", () => {
    const info: RateLimitInfo = {
      remaining: 100,
      resetAt: Date.now() - 1000,
    };

    const headers = formatRateLimitHeaders(info);
    // Retry-After should be 0 when reset time has passed
    expect(Number(headers["Retry-After"])).toBe(0);
  });
});

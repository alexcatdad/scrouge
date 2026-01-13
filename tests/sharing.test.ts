import { describe, expect, test } from "bun:test";

/**
 * Subscription Sharing business logic tests
 * Tests the core validations and logic used in sharing functionality
 */

interface Invite {
  id: string;
  subscriptionId: string;
  token: string;
  expiresAt: number;
  claimedBy?: string;
  createdAt: number;
}

interface Share {
  id: string;
  subscriptionId: string;
  type: "user" | "anonymous";
  userId?: string;
  name?: string;
  isHidden: boolean;
  createdAt: number;
}

interface Subscription {
  id: string;
  userId: string;
  name: string;
  cost: number;
  currency: string;
  maxSlots?: number;
}

// Token validation
function isValidToken(token: string): boolean {
  // Token should be base64url encoded, ~43 chars for 32 bytes
  return /^[A-Za-z0-9_-]{40,50}$/.test(token);
}

// Invite expiration check
function isInviteExpired(invite: Invite): boolean {
  return invite.expiresAt < Date.now();
}

// Invite claimed check
function isInviteClaimed(invite: Invite): boolean {
  return invite.claimedBy !== undefined;
}

// Can claim invite
function canClaimInvite(
  invite: Invite | null,
  userId: string,
  subscriptionOwnerId: string,
): { valid: boolean; reason?: string } {
  if (!invite) {
    return { valid: false, reason: "Invite not found" };
  }
  if (isInviteExpired(invite)) {
    return { valid: false, reason: "Invite has expired" };
  }
  if (isInviteClaimed(invite)) {
    return { valid: false, reason: "Invite has already been claimed" };
  }
  if (userId === subscriptionOwnerId) {
    return { valid: false, reason: "Cannot claim your own subscription" };
  }
  return { valid: true };
}

// ROI calculation
function calculateROI(
  subscription: Subscription,
  sharesCount: number,
): {
  usedSlots: number;
  unusedSlots: number;
  wastedAmount: number;
  utilizationPercent: number;
} | null {
  if (!subscription.maxSlots) return null;

  const usedSlots = sharesCount + 1; // shares + owner
  const unusedSlots = Math.max(0, subscription.maxSlots - usedSlots);
  const costPerSlot = subscription.cost / subscription.maxSlots;
  const wastedAmount = unusedSlots * costPerSlot;
  const utilizationPercent = (usedSlots / subscription.maxSlots) * 100;

  return {
    usedSlots,
    unusedSlots,
    wastedAmount,
    utilizationPercent,
  };
}

// Expiration date calculation
function calculateExpirationDate(daysFromNow: number = 7): number {
  return Date.now() + daysFromNow * 24 * 60 * 60 * 1000;
}

describe("Invite Token Validation", () => {
  describe("isValidToken", () => {
    test("accepts valid base64url tokens", () => {
      // Typical 32-byte base64url encoded token
      const validToken = "dGhpcyBpcyBhIHRlc3QgdG9rZW4gZm9yIHRlc3Rpbmc";
      expect(isValidToken(validToken)).toBe(true);
    });

    test("accepts tokens with underscore and hyphen", () => {
      const token = "abc_def-ghi_jkl-mno_pqr-stu_vwx-yz01234567";
      expect(isValidToken(token)).toBe(true);
    });

    test("rejects tokens that are too short", () => {
      expect(isValidToken("abc123")).toBe(false);
      expect(isValidToken("")).toBe(false);
    });

    test("rejects tokens that are too long", () => {
      const longToken = "a".repeat(60);
      expect(isValidToken(longToken)).toBe(false);
    });

    test("rejects tokens with invalid characters", () => {
      expect(isValidToken("abc+def/ghi=jkl")).toBe(false); // base64 but not base64url
      expect(isValidToken("abc def ghi")).toBe(false); // spaces
      expect(isValidToken("abc!@#$%^&*()")).toBe(false); // special chars
    });
  });
});

describe("Invite Expiration Logic", () => {
  describe("isInviteExpired", () => {
    test("returns false for future expiration", () => {
      const invite: Invite = {
        id: "1",
        subscriptionId: "sub1",
        token: "token123",
        expiresAt: Date.now() + 1000000,
        createdAt: Date.now(),
      };
      expect(isInviteExpired(invite)).toBe(false);
    });

    test("returns true for past expiration", () => {
      const invite: Invite = {
        id: "1",
        subscriptionId: "sub1",
        token: "token123",
        expiresAt: Date.now() - 1000,
        createdAt: Date.now() - 100000,
      };
      expect(isInviteExpired(invite)).toBe(true);
    });

    test("returns true for exactly now (boundary)", () => {
      const now = Date.now();
      const invite: Invite = {
        id: "1",
        subscriptionId: "sub1",
        token: "token123",
        expiresAt: now - 1, // Just past
        createdAt: now - 1000,
      };
      expect(isInviteExpired(invite)).toBe(true);
    });
  });

  describe("isInviteClaimed", () => {
    test("returns false when claimedBy is undefined", () => {
      const invite: Invite = {
        id: "1",
        subscriptionId: "sub1",
        token: "token123",
        expiresAt: Date.now() + 1000000,
        createdAt: Date.now(),
      };
      expect(isInviteClaimed(invite)).toBe(false);
    });

    test("returns true when claimedBy is set", () => {
      const invite: Invite = {
        id: "1",
        subscriptionId: "sub1",
        token: "token123",
        expiresAt: Date.now() + 1000000,
        claimedBy: "user123",
        createdAt: Date.now(),
      };
      expect(isInviteClaimed(invite)).toBe(true);
    });
  });
});

describe("canClaimInvite", () => {
  const validInvite: Invite = {
    id: "1",
    subscriptionId: "sub1",
    token: "token123",
    expiresAt: Date.now() + 1000000,
    createdAt: Date.now(),
  };

  test("returns valid for unclaimed, unexpired invite", () => {
    const result = canClaimInvite(validInvite, "user456", "owner123");
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  test("returns invalid for null invite", () => {
    const result = canClaimInvite(null, "user456", "owner123");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("Invite not found");
  });

  test("returns invalid for expired invite", () => {
    const expiredInvite: Invite = {
      ...validInvite,
      expiresAt: Date.now() - 1000,
    };
    const result = canClaimInvite(expiredInvite, "user456", "owner123");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("Invite has expired");
  });

  test("returns invalid for claimed invite", () => {
    const claimedInvite: Invite = {
      ...validInvite,
      claimedBy: "someone",
    };
    const result = canClaimInvite(claimedInvite, "user456", "owner123");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("Invite has already been claimed");
  });

  test("returns invalid when user is owner", () => {
    const result = canClaimInvite(validInvite, "owner123", "owner123");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("Cannot claim your own subscription");
  });
});

describe("ROI Calculation", () => {
  describe("calculateROI", () => {
    test("calculates correctly for partially filled family plan", () => {
      const subscription: Subscription = {
        id: "1",
        userId: "owner",
        name: "Netflix Family",
        cost: 24,
        currency: "USD",
        maxSlots: 6,
      };

      const result = calculateROI(subscription, 3); // 3 shares

      expect(result).not.toBeNull();
      expect(result?.usedSlots).toBe(4); // 3 shares + 1 owner
      expect(result?.unusedSlots).toBe(2);
      expect(result?.wastedAmount).toBe(8); // 2 unused * ($24/6)
      expect(result?.utilizationPercent).toBeCloseTo(66.67, 1);
    });

    test("calculates correctly for fully utilized plan", () => {
      const subscription: Subscription = {
        id: "1",
        userId: "owner",
        name: "Spotify Family",
        cost: 16,
        currency: "USD",
        maxSlots: 6,
      };

      const result = calculateROI(subscription, 5); // 5 shares = full

      expect(result?.usedSlots).toBe(6);
      expect(result?.unusedSlots).toBe(0);
      expect(result?.wastedAmount).toBe(0);
      expect(result?.utilizationPercent).toBe(100);
    });

    test("handles owner-only (no shares)", () => {
      const subscription: Subscription = {
        id: "1",
        userId: "owner",
        name: "Netflix Family",
        cost: 24,
        currency: "USD",
        maxSlots: 6,
      };

      const result = calculateROI(subscription, 0);

      expect(result?.usedSlots).toBe(1);
      expect(result?.unusedSlots).toBe(5);
      expect(result?.wastedAmount).toBe(20); // 5 * $4
      expect(result?.utilizationPercent).toBeCloseTo(16.67, 1);
    });

    test("returns null for non-family plan", () => {
      const subscription: Subscription = {
        id: "1",
        userId: "owner",
        name: "Netflix Standard",
        cost: 15,
        currency: "USD",
        // No maxSlots
      };

      const result = calculateROI(subscription, 0);
      expect(result).toBeNull();
    });

    test("handles over-shared scenario", () => {
      const subscription: Subscription = {
        id: "1",
        userId: "owner",
        name: "Test Plan",
        cost: 20,
        currency: "USD",
        maxSlots: 4,
      };

      // More shares than slots (shouldn't happen but handle gracefully)
      const result = calculateROI(subscription, 5);

      expect(result?.usedSlots).toBe(6);
      expect(result?.unusedSlots).toBe(0); // Math.max prevents negative
      expect(result?.utilizationPercent).toBe(150);
    });

    test("calculates wasted amount with decimal costs", () => {
      const subscription: Subscription = {
        id: "1",
        userId: "owner",
        name: "Test",
        cost: 15.99,
        currency: "USD",
        maxSlots: 5,
      };

      const result = calculateROI(subscription, 1);
      const costPerSlot = 15.99 / 5;

      expect(result?.wastedAmount).toBeCloseTo(costPerSlot * 3, 2);
    });
  });
});

describe("Expiration Date Calculation", () => {
  describe("calculateExpirationDate", () => {
    test("calculates 7 days by default", () => {
      const now = Date.now();
      const expiry = calculateExpirationDate();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

      // Allow 100ms tolerance for test execution time
      expect(expiry).toBeGreaterThan(now + sevenDaysMs - 100);
      expect(expiry).toBeLessThan(now + sevenDaysMs + 100);
    });

    test("calculates custom days correctly", () => {
      const now = Date.now();
      const expiry = calculateExpirationDate(30);
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

      expect(expiry).toBeGreaterThan(now + thirtyDaysMs - 100);
      expect(expiry).toBeLessThan(now + thirtyDaysMs + 100);
    });

    test("handles 0 days (immediate expiration)", () => {
      const now = Date.now();
      const expiry = calculateExpirationDate(0);

      expect(expiry).toBeGreaterThan(now - 100);
      expect(expiry).toBeLessThan(now + 100);
    });

    test("handles 1 day", () => {
      const now = Date.now();
      const expiry = calculateExpirationDate(1);
      const oneDayMs = 24 * 60 * 60 * 1000;

      expect(expiry).toBeGreaterThan(now + oneDayMs - 100);
      expect(expiry).toBeLessThan(now + oneDayMs + 100);
    });
  });
});

describe("Share Type Logic", () => {
  describe("Anonymous vs User shares", () => {
    test("anonymous share has name but no userId", () => {
      const share: Share = {
        id: "1",
        subscriptionId: "sub1",
        type: "anonymous",
        name: "Mom",
        isHidden: false,
        createdAt: Date.now(),
      };

      expect(share.type).toBe("anonymous");
      expect(share.name).toBeDefined();
      expect(share.userId).toBeUndefined();
    });

    test("user share has userId", () => {
      const share: Share = {
        id: "1",
        subscriptionId: "sub1",
        type: "user",
        userId: "user123",
        isHidden: false,
        createdAt: Date.now(),
      };

      expect(share.type).toBe("user");
      expect(share.userId).toBeDefined();
    });
  });

  describe("Hidden share filtering", () => {
    function filterShares(shares: Share[], includeHidden: boolean): Share[] {
      if (includeHidden) return shares;
      return shares.filter((s) => !s.isHidden);
    }

    test("excludes hidden shares by default", () => {
      const shares: Share[] = [
        { id: "1", subscriptionId: "s1", type: "user", isHidden: false, createdAt: Date.now() },
        { id: "2", subscriptionId: "s1", type: "user", isHidden: true, createdAt: Date.now() },
        { id: "3", subscriptionId: "s1", type: "user", isHidden: false, createdAt: Date.now() },
      ];

      const filtered = filterShares(shares, false);
      expect(filtered.length).toBe(2);
      expect(filtered.every((s) => !s.isHidden)).toBe(true);
    });

    test("includes hidden shares when requested", () => {
      const shares: Share[] = [
        { id: "1", subscriptionId: "s1", type: "user", isHidden: false, createdAt: Date.now() },
        { id: "2", subscriptionId: "s1", type: "user", isHidden: true, createdAt: Date.now() },
      ];

      const filtered = filterShares(shares, true);
      expect(filtered.length).toBe(2);
    });
  });
});

describe("Duplicate Share Detection", () => {
  function hasExistingShare(
    shares: Share[],
    userId: string | undefined,
    name: string | undefined,
  ): boolean {
    if (userId) {
      return shares.some((s) => s.type === "user" && s.userId === userId);
    }
    if (name) {
      return shares.some(
        (s) => s.type === "anonymous" && s.name?.toLowerCase() === name.toLowerCase(),
      );
    }
    return false;
  }

  test("detects existing user share", () => {
    const shares: Share[] = [
      {
        id: "1",
        subscriptionId: "s1",
        type: "user",
        userId: "user123",
        isHidden: false,
        createdAt: Date.now(),
      },
    ];

    expect(hasExistingShare(shares, "user123", undefined)).toBe(true);
    expect(hasExistingShare(shares, "user456", undefined)).toBe(false);
  });

  test("detects existing anonymous share (case-insensitive)", () => {
    const shares: Share[] = [
      {
        id: "1",
        subscriptionId: "s1",
        type: "anonymous",
        name: "Mom",
        isHidden: false,
        createdAt: Date.now(),
      },
    ];

    expect(hasExistingShare(shares, undefined, "Mom")).toBe(true);
    expect(hasExistingShare(shares, undefined, "mom")).toBe(true);
    expect(hasExistingShare(shares, undefined, "MOM")).toBe(true);
    expect(hasExistingShare(shares, undefined, "Dad")).toBe(false);
  });

  test("returns false for empty shares", () => {
    expect(hasExistingShare([], "user123", undefined)).toBe(false);
    expect(hasExistingShare([], undefined, "Mom")).toBe(false);
  });
});

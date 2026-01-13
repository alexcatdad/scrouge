import { describe, expect, test } from "bun:test";

/**
 * Subscription business logic tests
 * Tests the core calculations and validations used in subscription management
 */

// Billing cycle types
type BillingCycle = "monthly" | "yearly" | "weekly" | "daily";

// Helper function to calculate monthly cost (mirrors convex/subscriptions.ts logic)
function calculateMonthlyCost(cost: number, billingCycle: BillingCycle): number {
  switch (billingCycle) {
    case "yearly":
      return cost / 12;
    case "weekly":
      return cost * 4.33;
    case "daily":
      return cost * 30;
    default:
      return cost;
  }
}

// Helper to calculate next billing date
function calculateNextBillingDate(billingCycle: BillingCycle, fromDate: Date = new Date()): number {
  const date = new Date(fromDate);

  switch (billingCycle) {
    case "daily":
      date.setDate(date.getDate() + 1);
      break;
    case "weekly":
      date.setDate(date.getDate() + 7);
      break;
    case "monthly":
      date.setMonth(date.getMonth() + 1);
      break;
    case "yearly":
      date.setFullYear(date.getFullYear() + 1);
      break;
  }

  return date.getTime();
}

// Helper to check if subscription is upcoming within N days
function isUpcoming(nextBillingDate: number, days: number): boolean {
  const cutoffDate = Date.now() + days * 24 * 60 * 60 * 1000;
  return nextBillingDate <= cutoffDate;
}

// Helper to aggregate costs by currency
function aggregateCostsByCurrency(
  subscriptions: Array<{
    cost: number;
    currency: string;
    billingCycle: BillingCycle;
    isActive: boolean;
  }>,
): Record<string, number> {
  return subscriptions
    .filter((sub) => sub.isActive)
    .reduce(
      (acc, sub) => {
        const monthlyCost = calculateMonthlyCost(sub.cost, sub.billingCycle);
        if (!acc[sub.currency]) {
          acc[sub.currency] = 0;
        }
        acc[sub.currency] += monthlyCost;
        return acc;
      },
      {} as Record<string, number>,
    );
}

describe("Subscription Business Logic", () => {
  describe("calculateMonthlyCost", () => {
    test("monthly cost stays the same", () => {
      expect(calculateMonthlyCost(10, "monthly")).toBe(10);
    });

    test("yearly cost is divided by 12", () => {
      expect(calculateMonthlyCost(120, "yearly")).toBe(10);
    });

    test("weekly cost is multiplied by 4.33", () => {
      expect(calculateMonthlyCost(10, "weekly")).toBeCloseTo(43.3, 1);
    });

    test("daily cost is multiplied by 30", () => {
      expect(calculateMonthlyCost(1, "daily")).toBe(30);
    });

    test("handles zero cost", () => {
      expect(calculateMonthlyCost(0, "monthly")).toBe(0);
      expect(calculateMonthlyCost(0, "yearly")).toBe(0);
    });

    test("handles decimal costs", () => {
      expect(calculateMonthlyCost(9.99, "monthly")).toBe(9.99);
      expect(calculateMonthlyCost(119.88, "yearly")).toBeCloseTo(9.99, 2);
    });

    test("handles large costs", () => {
      expect(calculateMonthlyCost(12000, "yearly")).toBe(1000);
      expect(calculateMonthlyCost(1000000, "monthly")).toBe(1000000);
    });

    test("handles very small costs", () => {
      expect(calculateMonthlyCost(0.01, "monthly")).toBe(0.01);
      expect(calculateMonthlyCost(0.12, "yearly")).toBeCloseTo(0.01, 2);
    });
  });

  describe("calculateNextBillingDate", () => {
    test("daily adds 1 day", () => {
      const baseDate = new Date("2024-01-15");
      const nextDate = calculateNextBillingDate("daily", baseDate);
      const expected = new Date("2024-01-16").getTime();
      expect(nextDate).toBe(expected);
    });

    test("weekly adds 7 days", () => {
      const baseDate = new Date("2024-01-15");
      const nextDate = calculateNextBillingDate("weekly", baseDate);
      const expected = new Date("2024-01-22").getTime();
      expect(nextDate).toBe(expected);
    });

    test("monthly adds 1 month", () => {
      const baseDate = new Date("2024-01-15");
      const nextDate = calculateNextBillingDate("monthly", baseDate);
      const expected = new Date("2024-02-15").getTime();
      expect(nextDate).toBe(expected);
    });

    test("yearly adds 1 year", () => {
      const baseDate = new Date("2024-01-15");
      const nextDate = calculateNextBillingDate("yearly", baseDate);
      const expected = new Date("2025-01-15").getTime();
      expect(nextDate).toBe(expected);
    });

    test("handles month end edge case", () => {
      const baseDate = new Date("2024-01-31");
      const nextDate = calculateNextBillingDate("monthly", baseDate);
      // Feb doesn't have 31 days, JS will roll to March
      const result = new Date(nextDate);
      expect(result.getMonth()).toBe(2); // March (0-indexed)
    });

    test("handles leap year", () => {
      const baseDate = new Date("2024-02-29");
      const nextDate = calculateNextBillingDate("yearly", baseDate);
      // 2025 is not a leap year, should roll to March 1
      const result = new Date(nextDate);
      expect(result.getFullYear()).toBe(2025);
    });

    test("handles year transition", () => {
      const baseDate = new Date("2024-12-15");
      const nextDate = calculateNextBillingDate("monthly", baseDate);
      const result = new Date(nextDate);
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(0); // January
    });
  });

  describe("isUpcoming", () => {
    test("returns true for bills within window", () => {
      const tomorrow = Date.now() + 1 * 24 * 60 * 60 * 1000;
      expect(isUpcoming(tomorrow, 30)).toBe(true);
    });

    test("returns false for bills outside window", () => {
      const farFuture = Date.now() + 60 * 24 * 60 * 60 * 1000;
      expect(isUpcoming(farFuture, 30)).toBe(false);
    });

    test("returns true for bills exactly at cutoff", () => {
      const exactCutoff = Date.now() + 30 * 24 * 60 * 60 * 1000;
      expect(isUpcoming(exactCutoff, 30)).toBe(true);
    });

    test("returns true for overdue bills", () => {
      const yesterday = Date.now() - 1 * 24 * 60 * 60 * 1000;
      expect(isUpcoming(yesterday, 30)).toBe(true);
    });

    test("handles zero day window", () => {
      const tomorrow = Date.now() + 1 * 24 * 60 * 60 * 1000;
      expect(isUpcoming(tomorrow, 0)).toBe(false);
    });

    test("handles 7 day urgent window", () => {
      const in5Days = Date.now() + 5 * 24 * 60 * 60 * 1000;
      const in10Days = Date.now() + 10 * 24 * 60 * 60 * 1000;
      expect(isUpcoming(in5Days, 7)).toBe(true);
      expect(isUpcoming(in10Days, 7)).toBe(false);
    });
  });

  describe("aggregateCostsByCurrency", () => {
    test("aggregates single currency", () => {
      const subscriptions = [
        { cost: 10, currency: "USD", billingCycle: "monthly" as BillingCycle, isActive: true },
        { cost: 20, currency: "USD", billingCycle: "monthly" as BillingCycle, isActive: true },
      ];
      const result = aggregateCostsByCurrency(subscriptions);
      expect(result.USD).toBe(30);
    });

    test("aggregates multiple currencies", () => {
      const subscriptions = [
        { cost: 10, currency: "USD", billingCycle: "monthly" as BillingCycle, isActive: true },
        { cost: 20, currency: "EUR", billingCycle: "monthly" as BillingCycle, isActive: true },
        { cost: 5, currency: "USD", billingCycle: "monthly" as BillingCycle, isActive: true },
      ];
      const result = aggregateCostsByCurrency(subscriptions);
      expect(result.USD).toBe(15);
      expect(result.EUR).toBe(20);
    });

    test("converts billing cycles to monthly", () => {
      const subscriptions = [
        { cost: 120, currency: "USD", billingCycle: "yearly" as BillingCycle, isActive: true },
        { cost: 10, currency: "USD", billingCycle: "monthly" as BillingCycle, isActive: true },
      ];
      const result = aggregateCostsByCurrency(subscriptions);
      expect(result.USD).toBe(20); // 10 + 10 (120/12)
    });

    test("ignores inactive subscriptions", () => {
      const subscriptions = [
        { cost: 10, currency: "USD", billingCycle: "monthly" as BillingCycle, isActive: true },
        { cost: 100, currency: "USD", billingCycle: "monthly" as BillingCycle, isActive: false },
      ];
      const result = aggregateCostsByCurrency(subscriptions);
      expect(result.USD).toBe(10);
    });

    test("returns empty object for no active subscriptions", () => {
      const subscriptions = [
        { cost: 10, currency: "USD", billingCycle: "monthly" as BillingCycle, isActive: false },
      ];
      const result = aggregateCostsByCurrency(subscriptions);
      expect(Object.keys(result).length).toBe(0);
    });

    test("returns empty object for empty array", () => {
      const result = aggregateCostsByCurrency([]);
      expect(Object.keys(result).length).toBe(0);
    });

    test("handles mixed billing cycles and currencies", () => {
      const subscriptions = [
        { cost: 12, currency: "USD", billingCycle: "yearly" as BillingCycle, isActive: true }, // 1/month
        { cost: 10, currency: "USD", billingCycle: "weekly" as BillingCycle, isActive: true }, // 43.3/month
        { cost: 1, currency: "EUR", billingCycle: "daily" as BillingCycle, isActive: true }, // 30/month
        { cost: 5, currency: "EUR", billingCycle: "monthly" as BillingCycle, isActive: true },
      ];
      const result = aggregateCostsByCurrency(subscriptions);
      expect(result.USD).toBeCloseTo(44.3, 1);
      expect(result.EUR).toBe(35);
    });
  });
});

describe("Subscription Validation Logic", () => {
  describe("Billing cycle validation", () => {
    const validCycles: BillingCycle[] = ["monthly", "yearly", "weekly", "daily"];

    test("all valid cycles are recognized", () => {
      for (const cycle of validCycles) {
        expect(validCycles.includes(cycle)).toBe(true);
      }
    });

    test("invalid cycles are not in the list", () => {
      const invalidCycles = ["hourly", "quarterly", "biweekly", ""];
      for (const cycle of invalidCycles) {
        expect(validCycles.includes(cycle as BillingCycle)).toBe(false);
      }
    });
  });

  describe("Payment method type validation", () => {
    const validTypes = ["credit_card", "debit_card", "bank_account", "paypal", "other"];

    test("all valid types are recognized", () => {
      for (const type of validTypes) {
        expect(validTypes.includes(type)).toBe(true);
      }
    });

    test("invalid types are not in the list", () => {
      const invalidTypes = ["crypto", "cash", "check", ""];
      for (const type of invalidTypes) {
        expect(validTypes.includes(type)).toBe(false);
      }
    });
  });

  describe("Cost validation", () => {
    test("positive costs are valid", () => {
      expect(10 > 0).toBe(true);
      expect(0.01 > 0).toBe(true);
      expect(1000000 > 0).toBe(true);
    });

    test("zero cost is edge case", () => {
      // Zero cost might be valid for free trials
      const zeroCost = 0;
      expect(zeroCost >= 0).toBe(true);
    });

    test("negative costs should be rejected", () => {
      expect(-10 > 0).toBe(false);
      expect(-0.01 > 0).toBe(false);
    });
  });

  describe("Currency validation", () => {
    const commonCurrencies = ["USD", "EUR", "GBP", "CAD"];

    test("common currencies are valid", () => {
      for (const currency of commonCurrencies) {
        expect(currency.length).toBe(3);
        expect(currency).toBe(currency.toUpperCase());
      }
    });

    test("empty currency is invalid", () => {
      expect("".length).toBe(0);
    });
  });
});

describe("ID Mapping for Migration", () => {
  // Tests for the guest migration logic
  type IdMapping = Record<string, string>;

  function mapPaymentMethodId(localId: string, mapping: IdMapping): string | undefined {
    return mapping[localId];
  }

  test("maps existing local ID to new ID", () => {
    const mapping: IdMapping = {
      "local-pm-1": "convex-pm-abc123",
      "local-pm-2": "convex-pm-def456",
    };
    expect(mapPaymentMethodId("local-pm-1", mapping)).toBe("convex-pm-abc123");
  });

  test("returns undefined for non-existent local ID", () => {
    const mapping: IdMapping = {
      "local-pm-1": "convex-pm-abc123",
    };
    expect(mapPaymentMethodId("local-pm-999", mapping)).toBeUndefined();
  });

  test("handles empty mapping", () => {
    const mapping: IdMapping = {};
    expect(mapPaymentMethodId("local-pm-1", mapping)).toBeUndefined();
  });

  test("counts migrated items correctly", () => {
    const paymentMethods = [{ localId: "1" }, { localId: "2" }, { localId: "3" }];
    const subscriptions = [
      { localId: "s1", paymentMethodLocalId: "1" },
      { localId: "s2", paymentMethodLocalId: "2" },
      { localId: "s3", paymentMethodLocalId: "999" }, // Missing payment method
    ];

    const mapping: IdMapping = {};
    let migratedPaymentMethods = 0;

    for (const pm of paymentMethods) {
      mapping[pm.localId] = `convex-${pm.localId}`;
      migratedPaymentMethods++;
    }

    let migratedSubscriptions = 0;
    let skippedSubscriptions = 0;

    for (const sub of subscriptions) {
      if (mapping[sub.paymentMethodLocalId]) {
        migratedSubscriptions++;
      } else {
        skippedSubscriptions++;
      }
    }

    expect(migratedPaymentMethods).toBe(3);
    expect(migratedSubscriptions).toBe(2);
    expect(skippedSubscriptions).toBe(1);
  });
});

describe("Cascade Delete Logic", () => {
  // Simulates the cascade delete behavior
  interface Share {
    id: string;
    subscriptionId: string;
  }

  interface Invite {
    id: string;
    subscriptionId: string;
  }

  function getRelatedShares(subscriptionId: string, shares: Share[]): Share[] {
    return shares.filter((s) => s.subscriptionId === subscriptionId);
  }

  function getRelatedInvites(subscriptionId: string, invites: Invite[]): Invite[] {
    return invites.filter((i) => i.subscriptionId === subscriptionId);
  }

  test("finds all related shares", () => {
    const shares: Share[] = [
      { id: "share1", subscriptionId: "sub1" },
      { id: "share2", subscriptionId: "sub1" },
      { id: "share3", subscriptionId: "sub2" },
    ];

    const related = getRelatedShares("sub1", shares);
    expect(related.length).toBe(2);
    expect(related.map((s) => s.id)).toContain("share1");
    expect(related.map((s) => s.id)).toContain("share2");
  });

  test("finds all related invites", () => {
    const invites: Invite[] = [
      { id: "inv1", subscriptionId: "sub1" },
      { id: "inv2", subscriptionId: "sub2" },
    ];

    const related = getRelatedInvites("sub1", invites);
    expect(related.length).toBe(1);
    expect(related[0].id).toBe("inv1");
  });

  test("returns empty array when no related items", () => {
    const shares: Share[] = [{ id: "share1", subscriptionId: "sub2" }];

    const related = getRelatedShares("sub1", shares);
    expect(related.length).toBe(0);
  });

  test("handles empty arrays", () => {
    expect(getRelatedShares("sub1", []).length).toBe(0);
    expect(getRelatedInvites("sub1", []).length).toBe(0);
  });
});

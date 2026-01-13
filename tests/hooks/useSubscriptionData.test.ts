import { describe, expect, test } from "bun:test";

/**
 * useSubscriptionData hook business logic tests
 *
 * Tests the data transformation and calculation logic used in the hook
 * without requiring React rendering.
 */

// Types
type BillingCycle = "monthly" | "yearly" | "weekly" | "daily";

interface Subscription {
  id: string;
  userId: string;
  name: string;
  cost: number;
  currency: string;
  billingCycle: BillingCycle;
  nextBillingDate: number;
  isActive: boolean;
  paymentMethodId: string;
  category: string;
  maxSlots?: number;
}

interface SharedSubscription extends Subscription {
  isSharedWithMe: true;
  shareId: string;
  ownerName: string;
  isHidden: boolean;
}

interface UnifiedSubscription {
  id: string;
  name: string;
  cost: number;
  currency: string;
  billingCycle: BillingCycle;
  nextBillingDate: number;
  isActive: boolean;
  paymentMethodId: string;
  category: string;
  maxSlots?: number;
  isSharedWithMe?: boolean;
  shareId?: string;
  ownerName?: string;
  isHidden?: boolean;
}

// Data transformation functions
function toUnifiedSubscription(sub: Subscription): UnifiedSubscription {
  return {
    id: sub.id,
    name: sub.name,
    cost: sub.cost,
    currency: sub.currency,
    billingCycle: sub.billingCycle,
    nextBillingDate: sub.nextBillingDate,
    isActive: sub.isActive,
    paymentMethodId: sub.paymentMethodId,
    category: sub.category,
    maxSlots: sub.maxSlots,
  };
}

function toUnifiedSharedSubscription(sub: SharedSubscription): UnifiedSubscription {
  return {
    ...toUnifiedSubscription(sub),
    isSharedWithMe: true,
    shareId: sub.shareId,
    ownerName: sub.ownerName,
    isHidden: sub.isHidden,
  };
}

// Filter functions
function filterActiveOnly(subscriptions: UnifiedSubscription[]): UnifiedSubscription[] {
  return subscriptions.filter((sub) => sub.isActive);
}

function filterExcludeHidden(subscriptions: UnifiedSubscription[]): UnifiedSubscription[] {
  return subscriptions.filter((sub) => !sub.isHidden);
}

function filterSharedOnly(subscriptions: UnifiedSubscription[]): UnifiedSubscription[] {
  return subscriptions.filter((sub) => sub.isSharedWithMe);
}

// Cost calculation
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

function calculateTotalCosts(subscriptions: UnifiedSubscription[]): Record<string, number> {
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

// Upcoming bills filter
function getUpcomingBills(
  subscriptions: UnifiedSubscription[],
  days: number = 30,
): UnifiedSubscription[] {
  const cutoffDate = Date.now() + days * 24 * 60 * 60 * 1000;
  return subscriptions
    .filter((sub) => sub.isActive && sub.nextBillingDate <= cutoffDate)
    .sort((a, b) => a.nextBillingDate - b.nextBillingDate);
}

// Merge owned and shared subscriptions
function mergeSubscriptions(
  owned: Subscription[],
  shared: SharedSubscription[],
  includeHidden: boolean = false,
): UnifiedSubscription[] {
  const ownedUnified = owned.map(toUnifiedSubscription);
  let sharedUnified = shared.map(toUnifiedSharedSubscription);

  if (!includeHidden) {
    sharedUnified = sharedUnified.filter((sub) => !sub.isHidden);
  }

  return [...ownedUnified, ...sharedUnified];
}

describe("Subscription Data Transformations", () => {
  describe("toUnifiedSubscription", () => {
    test("transforms owned subscription correctly", () => {
      const sub: Subscription = {
        id: "sub-1",
        userId: "user-1",
        name: "Netflix",
        cost: 15.99,
        currency: "USD",
        billingCycle: "monthly",
        nextBillingDate: Date.now() + 1000000,
        isActive: true,
        paymentMethodId: "pm-1",
        category: "Streaming",
      };

      const unified = toUnifiedSubscription(sub);

      expect(unified.id).toBe("sub-1");
      expect(unified.name).toBe("Netflix");
      expect(unified.isSharedWithMe).toBeUndefined();
    });

    test("includes maxSlots for family plans", () => {
      const sub: Subscription = {
        id: "sub-1",
        userId: "user-1",
        name: "Netflix Family",
        cost: 22.99,
        currency: "USD",
        billingCycle: "monthly",
        nextBillingDate: Date.now() + 1000000,
        isActive: true,
        paymentMethodId: "pm-1",
        category: "Streaming",
        maxSlots: 5,
      };

      const unified = toUnifiedSubscription(sub);

      expect(unified.maxSlots).toBe(5);
    });
  });

  describe("toUnifiedSharedSubscription", () => {
    test("transforms shared subscription correctly", () => {
      const shared: SharedSubscription = {
        id: "sub-1",
        userId: "owner-1",
        name: "Netflix Family",
        cost: 22.99,
        currency: "USD",
        billingCycle: "monthly",
        nextBillingDate: Date.now() + 1000000,
        isActive: true,
        paymentMethodId: "pm-1",
        category: "Streaming",
        isSharedWithMe: true,
        shareId: "share-1",
        ownerName: "John Doe",
        isHidden: false,
      };

      const unified = toUnifiedSharedSubscription(shared);

      expect(unified.isSharedWithMe).toBe(true);
      expect(unified.shareId).toBe("share-1");
      expect(unified.ownerName).toBe("John Doe");
      expect(unified.isHidden).toBe(false);
    });
  });
});

describe("Subscription Filtering", () => {
  const mockSubscriptions: UnifiedSubscription[] = [
    {
      id: "1",
      name: "Netflix",
      cost: 15,
      currency: "USD",
      billingCycle: "monthly",
      nextBillingDate: Date.now() + 1000000,
      isActive: true,
      paymentMethodId: "pm-1",
      category: "Streaming",
    },
    {
      id: "2",
      name: "Paused Service",
      cost: 10,
      currency: "USD",
      billingCycle: "monthly",
      nextBillingDate: Date.now() + 1000000,
      isActive: false,
      paymentMethodId: "pm-1",
      category: "Software",
    },
    {
      id: "3",
      name: "Shared Netflix",
      cost: 22,
      currency: "USD",
      billingCycle: "monthly",
      nextBillingDate: Date.now() + 1000000,
      isActive: true,
      paymentMethodId: "pm-1",
      category: "Streaming",
      isSharedWithMe: true,
      shareId: "share-1",
      ownerName: "Friend",
      isHidden: false,
    },
    {
      id: "4",
      name: "Hidden Shared",
      cost: 15,
      currency: "USD",
      billingCycle: "monthly",
      nextBillingDate: Date.now() + 1000000,
      isActive: true,
      paymentMethodId: "pm-1",
      category: "Streaming",
      isSharedWithMe: true,
      shareId: "share-2",
      ownerName: "Other",
      isHidden: true,
    },
  ];

  describe("filterActiveOnly", () => {
    test("returns only active subscriptions", () => {
      const result = filterActiveOnly(mockSubscriptions);

      expect(result.length).toBe(3);
      expect(result.every((sub) => sub.isActive)).toBe(true);
    });

    test("returns empty array when all inactive", () => {
      const inactiveSubs = mockSubscriptions.map((sub) => ({ ...sub, isActive: false }));
      const result = filterActiveOnly(inactiveSubs);

      expect(result.length).toBe(0);
    });
  });

  describe("filterExcludeHidden", () => {
    test("excludes hidden subscriptions", () => {
      const result = filterExcludeHidden(mockSubscriptions);

      expect(result.length).toBe(3);
      expect(result.find((sub) => sub.name === "Hidden Shared")).toBeUndefined();
    });
  });

  describe("filterSharedOnly", () => {
    test("returns only shared subscriptions", () => {
      const result = filterSharedOnly(mockSubscriptions);

      expect(result.length).toBe(2);
      expect(result.every((sub) => sub.isSharedWithMe)).toBe(true);
    });
  });
});

describe("Cost Calculations", () => {
  describe("calculateMonthlyCost", () => {
    test("monthly cost unchanged", () => {
      expect(calculateMonthlyCost(10, "monthly")).toBe(10);
    });

    test("yearly cost divided by 12", () => {
      expect(calculateMonthlyCost(120, "yearly")).toBe(10);
    });

    test("weekly cost multiplied by 4.33", () => {
      expect(calculateMonthlyCost(10, "weekly")).toBeCloseTo(43.3, 1);
    });

    test("daily cost multiplied by 30", () => {
      expect(calculateMonthlyCost(1, "daily")).toBe(30);
    });
  });

  describe("calculateTotalCosts", () => {
    test("sums costs by currency", () => {
      const subs: UnifiedSubscription[] = [
        {
          id: "1",
          name: "Netflix",
          cost: 15,
          currency: "USD",
          billingCycle: "monthly",
          nextBillingDate: Date.now(),
          isActive: true,
          paymentMethodId: "pm-1",
          category: "Streaming",
        },
        {
          id: "2",
          name: "Spotify",
          cost: 10,
          currency: "USD",
          billingCycle: "monthly",
          nextBillingDate: Date.now(),
          isActive: true,
          paymentMethodId: "pm-1",
          category: "Music",
        },
      ];

      const result = calculateTotalCosts(subs);

      expect(result.USD).toBe(25);
    });

    test("handles multiple currencies", () => {
      const subs: UnifiedSubscription[] = [
        {
          id: "1",
          name: "Netflix",
          cost: 15,
          currency: "USD",
          billingCycle: "monthly",
          nextBillingDate: Date.now(),
          isActive: true,
          paymentMethodId: "pm-1",
          category: "Streaming",
        },
        {
          id: "2",
          name: "Euro Service",
          cost: 10,
          currency: "EUR",
          billingCycle: "monthly",
          nextBillingDate: Date.now(),
          isActive: true,
          paymentMethodId: "pm-1",
          category: "Software",
        },
      ];

      const result = calculateTotalCosts(subs);

      expect(result.USD).toBe(15);
      expect(result.EUR).toBe(10);
    });

    test("converts billing cycles before summing", () => {
      const subs: UnifiedSubscription[] = [
        {
          id: "1",
          name: "Monthly",
          cost: 10,
          currency: "USD",
          billingCycle: "monthly",
          nextBillingDate: Date.now(),
          isActive: true,
          paymentMethodId: "pm-1",
          category: "Streaming",
        },
        {
          id: "2",
          name: "Yearly",
          cost: 120,
          currency: "USD",
          billingCycle: "yearly",
          nextBillingDate: Date.now(),
          isActive: true,
          paymentMethodId: "pm-1",
          category: "Software",
        },
      ];

      const result = calculateTotalCosts(subs);

      expect(result.USD).toBe(20); // 10 + (120/12)
    });

    test("ignores inactive subscriptions", () => {
      const subs: UnifiedSubscription[] = [
        {
          id: "1",
          name: "Active",
          cost: 10,
          currency: "USD",
          billingCycle: "monthly",
          nextBillingDate: Date.now(),
          isActive: true,
          paymentMethodId: "pm-1",
          category: "Streaming",
        },
        {
          id: "2",
          name: "Inactive",
          cost: 100,
          currency: "USD",
          billingCycle: "monthly",
          nextBillingDate: Date.now(),
          isActive: false,
          paymentMethodId: "pm-1",
          category: "Software",
        },
      ];

      const result = calculateTotalCosts(subs);

      expect(result.USD).toBe(10);
    });

    test("returns empty object for no subscriptions", () => {
      const result = calculateTotalCosts([]);

      expect(Object.keys(result).length).toBe(0);
    });
  });
});

describe("Upcoming Bills", () => {
  describe("getUpcomingBills", () => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    const subs: UnifiedSubscription[] = [
      {
        id: "1",
        name: "Due Tomorrow",
        cost: 10,
        currency: "USD",
        billingCycle: "monthly",
        nextBillingDate: now + oneDay,
        isActive: true,
        paymentMethodId: "pm-1",
        category: "Streaming",
      },
      {
        id: "2",
        name: "Due in 2 weeks",
        cost: 15,
        currency: "USD",
        billingCycle: "monthly",
        nextBillingDate: now + 14 * oneDay,
        isActive: true,
        paymentMethodId: "pm-1",
        category: "Software",
      },
      {
        id: "3",
        name: "Due in 60 days",
        cost: 20,
        currency: "USD",
        billingCycle: "monthly",
        nextBillingDate: now + 60 * oneDay,
        isActive: true,
        paymentMethodId: "pm-1",
        category: "Gaming",
      },
      {
        id: "4",
        name: "Inactive",
        cost: 5,
        currency: "USD",
        billingCycle: "monthly",
        nextBillingDate: now + oneDay,
        isActive: false,
        paymentMethodId: "pm-1",
        category: "Music",
      },
    ];

    test("returns bills within default 30 day window", () => {
      const result = getUpcomingBills(subs);

      expect(result.length).toBe(2);
      expect(result.find((sub) => sub.name === "Due Tomorrow")).toBeDefined();
      expect(result.find((sub) => sub.name === "Due in 2 weeks")).toBeDefined();
    });

    test("excludes inactive subscriptions", () => {
      const result = getUpcomingBills(subs);

      expect(result.find((sub) => sub.name === "Inactive")).toBeUndefined();
    });

    test("respects custom day window", () => {
      const result = getUpcomingBills(subs, 7);

      expect(result.length).toBe(1);
      expect(result[0].name).toBe("Due Tomorrow");
    });

    test("sorts by nextBillingDate ascending", () => {
      const result = getUpcomingBills(subs);

      for (let i = 1; i < result.length; i++) {
        expect(result[i].nextBillingDate).toBeGreaterThanOrEqual(result[i - 1].nextBillingDate);
      }
    });

    test("returns empty array when no upcoming bills", () => {
      const futureSubs = subs.map((sub) => ({
        ...sub,
        nextBillingDate: now + 100 * oneDay,
      }));

      const result = getUpcomingBills(futureSubs, 30);

      expect(result.length).toBe(0);
    });
  });
});

describe("Merge Subscriptions", () => {
  describe("mergeSubscriptions", () => {
    const owned: Subscription[] = [
      {
        id: "own-1",
        userId: "user-1",
        name: "Netflix",
        cost: 15,
        currency: "USD",
        billingCycle: "monthly",
        nextBillingDate: Date.now(),
        isActive: true,
        paymentMethodId: "pm-1",
        category: "Streaming",
      },
    ];

    const shared: SharedSubscription[] = [
      {
        id: "share-1",
        userId: "owner-1",
        name: "Shared Spotify",
        cost: 10,
        currency: "USD",
        billingCycle: "monthly",
        nextBillingDate: Date.now(),
        isActive: true,
        paymentMethodId: "pm-1",
        category: "Music",
        isSharedWithMe: true,
        shareId: "s-1",
        ownerName: "Friend",
        isHidden: false,
      },
      {
        id: "share-2",
        userId: "owner-2",
        name: "Hidden Share",
        cost: 20,
        currency: "USD",
        billingCycle: "monthly",
        nextBillingDate: Date.now(),
        isActive: true,
        paymentMethodId: "pm-1",
        category: "Gaming",
        isSharedWithMe: true,
        shareId: "s-2",
        ownerName: "Other",
        isHidden: true,
      },
    ];

    test("combines owned and visible shared subscriptions", () => {
      const result = mergeSubscriptions(owned, shared, false);

      expect(result.length).toBe(2);
      expect(result.find((sub) => sub.name === "Netflix")).toBeDefined();
      expect(result.find((sub) => sub.name === "Shared Spotify")).toBeDefined();
    });

    test("excludes hidden shared by default", () => {
      const result = mergeSubscriptions(owned, shared, false);

      expect(result.find((sub) => sub.name === "Hidden Share")).toBeUndefined();
    });

    test("includes hidden shared when requested", () => {
      const result = mergeSubscriptions(owned, shared, true);

      expect(result.length).toBe(3);
      expect(result.find((sub) => sub.name === "Hidden Share")).toBeDefined();
    });

    test("handles empty owned list", () => {
      const result = mergeSubscriptions([], shared, false);

      expect(result.length).toBe(1);
    });

    test("handles empty shared list", () => {
      const result = mergeSubscriptions(owned, [], false);

      expect(result.length).toBe(1);
    });

    test("handles both empty", () => {
      const result = mergeSubscriptions([], [], false);

      expect(result.length).toBe(0);
    });
  });
});

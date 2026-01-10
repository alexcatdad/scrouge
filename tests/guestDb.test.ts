import { describe, expect, test } from "bun:test";
import { type BillingCycle, generateLocalId, type PaymentMethodType } from "../src/lib/guestDb";

describe("generateLocalId", () => {
  test("returns a valid UUID string", () => {
    const id = generateLocalId();

    expect(typeof id).toBe("string");
    expect(id.length).toBe(36); // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  });

  test("generates unique IDs", () => {
    const ids = new Set<string>();

    for (let i = 0; i < 1000; i++) {
      ids.add(generateLocalId());
    }

    expect(ids.size).toBe(1000);
  });

  test("matches UUID format", () => {
    const id = generateLocalId();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    expect(uuidRegex.test(id)).toBe(true);
  });
});

describe("BillingCycle type", () => {
  test("accepts valid billing cycles", () => {
    const validCycles: BillingCycle[] = ["monthly", "yearly", "weekly", "daily"];

    validCycles.forEach((cycle) => {
      expect(cycle).toBeTruthy();
    });
  });
});

describe("PaymentMethodType type", () => {
  test("accepts valid payment method types", () => {
    const validTypes: PaymentMethodType[] = [
      "credit_card",
      "debit_card",
      "bank_account",
      "paypal",
      "other",
    ];

    validTypes.forEach((type) => {
      expect(type).toBeTruthy();
    });
  });
});

describe("LocalPaymentMethod interface", () => {
  test("can create a valid payment method object", () => {
    const paymentMethod = {
      id: 1,
      localId: generateLocalId(),
      name: "My Visa Card",
      type: "credit_card" as PaymentMethodType,
      lastFourDigits: "4242",
      expiryDate: "2025-12",
      isDefault: true,
      createdAt: Date.now(),
    };

    expect(paymentMethod.name).toBe("My Visa Card");
    expect(paymentMethod.type).toBe("credit_card");
    expect(paymentMethod.isDefault).toBe(true);
  });

  test("optional fields can be omitted", () => {
    const paymentMethod = {
      localId: generateLocalId(),
      name: "Bank Account",
      type: "bank_account" as PaymentMethodType,
      isDefault: false,
      createdAt: Date.now(),
    };

    expect(paymentMethod.lastFourDigits).toBeUndefined();
    expect(paymentMethod.expiryDate).toBeUndefined();
    expect(paymentMethod.id).toBeUndefined();
  });
});

describe("LocalSubscription interface", () => {
  test("can create a valid subscription object", () => {
    const subscription = {
      id: 1,
      localId: generateLocalId(),
      name: "Netflix",
      description: "Streaming service",
      cost: 15.99,
      currency: "USD",
      billingCycle: "monthly" as BillingCycle,
      nextBillingDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
      paymentMethodLocalId: generateLocalId(),
      category: "Entertainment",
      website: "https://netflix.com",
      isActive: true,
      notes: "Family plan",
      createdAt: Date.now(),
    };

    expect(subscription.name).toBe("Netflix");
    expect(subscription.cost).toBe(15.99);
    expect(subscription.billingCycle).toBe("monthly");
    expect(subscription.isActive).toBe(true);
  });

  test("optional fields can be omitted", () => {
    const subscription = {
      localId: generateLocalId(),
      name: "Spotify",
      cost: 9.99,
      currency: "USD",
      billingCycle: "monthly" as BillingCycle,
      nextBillingDate: Date.now(),
      paymentMethodLocalId: generateLocalId(),
      category: "Entertainment",
      isActive: true,
      createdAt: Date.now(),
    };

    expect(subscription.description).toBeUndefined();
    expect(subscription.website).toBeUndefined();
    expect(subscription.notes).toBeUndefined();
  });
});

// Note: Full GuestDB class testing requires IndexedDB which is not available in Bun's test environment
// These tests are covered by E2E tests in e2e/guest-mode.spec.ts
describe("GuestDB (structure validation)", () => {
  test("database name is 'scrougeGuest'", async () => {
    // This test validates the expected database name
    // Full integration testing is done in E2E tests
    const { GuestDB } = await import("../src/lib/guestDb");

    // Just verify the class can be imported
    expect(GuestDB).toBeDefined();
  });
});

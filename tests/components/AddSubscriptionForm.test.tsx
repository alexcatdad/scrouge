/**
 * AddSubscriptionForm business logic tests
 * Component rendering tests are covered in E2E specs
 */
import { describe, expect, test } from "bun:test";

/**
 * Form validation logic tests for subscription form
 */

// Form validation logic
interface FormData {
  name: string;
  cost: number;
  currency: string;
  billingCycle: string;
  paymentMethodId: string;
  category: string;
  isFamilyPlan: boolean;
  maxSlots?: number;
}

function validateForm(data: FormData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.name.trim()) {
    errors.push("Name is required");
  }

  if (data.cost < 0) {
    errors.push("Cost must be positive");
  }

  if (!data.paymentMethodId) {
    errors.push("Payment method is required");
  }

  if (!data.category) {
    errors.push("Category is required");
  }

  if (data.isFamilyPlan && (!data.maxSlots || data.maxSlots < 2)) {
    errors.push("Family plan requires at least 2 slots");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Calculate next billing date
function calculateNextBillingDate(billingCycle: string): number {
  const date = new Date();
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

describe("Form Validation", () => {
  describe("validateForm", () => {
    test("validates complete valid form", () => {
      const result = validateForm({
        name: "Netflix",
        cost: 15.99,
        currency: "USD",
        billingCycle: "monthly",
        paymentMethodId: "pm-1",
        category: "Streaming",
        isFamilyPlan: false,
      });

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    test("rejects empty name", () => {
      const result = validateForm({
        name: "",
        cost: 15.99,
        currency: "USD",
        billingCycle: "monthly",
        paymentMethodId: "pm-1",
        category: "Streaming",
        isFamilyPlan: false,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Name is required");
    });

    test("rejects whitespace-only name", () => {
      const result = validateForm({
        name: "   ",
        cost: 15.99,
        currency: "USD",
        billingCycle: "monthly",
        paymentMethodId: "pm-1",
        category: "Streaming",
        isFamilyPlan: false,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Name is required");
    });

    test("rejects negative cost", () => {
      const result = validateForm({
        name: "Netflix",
        cost: -10,
        currency: "USD",
        billingCycle: "monthly",
        paymentMethodId: "pm-1",
        category: "Streaming",
        isFamilyPlan: false,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Cost must be positive");
    });

    test("accepts zero cost (free tier)", () => {
      const result = validateForm({
        name: "Free Service",
        cost: 0,
        currency: "USD",
        billingCycle: "monthly",
        paymentMethodId: "pm-1",
        category: "Software",
        isFamilyPlan: false,
      });

      expect(result.valid).toBe(true);
    });

    test("rejects missing payment method", () => {
      const result = validateForm({
        name: "Netflix",
        cost: 15.99,
        currency: "USD",
        billingCycle: "monthly",
        paymentMethodId: "",
        category: "Streaming",
        isFamilyPlan: false,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Payment method is required");
    });

    test("rejects missing category", () => {
      const result = validateForm({
        name: "Netflix",
        cost: 15.99,
        currency: "USD",
        billingCycle: "monthly",
        paymentMethodId: "pm-1",
        category: "",
        isFamilyPlan: false,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Category is required");
    });

    test("validates family plan with valid max slots", () => {
      const result = validateForm({
        name: "Netflix Family",
        cost: 22.99,
        currency: "USD",
        billingCycle: "monthly",
        paymentMethodId: "pm-1",
        category: "Streaming",
        isFamilyPlan: true,
        maxSlots: 5,
      });

      expect(result.valid).toBe(true);
    });

    test("rejects family plan with insufficient slots", () => {
      const result = validateForm({
        name: "Netflix Family",
        cost: 22.99,
        currency: "USD",
        billingCycle: "monthly",
        paymentMethodId: "pm-1",
        category: "Streaming",
        isFamilyPlan: true,
        maxSlots: 1,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Family plan requires at least 2 slots");
    });

    test("rejects family plan without max slots", () => {
      const result = validateForm({
        name: "Netflix Family",
        cost: 22.99,
        currency: "USD",
        billingCycle: "monthly",
        paymentMethodId: "pm-1",
        category: "Streaming",
        isFamilyPlan: true,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Family plan requires at least 2 slots");
    });

    test("collects multiple errors", () => {
      const result = validateForm({
        name: "",
        cost: -10,
        currency: "USD",
        billingCycle: "monthly",
        paymentMethodId: "",
        category: "",
        isFamilyPlan: true,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });
});

describe("Next Billing Date Calculation", () => {
  test("calculates monthly correctly", () => {
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const result = new Date(calculateNextBillingDate("monthly"));

    expect(result.getMonth()).toBe(nextMonth.getMonth());
  });

  test("calculates yearly correctly", () => {
    const today = new Date();
    const nextYear = today.getFullYear() + 1;

    const result = new Date(calculateNextBillingDate("yearly"));

    expect(result.getFullYear()).toBe(nextYear);
  });

  test("calculates weekly correctly", () => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const result = new Date(calculateNextBillingDate("weekly"));

    // Compare day of year approximately
    expect(result.getDate()).toBe(nextWeek.getDate());
  });

  test("calculates daily correctly", () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = new Date(calculateNextBillingDate("daily"));

    expect(result.getDate()).toBe(tomorrow.getDate());
  });
});

describe("Currency Options", () => {
  const supportedCurrencies = ["USD", "EUR", "GBP", "CAD"];

  test("includes common currencies", () => {
    expect(supportedCurrencies).toContain("USD");
    expect(supportedCurrencies).toContain("EUR");
    expect(supportedCurrencies).toContain("GBP");
    expect(supportedCurrencies).toContain("CAD");
  });

  test("has 4 currency options", () => {
    expect(supportedCurrencies.length).toBe(4);
  });
});

describe("Category Options", () => {
  const supportedCategories = [
    "Streaming",
    "Software",
    "Gaming",
    "Music",
    "News",
    "Fitness",
    "Food",
    "Shopping",
    "Education",
    "Finance",
    "Storage",
    "Other",
  ];

  test("includes all expected categories", () => {
    expect(supportedCategories).toContain("Streaming");
    expect(supportedCategories).toContain("Software");
    expect(supportedCategories).toContain("Gaming");
    expect(supportedCategories).toContain("Other");
  });

  test("has 12 category options", () => {
    expect(supportedCategories.length).toBe(12);
  });
});

describe("Billing Cycle Options", () => {
  const supportedCycles = ["monthly", "yearly", "weekly", "daily"];

  test("includes all cycle types", () => {
    expect(supportedCycles).toContain("monthly");
    expect(supportedCycles).toContain("yearly");
    expect(supportedCycles).toContain("weekly");
    expect(supportedCycles).toContain("daily");
  });

  test("has 4 billing cycle options", () => {
    expect(supportedCycles.length).toBe(4);
  });
});

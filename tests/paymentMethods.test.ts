import { describe, expect, test } from "bun:test";

/**
 * Payment Methods business logic tests
 * Tests the core validations and logic used in payment method management
 */

// Payment method types
type PaymentMethodType = "credit_card" | "debit_card" | "bank_account" | "paypal" | "other";

interface PaymentMethod {
  id: string;
  userId: string;
  name: string;
  type: PaymentMethodType;
  lastFourDigits?: string;
  expiryDate?: string;
  isDefault: boolean;
}

// Helper to manage default payment method logic
function setDefaultPaymentMethod(methods: PaymentMethod[], newDefaultId: string): PaymentMethod[] {
  return methods.map((method) => ({
    ...method,
    isDefault: method.id === newDefaultId,
  }));
}

// Helper to check if payment method can be deleted
function canDeletePaymentMethod(
  paymentMethodId: string,
  subscriptions: Array<{ paymentMethodId: string }>,
): boolean {
  return !subscriptions.some((sub) => sub.paymentMethodId === paymentMethodId);
}

// Helper to validate last four digits
function isValidLastFourDigits(digits: string | undefined): boolean {
  if (!digits) return true; // Optional field
  return /^\d{4}$/.test(digits);
}

// Helper to validate expiry date format
function isValidExpiryDate(date: string | undefined): boolean {
  if (!date) return true; // Optional field
  // Expected format: MM/YYYY or YYYY-MM
  return /^(0[1-9]|1[0-2])\/\d{4}$/.test(date) || /^\d{4}-(0[1-9]|1[0-2])$/.test(date);
}

describe("Payment Method Business Logic", () => {
  describe("setDefaultPaymentMethod", () => {
    test("sets only one method as default", () => {
      const methods: PaymentMethod[] = [
        { id: "1", userId: "u1", name: "Card 1", type: "credit_card", isDefault: true },
        { id: "2", userId: "u1", name: "Card 2", type: "credit_card", isDefault: false },
        { id: "3", userId: "u1", name: "Card 3", type: "debit_card", isDefault: false },
      ];

      const updated = setDefaultPaymentMethod(methods, "2");

      expect(updated.filter((m) => m.isDefault).length).toBe(1);
      expect(updated.find((m) => m.id === "2")?.isDefault).toBe(true);
      expect(updated.find((m) => m.id === "1")?.isDefault).toBe(false);
    });

    test("unsets previous default", () => {
      const methods: PaymentMethod[] = [
        { id: "1", userId: "u1", name: "Card 1", type: "credit_card", isDefault: true },
        { id: "2", userId: "u1", name: "Card 2", type: "credit_card", isDefault: false },
      ];

      const updated = setDefaultPaymentMethod(methods, "2");

      expect(updated.find((m) => m.id === "1")?.isDefault).toBe(false);
    });

    test("handles setting same method as default (idempotent)", () => {
      const methods: PaymentMethod[] = [
        { id: "1", userId: "u1", name: "Card 1", type: "credit_card", isDefault: true },
      ];

      const updated = setDefaultPaymentMethod(methods, "1");

      expect(updated[0].isDefault).toBe(true);
    });

    test("handles empty array", () => {
      const updated = setDefaultPaymentMethod([], "1");
      expect(updated.length).toBe(0);
    });

    test("handles non-existent ID (sets all to false)", () => {
      const methods: PaymentMethod[] = [
        { id: "1", userId: "u1", name: "Card 1", type: "credit_card", isDefault: true },
      ];

      const updated = setDefaultPaymentMethod(methods, "999");

      expect(updated[0].isDefault).toBe(false);
    });
  });

  describe("canDeletePaymentMethod", () => {
    test("allows deletion when no subscriptions use it", () => {
      const subscriptions = [{ paymentMethodId: "pm-2" }, { paymentMethodId: "pm-3" }];

      expect(canDeletePaymentMethod("pm-1", subscriptions)).toBe(true);
    });

    test("prevents deletion when subscription uses it", () => {
      const subscriptions = [{ paymentMethodId: "pm-1" }, { paymentMethodId: "pm-2" }];

      expect(canDeletePaymentMethod("pm-1", subscriptions)).toBe(false);
    });

    test("prevents deletion when multiple subscriptions use it", () => {
      const subscriptions = [
        { paymentMethodId: "pm-1" },
        { paymentMethodId: "pm-1" },
        { paymentMethodId: "pm-2" },
      ];

      expect(canDeletePaymentMethod("pm-1", subscriptions)).toBe(false);
    });

    test("allows deletion with empty subscriptions array", () => {
      expect(canDeletePaymentMethod("pm-1", [])).toBe(true);
    });
  });

  describe("isValidLastFourDigits", () => {
    test("accepts valid 4-digit strings", () => {
      expect(isValidLastFourDigits("1234")).toBe(true);
      expect(isValidLastFourDigits("0000")).toBe(true);
      expect(isValidLastFourDigits("9999")).toBe(true);
    });

    test("accepts undefined (optional field)", () => {
      expect(isValidLastFourDigits(undefined)).toBe(true);
    });

    test("rejects non-digit characters", () => {
      expect(isValidLastFourDigits("123a")).toBe(false);
      expect(isValidLastFourDigits("abcd")).toBe(false);
      expect(isValidLastFourDigits("12-4")).toBe(false);
    });

    test("rejects wrong length", () => {
      expect(isValidLastFourDigits("123")).toBe(false);
      expect(isValidLastFourDigits("12345")).toBe(false);
      // Empty string is considered valid (optional field)
    });

    test("rejects strings with spaces", () => {
      expect(isValidLastFourDigits("1 34")).toBe(false);
      expect(isValidLastFourDigits(" 234")).toBe(false);
    });
  });

  describe("isValidExpiryDate", () => {
    test("accepts MM/YYYY format", () => {
      expect(isValidExpiryDate("01/2025")).toBe(true);
      expect(isValidExpiryDate("12/2030")).toBe(true);
    });

    test("accepts YYYY-MM format", () => {
      expect(isValidExpiryDate("2025-01")).toBe(true);
      expect(isValidExpiryDate("2030-12")).toBe(true);
    });

    test("accepts undefined (optional field)", () => {
      expect(isValidExpiryDate(undefined)).toBe(true);
    });

    test("rejects invalid months", () => {
      expect(isValidExpiryDate("00/2025")).toBe(false);
      expect(isValidExpiryDate("13/2025")).toBe(false);
      expect(isValidExpiryDate("2025-00")).toBe(false);
      expect(isValidExpiryDate("2025-13")).toBe(false);
    });

    test("rejects incorrect formats", () => {
      expect(isValidExpiryDate("2025/01")).toBe(false);
      expect(isValidExpiryDate("01-2025")).toBe(false);
      expect(isValidExpiryDate("1/25")).toBe(false);
    });
  });
});

describe("Payment Method Type Validation", () => {
  const validTypes: PaymentMethodType[] = [
    "credit_card",
    "debit_card",
    "bank_account",
    "paypal",
    "other",
  ];

  test("recognizes all valid types", () => {
    for (const type of validTypes) {
      expect(validTypes.includes(type)).toBe(true);
    }
  });

  test("has exactly 5 valid types", () => {
    expect(validTypes.length).toBe(5);
  });

  describe("Type-specific field requirements", () => {
    test("credit_card typically has lastFourDigits and expiryDate", () => {
      const card: PaymentMethod = {
        id: "1",
        userId: "u1",
        name: "Visa ending 1234",
        type: "credit_card",
        lastFourDigits: "1234",
        expiryDate: "12/2025",
        isDefault: true,
      };

      expect(card.lastFourDigits).toBeDefined();
      expect(card.expiryDate).toBeDefined();
    });

    test("bank_account may not have lastFourDigits", () => {
      const bank: PaymentMethod = {
        id: "2",
        userId: "u1",
        name: "Chase Checking",
        type: "bank_account",
        isDefault: false,
      };

      expect(bank.lastFourDigits).toBeUndefined();
    });

    test("paypal may only have name", () => {
      const paypal: PaymentMethod = {
        id: "3",
        userId: "u1",
        name: "PayPal Account",
        type: "paypal",
        isDefault: false,
      };

      expect(paypal.name).toBeDefined();
      expect(paypal.lastFourDigits).toBeUndefined();
      expect(paypal.expiryDate).toBeUndefined();
    });
  });
});

describe("Payment Method Authorization", () => {
  // Test ownership validation logic
  function userOwnsPaymentMethod(userId: string, paymentMethod: PaymentMethod | null): boolean {
    if (!paymentMethod) return false;
    return paymentMethod.userId === userId;
  }

  test("returns true when user owns payment method", () => {
    const pm: PaymentMethod = {
      id: "1",
      userId: "user-123",
      name: "My Card",
      type: "credit_card",
      isDefault: true,
    };

    expect(userOwnsPaymentMethod("user-123", pm)).toBe(true);
  });

  test("returns false when user does not own payment method", () => {
    const pm: PaymentMethod = {
      id: "1",
      userId: "user-123",
      name: "Their Card",
      type: "credit_card",
      isDefault: true,
    };

    expect(userOwnsPaymentMethod("user-456", pm)).toBe(false);
  });

  test("returns false for null payment method", () => {
    expect(userOwnsPaymentMethod("user-123", null)).toBe(false);
  });
});

describe("Default Payment Method Selection", () => {
  // Logic for auto-selecting default payment method
  function getDefaultOrFirst(methods: PaymentMethod[]): PaymentMethod | null {
    if (methods.length === 0) return null;
    const defaultMethod = methods.find((m) => m.isDefault);
    return defaultMethod || methods[0];
  }

  test("returns default method when available", () => {
    const methods: PaymentMethod[] = [
      { id: "1", userId: "u1", name: "Card 1", type: "credit_card", isDefault: false },
      { id: "2", userId: "u1", name: "Card 2", type: "credit_card", isDefault: true },
      { id: "3", userId: "u1", name: "Card 3", type: "debit_card", isDefault: false },
    ];

    const selected = getDefaultOrFirst(methods);
    expect(selected?.id).toBe("2");
  });

  test("returns first method when no default exists", () => {
    const methods: PaymentMethod[] = [
      { id: "1", userId: "u1", name: "Card 1", type: "credit_card", isDefault: false },
      { id: "2", userId: "u1", name: "Card 2", type: "credit_card", isDefault: false },
    ];

    const selected = getDefaultOrFirst(methods);
    expect(selected?.id).toBe("1");
  });

  test("returns null for empty array", () => {
    const selected = getDefaultOrFirst([]);
    expect(selected).toBeNull();
  });

  test("returns single method even if not default", () => {
    const methods: PaymentMethod[] = [
      { id: "1", userId: "u1", name: "Card 1", type: "credit_card", isDefault: false },
    ];

    const selected = getDefaultOrFirst(methods);
    expect(selected?.id).toBe("1");
  });
});

describe("Payment Method Display Formatting", () => {
  // Helper for display name formatting
  function formatPaymentMethodName(method: PaymentMethod): string {
    const typeLabels: Record<PaymentMethodType, string> = {
      credit_card: "Credit Card",
      debit_card: "Debit Card",
      bank_account: "Bank Account",
      paypal: "PayPal",
      other: "Other",
    };

    const typeLabel = typeLabels[method.type];
    if (method.lastFourDigits) {
      return `${method.name} (${typeLabel} •••• ${method.lastFourDigits})`;
    }
    return `${method.name} (${typeLabel})`;
  }

  test("formats with last four digits", () => {
    const method: PaymentMethod = {
      id: "1",
      userId: "u1",
      name: "Chase Visa",
      type: "credit_card",
      lastFourDigits: "4242",
      isDefault: true,
    };

    expect(formatPaymentMethodName(method)).toBe("Chase Visa (Credit Card •••• 4242)");
  });

  test("formats without last four digits", () => {
    const method: PaymentMethod = {
      id: "2",
      userId: "u1",
      name: "My PayPal",
      type: "paypal",
      isDefault: false,
    };

    expect(formatPaymentMethodName(method)).toBe("My PayPal (PayPal)");
  });

  test("formats all payment types correctly", () => {
    const types: PaymentMethodType[] = [
      "credit_card",
      "debit_card",
      "bank_account",
      "paypal",
      "other",
    ];
    const expectedLabels = ["Credit Card", "Debit Card", "Bank Account", "PayPal", "Other"];

    types.forEach((type, index) => {
      const method: PaymentMethod = {
        id: "1",
        userId: "u1",
        name: "Test",
        type,
        isDefault: false,
      };
      expect(formatPaymentMethodName(method)).toContain(expectedLabels[index]);
    });
  });
});

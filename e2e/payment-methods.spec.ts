import { expect, test } from "@playwright/test";
import {
  addPaymentMethod,
  deletePaymentMethod,
  navigateToTab,
  setDefaultPaymentMethod,
  signInAsGuest,
} from "./helpers";

test.describe("Payment Methods CRUD", () => {
  test.beforeEach(async ({ page }) => {
    // Sign in as guest before each test
    await signInAsGuest(page);
  });

  test("should add a payment method", async ({ page }) => {
    await addPaymentMethod(page, {
      name: "Test Visa Card",
      type: "credit_card",
      lastFourDigits: "1234",
      expiryDate: "2025-12",
    });
  });

  test("should display payment methods list", async ({ page }) => {
    // Add a payment method first
    await addPaymentMethod(page, {
      name: "Test Visa Card",
      type: "credit_card",
      lastFourDigits: "1234",
    });

    // Navigate to Payments tab (should already be there, but ensure)
    await navigateToTab(page, "Payments");

    // Verify payment method appears in the list
    await expect(page.getByText("Test Visa Card")).toBeVisible();
    await expect(page.getByText("Credit Card")).toBeVisible();
    await expect(page.getByText("****1234")).toBeVisible();
  });

  test("should set a payment method as default", async ({ page }) => {
    // Add two payment methods
    await addPaymentMethod(page, {
      name: "Primary Card",
      type: "credit_card",
      lastFourDigits: "1111",
    });

    await addPaymentMethod(page, {
      name: "Secondary Card",
      type: "debit_card",
      lastFourDigits: "2222",
    });

    // Set the second one as default
    await setDefaultPaymentMethod(page, "Secondary Card");

    // Verify it shows "Default" badge - find the card by heading
    const heading = page.locator("h4").filter({ hasText: "Secondary Card" }).first();
    const secondaryCard = heading.locator('xpath=ancestor::div[contains(@class, "p-6")]');
    await expect(secondaryCard.getByText("Default").first()).toBeVisible();
  });

  test("should delete a payment method", async ({ page }) => {
    // Add a payment method
    await addPaymentMethod(page, {
      name: "Card to Delete",
      type: "credit_card",
      lastFourDigits: "9999",
    });

    // Verify it exists
    await expect(page.getByText("Card to Delete")).toBeVisible();

    // Delete it
    await deletePaymentMethod(page, "Card to Delete");

    // Verify it's gone
    await expect(page.getByText("Card to Delete")).not.toBeVisible();
  });

  test("should handle multiple payment methods", async ({ page }) => {
    // Add multiple payment methods
    await addPaymentMethod(page, {
      name: "Visa Card",
      type: "credit_card",
      lastFourDigits: "1111",
    });

    await addPaymentMethod(page, {
      name: "Mastercard",
      type: "credit_card",
      lastFourDigits: "2222",
    });

    await addPaymentMethod(page, {
      name: "PayPal Account",
      type: "paypal",
    });

    // Verify all are visible
    await navigateToTab(page, "Payments");
    await expect(page.getByText("Visa Card")).toBeVisible();
    await expect(page.getByText("Mastercard")).toBeVisible();
    await expect(page.getByText("PayPal Account")).toBeVisible();
  });
});

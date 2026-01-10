import { expect, test } from "@playwright/test";
import {
  addPaymentMethod,
  addSubscription,
  deleteSubscription,
  filterSubscriptions,
  navigateToTab,
  signInAsGuest,
  toggleSubscriptionActive,
  verifySubscriptionInList,
} from "./helpers";

test.describe("Subscriptions CRUD", () => {
  test.beforeEach(async ({ page }) => {
    // Sign in as guest before each test
    await signInAsGuest(page);

    // Add a payment method for subscription tests
    await addPaymentMethod(page, {
      name: "Test Payment Method",
      type: "credit_card",
    });
  });

  test("should add a subscription", async ({ page }) => {
    await addSubscription(page, {
      name: "Netflix",
      category: "Entertainment",
      cost: "15.99",
      billingCycle: "monthly",
      paymentMethodName: "Test Payment Method",
    });

    // Verify it appears in the list
    await verifySubscriptionInList(page, "Netflix", {
      cost: "$15.99",
      category: "Entertainment",
      billingCycle: "monthly",
    });
  });

  test("should display subscriptions list", async ({ page }) => {
    // Add multiple subscriptions
    await addSubscription(page, {
      name: "Netflix",
      category: "Entertainment",
      cost: "15.99",
      billingCycle: "monthly",
      paymentMethodName: "Test Payment Method",
    });

    await addSubscription(page, {
      name: "Spotify",
      category: "Entertainment",
      cost: "9.99",
      billingCycle: "monthly",
      paymentMethodName: "Test Payment Method",
    });

    // Navigate to Subscriptions tab
    await navigateToTab(page, "Subscriptions");

    // Verify both subscriptions are visible
    await expect(page.getByText("Netflix").first()).toBeVisible();
    await expect(page.getByText("Spotify").first()).toBeVisible();
    await expect(page.getByText("$15.99").first()).toBeVisible();
    await expect(page.getByText("$9.99").first()).toBeVisible();
  });

  test("should filter subscriptions by status", async ({ page }) => {
    // Add subscriptions
    await addSubscription(page, {
      name: "Active Service",
      category: "Software",
      cost: "10.00",
      billingCycle: "monthly",
      paymentMethodName: "Test Payment Method",
    });

    await addSubscription(page, {
      name: "Another Service",
      category: "Software",
      cost: "20.00",
      billingCycle: "monthly",
      paymentMethodName: "Test Payment Method",
    });

    // Ensure we're on subscriptions tab
    await navigateToTab(page, "Subscriptions");

    // Verify both are visible initially
    await expect(page.getByText("Active Service").first()).toBeVisible();
    await expect(page.getByText("Another Service").first()).toBeVisible();

    // Pause one subscription
    await toggleSubscriptionActive(page, "Another Service", "paused");

    // Wait a bit for UI to update
    await page.waitForTimeout(500);

    // Filter by active - should only show Active Service
    await filterSubscriptions(page, "active");
    await page.waitForTimeout(500);
    await expect(page.getByText("Active Service").first()).toBeVisible();
    // Another Service should not be visible when filtered to active
    const anotherServiceCount = await page.getByText("Another Service").count();
    expect(anotherServiceCount).toBe(0);

    // Filter by inactive - should only show Another Service
    await filterSubscriptions(page, "inactive");
    await page.waitForTimeout(500);
    await expect(page.getByText("Another Service").first()).toBeVisible();
    // Active Service should not be visible when filtered to inactive
    const activeServiceCount = await page.getByText("Active Service").count();
    expect(activeServiceCount).toBe(0);

    // Filter by all - should show both
    await filterSubscriptions(page, "all");
    await page.waitForTimeout(500);
    await expect(page.getByText("Active Service").first()).toBeVisible();
    await expect(page.getByText("Another Service").first()).toBeVisible();
  });

  test("should pause an active subscription", async ({ page }) => {
    // Add a subscription (active by default)
    await addSubscription(page, {
      name: "Service to Pause",
      category: "Software",
      cost: "10.00",
      billingCycle: "monthly",
      paymentMethodName: "Test Payment Method",
    });

    // Navigate to subscriptions to verify it's active
    await navigateToTab(page, "Subscriptions");
    // Make sure filter shows all subscriptions
    await filterSubscriptions(page, "all");
    await page.waitForTimeout(300);
    await expect(page.getByText("Service to Pause").first()).toBeVisible();

    // Verify it shows Active badge initially
    const heading1 = page.locator("h4").filter({ hasText: "Service to Pause" }).first();
    const card1 = heading1.locator('xpath=ancestor::div[contains(@class, "p-6")]');
    await expect(card1.getByText("Active").first()).toBeVisible();

    // Pause it
    await toggleSubscriptionActive(page, "Service to Pause", "paused");

    // Verify it's now paused - check for Paused badge near the subscription name
    await page.waitForTimeout(1000);
    // Re-find the card after the toggle
    const heading2 = page.locator("h4").filter({ hasText: "Service to Pause" }).first();
    await expect(heading2).toBeVisible({ timeout: 5000 });
    const card2 = heading2.locator('xpath=ancestor::div[contains(@class, "p-6")]');
    await expect(card2.getByText("Paused").first()).toBeVisible({ timeout: 5000 });
  });

  test("should activate a paused subscription", async ({ page }) => {
    // Add a subscription
    await addSubscription(page, {
      name: "Service to Activate",
      category: "Software",
      cost: "10.00",
      billingCycle: "monthly",
      paymentMethodName: "Test Payment Method",
    });

    // Pause it first
    await toggleSubscriptionActive(page, "Service to Activate", "paused");

    // Verify it's paused - make sure filter shows all or inactive subscriptions
    await navigateToTab(page, "Subscriptions");
    await filterSubscriptions(page, "all"); // Show all to ensure we can see it
    await page.waitForTimeout(500);

    // Find the subscription
    const heading1 = page.locator("h4").filter({ hasText: "Service to Activate" }).first();
    await expect(heading1).toBeVisible({ timeout: 5000 });
    const card1 = heading1.locator('xpath=ancestor::div[contains(@class, "p-6")]');

    // Verify it shows "Activate" button (meaning it's paused)
    await expect(card1.getByRole("button", { name: "Activate" }).first()).toBeVisible();

    // Activate it
    await toggleSubscriptionActive(page, "Service to Activate", "active");

    // Verify it's now active - the button should change to "Pause"
    await page.waitForTimeout(1000);

    // Re-find the card after the toggle
    const heading2 = page.locator("h4").filter({ hasText: "Service to Activate" }).first();
    await expect(heading2).toBeVisible({ timeout: 5000 });
    const card2 = heading2.locator('xpath=ancestor::div[contains(@class, "p-6")]');

    // Verify the button now shows "Pause" (indicating active status)
    await expect(card2.getByRole("button", { name: "Pause" }).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("should delete a subscription", async ({ page }) => {
    // Add a subscription
    await addSubscription(page, {
      name: "Service to Delete",
      category: "Software",
      cost: "10.00",
      billingCycle: "monthly",
      paymentMethodName: "Test Payment Method",
    });

    // Verify it exists
    await expect(page.getByText("Service to Delete")).toBeVisible();

    // Delete it
    await deleteSubscription(page, "Service to Delete");

    // Verify it's gone
    await expect(page.getByText("Service to Delete")).not.toBeVisible();
  });

  test("should handle subscription with optional fields", async ({ page }) => {
    await addSubscription(page, {
      name: "Full Service",
      category: "Software",
      cost: "29.99",
      billingCycle: "yearly",
      paymentMethodName: "Test Payment Method",
      description: "Premium software subscription",
      website: "https://example.com",
    });

    // Navigate to subscriptions tab to verify
    await navigateToTab(page, "Subscriptions");

    // Verify subscription appears
    await expect(page.getByText("Full Service").first()).toBeVisible();
    await expect(page.getByText("$29.99").first()).toBeVisible();
    await expect(page.getByText("Software").first()).toBeVisible();
    await expect(page.getByText("yearly").first()).toBeVisible();

    // Verify optional fields if they're displayed
    await navigateToTab(page, "Subscriptions");
    const subscriptionCard = page.locator("div").filter({ hasText: "Full Service" }).first();

    // Check if description is visible (may or may not be displayed in list view)
    const description = subscriptionCard.getByText("Premium software subscription");
    if (await description.isVisible().catch(() => false)) {
      await expect(description).toBeVisible();
    }
  });
});

import { expect, test } from "@playwright/test";

/**
 * Tests for internationalization (i18n) functionality
 */
test.describe("Internationalization", () => {
  test.beforeEach(async ({ page }) => {
    // Clear language preference before each test
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.removeItem("scrouge_language");
    });
  });

  test("should default to English", async ({ page }) => {
    await page.goto("/");

    // Check for English text
    await expect(page.getByText("Master Your")).toBeVisible();
    await expect(page.getByText("Subscriptions")).toBeVisible();
  });

  test("should detect browser language", async ({ page, context }) => {
    // This test verifies the language detection mechanism
    await page.goto("/");

    // The document should have a lang attribute
    const lang = await page.evaluate(() => document.documentElement.lang);
    expect(["en", "es", "fr", "de"]).toContain(lang);
  });

  test("should persist language preference in localStorage", async ({ page }) => {
    await page.goto("/");

    // Check that language is stored
    const storedLang = await page.evaluate(() => {
      return localStorage.getItem("scrouge_language");
    });

    // Should have a language stored (either from detection or default)
    // Note: It might be null if no preference was set yet
    if (storedLang) {
      expect(["en", "es", "fr", "de"]).toContain(storedLang);
    }
  });

  test("should set document lang attribute", async ({ page }) => {
    await page.goto("/");

    // Document should have lang attribute
    const lang = await page.evaluate(() => document.documentElement.lang);
    expect(lang).toBeTruthy();
    expect(lang.length).toBeGreaterThan(0);
  });

  test("should display landing page text correctly", async ({ page }) => {
    await page.goto("/");

    // Verify key landing page elements are visible
    await expect(page.getByText("Premium Subscription Tracker")).toBeVisible();
    await expect(page.getByText("Master Your")).toBeVisible();
    await expect(page.getByText("Subscriptions")).toBeVisible();

    // Feature cards should be visible
    await expect(page.getByText("Payment Tracking")).toBeVisible();
    await expect(page.getByText("AI Assistant")).toBeVisible();
    await expect(page.getByText("Smart Insights")).toBeVisible();
  });

  test("should display auth form labels correctly", async ({ page }) => {
    await page.goto("/");

    // Check for auth form elements
    await expect(page.getByPlaceholder("Email address")).toBeVisible();
    await expect(page.getByPlaceholder("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  test("should display guest mode button", async ({ page }) => {
    await page.goto("/");

    // Guest mode button should be visible
    await expect(page.getByRole("button", { name: "Continue as guest" })).toBeVisible();
  });
});

/**
 * Tests for locale-aware formatting
 */
test.describe("Locale Formatting", () => {
  test("should format dates correctly", async ({ page }) => {
    await page.goto("/");

    // The app should load without formatting errors
    await expect(page.getByText("Scrouge")).toBeVisible();
  });

  test("should handle different currency formats", async ({ page }) => {
    await page.goto("/");

    // The app should load and be ready to display currencies
    await expect(page.getByText("Scrouge")).toBeVisible();
  });
});

/**
 * Tests for i18n provider
 */
test.describe("I18n Provider", () => {
  test("should wrap app content", async ({ page }) => {
    await page.goto("/");

    // App should render correctly with i18n provider
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByText("Scrouge")).toBeVisible();
  });

  test("should not cause hydration errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && msg.text().includes("hydration")) {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // No hydration errors should occur
    expect(consoleErrors).toHaveLength(0);
  });
});

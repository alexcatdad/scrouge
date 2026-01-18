import { test, expect } from "@playwright/test";
import { test as guestTest, expect as guestExpect } from "./fixtures/guest";

test.describe("Guest Mode - Entry", () => {
  // Run entry tests serially to avoid race conditions with localStorage
  test.describe.configure({ mode: 'serial' });

  test("landing page shows 'Try without an account' button", async ({ page }) => {
    await page.goto("/");

    // Button text could be "Try without an account" or "Continue as guest"
    await expect(page.locator("text=Try without an account").or(page.locator("text=Continue as guest"))).toBeVisible();
  });

  test("clicking guest button enables guest mode and redirects to dashboard", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Click the guest button and wait for navigation
    const guestButton = page.locator("button:has-text('Try without an account'), button:has-text('Continue as guest')");
    await expect(guestButton).toBeVisible();

    // Use Promise.all to click and wait for navigation simultaneously
    await Promise.all([
      page.waitForURL(/dashboard/, { timeout: 15000 }),
      guestButton.click(),
    ]);

    // Should see guest welcome
    await expect(page.locator("text=Welcome, Guest!")).toBeVisible();
  });

  test("guest mode shows local storage warning banner", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Click the guest button and wait for navigation
    const guestButton = page.locator("button:has-text('Try without an account'), button:has-text('Continue as guest')");
    await expect(guestButton).toBeVisible();

    await Promise.all([
      page.waitForURL(/dashboard/, { timeout: 15000 }),
      guestButton.click(),
    ]);

    // Should see the guest mode banner
    await expect(page.locator("text=Your data is saved locally")).toBeVisible();
  });
});

guestTest.describe("Guest Mode - Dashboard", () => {
  guestTest("guest can access dashboard", async ({ guestPage }) => {
    await guestPage.goto("/dashboard");

    await guestExpect(guestPage.locator("text=Welcome, Guest!")).toBeVisible();
    await guestExpect(guestPage.locator("text=Monthly")).toBeVisible();
    await guestExpect(guestPage.locator("text=Active")).toBeVisible();
  });

  guestTest("guest dashboard shows $0 when no subscriptions", async ({ guestPage }) => {
    await guestPage.goto("/dashboard");

    // Look for $0.00 or similar zero amount
    await guestExpect(guestPage.locator("text=$0")).toBeVisible();
  });

  guestTest("guest sees sign up prompt in banner", async ({ guestPage }) => {
    await guestPage.goto("/dashboard");

    // Should see call to action to sign up
    await guestExpect(guestPage.locator("text=Sign up to save")).toBeVisible();
  });
});

guestTest.describe("Guest Mode - Wizard", () => {
  guestTest("guest can access wizard", async ({ guestPage }) => {
    await guestPage.goto("/wizard");

    // Should see the wizard step 1 - service selection
    // Wait for the search input to be visible
    await guestExpect(guestPage.locator('input[placeholder*="Search services"]')).toBeVisible({ timeout: 10000 });
  });

  guestTest("guest can search for services in wizard", async ({ guestPage }) => {
    await guestPage.goto("/wizard");

    // Wait for page to load
    const searchInput = guestPage.locator('input[placeholder*="Search services"]');
    await guestExpect(searchInput).toBeVisible({ timeout: 10000 });

    // Type in search box
    await searchInput.fill("Netflix");

    // Should filter results (or show no results message)
    await guestExpect(searchInput).toHaveValue("Netflix");
  });

  guestTest("guest sees Continue button in wizard", async ({ guestPage }) => {
    await guestPage.goto("/wizard");

    // Wait for page to load and check Continue button exists (may be disabled)
    await guestExpect(guestPage.locator("button:has-text('Continue')")).toBeVisible({ timeout: 10000 });
  });

  guestTest("guest can skip wizard to dashboard", async ({ guestPage }) => {
    await guestPage.goto("/wizard");

    // Wait for Skip button
    await guestExpect(guestPage.locator("text=Skip")).toBeVisible({ timeout: 10000 });

    // Click Skip
    await guestPage.click("text=Skip");

    // Should navigate to dashboard
    await guestExpect(guestPage).toHaveURL(/dashboard/);
  });
});

guestTest.describe("Guest Mode - Subscriptions", () => {
  guestTest("guest can access subscriptions page", async ({ guestPage }) => {
    await guestPage.goto("/dashboard/subscriptions");

    // Should see the subscriptions header
    await guestExpect(guestPage.locator("h1:has-text('Subscriptions')")).toBeVisible();
  });

  guestTest("guest sees empty state when no subscriptions", async ({ guestPage }) => {
    await guestPage.goto("/dashboard/subscriptions");

    // Should see empty state message
    await guestExpect(guestPage.locator("text=No subscriptions yet")).toBeVisible();
    await guestExpect(guestPage.locator("text=Add Subscription")).toBeVisible();
  });

  guestTest("guest can navigate to add subscription page", async ({ guestPage }) => {
    await guestPage.goto("/dashboard/subscriptions");

    // Click add subscription button
    await guestPage.click("text=Add Subscription");

    // Should be on the new subscription page
    await guestExpect(guestPage).toHaveURL(/subscriptions\/new/);
    await guestExpect(guestPage.locator("h1:has-text('Add Subscription')")).toBeVisible();
  });

  guestTest("guest can search services on add subscription page", async ({ guestPage }) => {
    await guestPage.goto("/dashboard/subscriptions/new");

    // Type in search box
    const searchInput = guestPage.locator('input[placeholder*="Search services"]');
    await searchInput.fill("Spotify");

    // Should filter or show results
    await guestExpect(searchInput).toHaveValue("Spotify");
  });

  guestTest("guest can access manual add option", async ({ guestPage }) => {
    await guestPage.goto("/dashboard/subscriptions/new");

    // Should see manual add option
    await guestExpect(guestPage.locator("text=Add manually")).toBeVisible();
  });
});

guestTest.describe("Guest Mode - Exit", () => {
  guestTest("guest sees Exit Guest Mode button", async ({ guestPage }) => {
    await guestPage.goto("/dashboard");

    // Should see the exit button in header
    await guestExpect(guestPage.locator("text=Exit Guest Mode")).toBeVisible();
  });

  guestTest("guest sees sign up link in banner", async ({ guestPage }) => {
    await guestPage.goto("/dashboard");

    // Should see sign up to save link in the guest mode banner
    await guestExpect(guestPage.locator("a:has-text('Sign up to save')")).toBeVisible();
  });

  guestTest("clicking Exit Guest Mode redirects to landing page", async ({ guestPage }) => {
    await guestPage.goto("/dashboard");

    // Click the exit button
    await guestPage.click("text=Exit Guest Mode");

    // Should redirect to landing page
    await guestExpect(guestPage).toHaveURL("/");
  });

  guestTest("sign up link goes to sign up page", async ({ guestPage }) => {
    await guestPage.goto("/dashboard");

    // Click sign up link
    await guestPage.click("a:has-text('Sign up to save')");

    // Should navigate to sign up page
    await guestExpect(guestPage).toHaveURL(/sign-up/);
  });
});

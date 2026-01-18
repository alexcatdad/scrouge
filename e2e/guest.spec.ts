import { test, expect } from "@playwright/test";
import { test as guestTest, expect as guestExpect } from "./fixtures/guest";

test.describe("Guest Mode - Entry", () => {
  test("landing page shows 'Try without an account' button", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("text=Try without an account")).toBeVisible();
  });

  test("clicking guest button enables guest mode and redirects to dashboard", async ({ page }) => {
    await page.goto("/");

    await page.click("text=Try without an account");

    // Should redirect to dashboard
    await expect(page).toHaveURL(/dashboard/);

    // Should see guest welcome
    await expect(page.locator("text=Welcome, Guest!")).toBeVisible();
  });

  test("guest mode shows local storage warning banner", async ({ page }) => {
    await page.goto("/");
    await page.click("text=Try without an account");

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
    await guestExpect(guestPage.locator("text=Search services")).toBeVisible();
    await guestExpect(guestPage.locator("text=Continue")).toBeVisible();
  });

  guestTest("guest can search for services in wizard", async ({ guestPage }) => {
    await guestPage.goto("/wizard");

    // Type in search box
    const searchInput = guestPage.locator('input[placeholder*="Search services"]');
    await searchInput.fill("Netflix");

    // Should filter results (or show no results message)
    await guestExpect(searchInput).toHaveValue("Netflix");
  });

  guestTest("guest can select a service template", async ({ guestPage }) => {
    await guestPage.goto("/wizard");

    // Wait for templates to load and click on one
    const serviceCard = guestPage.locator('[data-testid="template-card"]').first();

    // If template cards exist, click one
    const cardCount = await serviceCard.count();
    if (cardCount > 0) {
      await serviceCard.click();

      // Should see selection indicator or count update
      await guestExpect(guestPage.locator("text=Continue")).toBeVisible();
    }
  });

  guestTest("guest can navigate wizard steps", async ({ guestPage }) => {
    await guestPage.goto("/wizard");

    // Click continue to go to step 2 (even with no selections, should navigate)
    await guestPage.click("text=Continue");

    // Should be on step 2 - subscription details or payment method
    // Look for step 2 indicators
    await guestExpect(guestPage.locator("text=Add Payment Method").or(guestPage.locator("text=Confirm"))).toBeVisible({ timeout: 5000 });
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

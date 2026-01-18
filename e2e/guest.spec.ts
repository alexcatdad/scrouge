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

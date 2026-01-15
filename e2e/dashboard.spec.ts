import { test, expect } from "./fixtures/auth";

test.describe("Dashboard", () => {
	test("authenticated user sees dashboard", async ({ authenticatedPage }) => {
		await authenticatedPage.goto("/dashboard");

		// Should see welcome message
		await expect(authenticatedPage.locator("text=Welcome")).toBeVisible();

		// Should see Sign Out button
		await expect(authenticatedPage.locator("text=Sign Out")).toBeVisible();

		// Should see dashboard stats
		await expect(authenticatedPage.locator("text=Total Monthly")).toBeVisible();
		await expect(authenticatedPage.locator("text=Active Subscriptions")).toBeVisible();
	});

	test("unauthenticated user redirected to sign-in", async ({ page }) => {
		await page.goto("/dashboard");

		// Should redirect to sign-in
		await expect(page).toHaveURL(/sign-in/);
	});

	test("sign out clears auth and redirects", async ({ authenticatedPage }) => {
		await authenticatedPage.goto("/dashboard");

		// Click sign out
		await authenticatedPage.click("text=Sign Out");

		// Should redirect to sign-in
		await expect(authenticatedPage).toHaveURL(/sign-in/);
	});
});

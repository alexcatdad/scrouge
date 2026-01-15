import { test, expect } from "@playwright/test";

test.describe("Auth Flow", () => {
	test("landing page shows sign-in and get started links", async ({ page }) => {
		await page.goto("/");

		await expect(page.locator("text=Sign In").first()).toBeVisible();
		await expect(page.locator("text=Get Started")).toBeVisible();
	});

	test("sign-in page has email and password fields", async ({ page }) => {
		await page.goto("/sign-in");

		await expect(page.locator('input[type="email"]')).toBeVisible();
		await expect(page.locator('input[type="password"]')).toBeVisible();
		await expect(page.locator('button[type="submit"]')).toBeVisible();
	});

	test("sign-up page has registration form", async ({ page }) => {
		await page.goto("/sign-up");

		await expect(page.locator('input[type="email"]')).toBeVisible();
		// password + confirm password
		await expect(page.locator('input[type="password"]')).toHaveCount(2);
		await expect(page.locator('button[type="submit"]')).toBeVisible();
	});

	test("landing page has scrouge branding", async ({ page }) => {
		await page.goto("/");

		await expect(page.locator("text=Scrouge").first()).toBeVisible();
		await expect(page.locator("text=Take Control of Your")).toBeVisible();
		await expect(page.locator("text=Subscriptions")).toBeVisible();
	});
});

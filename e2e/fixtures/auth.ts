import { test as base, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

// Get Convex URL from environment (loaded via dotenv in playwright.config.ts)
const CONVEX_URL = process.env.PUBLIC_CONVEX_URL;
if (!CONVEX_URL) {
	throw new Error(
		"PUBLIC_CONVEX_URL environment variable is required for E2E tests. " +
		"Set it in .env.local or export it before running tests."
	);
}
const CONVEX_SITE_URL = CONVEX_URL.replace(".convex.cloud", ".convex.site");
const STORAGE_NAMESPACE = CONVEX_URL.replace(/[^a-zA-Z0-9]/g, "");

interface TestUser {
	email: string;
	tokens: {
		token: string;
		refreshToken: string;
	};
}

interface AuthFixtures {
	testUser: TestUser;
	authenticatedPage: Page;
}

export const test = base.extend<AuthFixtures>({
	// Create a test user with tokens
	testUser: async ({}, use, testInfo) => {
		const email = `e2e-${testInfo.testId}-${Date.now()}@test.local`;
		const password = "TestPassword123!";

		// Seed user via test endpoint
		const response = await fetch(`${CONVEX_SITE_URL}/api/test/seed-user`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, password, name: "E2E Test User" }),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Failed to seed test user: ${error}`);
		}

		const user: TestUser = await response.json();

		// Use the test user
		await use(user);

		// Cleanup after test
		await fetch(`${CONVEX_SITE_URL}/api/test/cleanup-user`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email }),
		});
	},

	// Page with auth tokens pre-injected
	authenticatedPage: async ({ page, testUser }, use) => {
		// Inject tokens into localStorage before any navigation
		await page.addInitScript(
			({ namespace, token, refreshToken }) => {
				localStorage.setItem(`__convexAuthJWT_${namespace}`, token);
				localStorage.setItem(`__convexAuthRefreshToken_${namespace}`, refreshToken);
			},
			{
				namespace: STORAGE_NAMESPACE,
				token: testUser.tokens.token,
				refreshToken: testUser.tokens.refreshToken,
			},
		);

		await use(page);
	},
});

export { expect };

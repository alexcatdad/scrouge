import { test as base, expect, collectCoverage } from "./coverage";
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

// Check if we're using a placeholder URL (no real Convex backend)
const IS_PLACEHOLDER_URL = CONVEX_URL.includes("placeholder");

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
		// Skip auth tests when using placeholder URL (no real Convex backend)
		if (IS_PLACEHOLDER_URL) {
			testInfo.skip(true, "Auth tests require a real Convex backend (using placeholder URL)");
			return;
		}

		const email = `e2e-${testInfo.testId}-${Date.now()}@test.local`;
		const password = "TestPassword123!";

		// Seed user via test endpoint
		let response: Response;
		try {
			response = await fetch(`${CONVEX_SITE_URL}/api/test/seed-user`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password, name: "E2E Test User" }),
			});
		} catch (fetchError) {
			const msg = fetchError instanceof Error ? fetchError.message : String(fetchError);
			testInfo.skip(true, `Test endpoint unavailable (fetch failed): ${msg}`);
			return;
		}

		if (response.status === 404) {
			testInfo.skip(true,
				"Test endpoint not available. Set CONVEX_IS_TEST=true in Convex dashboard environment variables."
			);
			return;
		}

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Failed to seed test user (${response.status}): ${error}`);
		}

		const user: TestUser = await response.json();

		// Use the test user
		await use(user);

		// Cleanup after test
		try {
			await fetch(`${CONVEX_SITE_URL}/api/test/cleanup-user`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email }),
			});
		} catch {
			// Ignore cleanup errors
		}
	},

	// Page with auth tokens pre-injected
	authenticatedPage: async ({ page, testUser }, use, testInfo) => {
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

		// Collect coverage
		await collectCoverage(page, testInfo.testId);
	},
});

export { expect };

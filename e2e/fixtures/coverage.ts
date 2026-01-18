import { test as base, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const coverageDir = path.join(process.cwd(), ".nyc_output");

// Ensure coverage directory exists at module load time
if (process.env.E2E_COVERAGE === "true" && !fs.existsSync(coverageDir)) {
	fs.mkdirSync(coverageDir, { recursive: true });
}

/**
 * Collect coverage from a page after test execution
 */
export async function collectCoverage(page: import("@playwright/test").Page, testId: string): Promise<void> {
	if (process.env.E2E_COVERAGE !== "true") {
		return;
	}

	try {
		const coverage = await page.evaluate(() => {
			// @ts-expect-error - __coverage__ is injected by Istanbul
			return window.__coverage__;
		});

		if (coverage) {
			const sanitizedId = testId.replace(/[^a-zA-Z0-9]/g, "_");
			const coverageFile = path.join(coverageDir, `coverage-${sanitizedId}-${Date.now()}.json`);
			fs.writeFileSync(coverageFile, JSON.stringify(coverage));
		}
	} catch {
		// Ignore coverage collection errors
	}
}

/**
 * Base test with automatic coverage collection
 */
export const test = base.extend({
	page: async ({ page }, use, testInfo) => {
		await use(page);
		await collectCoverage(page, testInfo.testId);
	},
});

export { expect };

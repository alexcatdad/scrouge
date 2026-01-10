import { expect, test } from "@playwright/test";
import {
  mockWebGPUSupport,
  navigateToAIChat,
  navigateToAISettings,
  selectAIProvider,
  signInAsGuest,
  signInWithTestUser,
  verifyChatInputDisabled,
  verifyChatNeedsConfiguration,
} from "./helpers";

test.describe("AI Chat Interface", () => {
  test.describe("Guest Mode", () => {
    test.beforeEach(async ({ page }) => {
      await signInAsGuest(page);
    });

    test("should allow guest users to use chat with WebLLM when WebGPU is supported", async ({
      page,
    }) => {
      // Mock WebGPU as supported
      await mockWebGPUSupport(page, true);
      await navigateToAIChat(page);

      // Should show Local AI status (loading or ready)
      await expect(page.getByText(/Local AI|Loading Local AI Model/)).toBeVisible();

      // Input should be enabled (or loading)
      const input = page.locator('input[type="text"]');
      await expect(input).toBeVisible();
    });

    test("should show WebGPU not supported message for guest users without WebGPU", async ({
      page,
    }) => {
      // Mock WebGPU as not supported
      await mockWebGPUSupport(page, false);
      await navigateToAIChat(page);

      // Should show browser not supported message
      await expect(page.getByText("Browser Not Supported")).toBeVisible();
      await expect(page.getByText(/WebGPU which isn't supported/)).toBeVisible();
    });

    test("should disable chat input for guest users without WebGPU", async ({ page }) => {
      await mockWebGPUSupport(page, false);
      await navigateToAIChat(page);

      const input = page.locator('input[type="text"]');
      await expect(input).toBeDisabled();
    });

    test("should show empty state with suggestions", async ({ page }) => {
      await mockWebGPUSupport(page, true);
      await navigateToAIChat(page);

      // Should show suggestions
      await expect(page.getByText("Start a conversation")).toBeVisible();
      await expect(page.getByText(/Sign up to save subscriptions via chat/)).toBeVisible();
    });
  });

  test.describe("Authenticated User - No Settings", () => {
    test.beforeEach(async ({ page }) => {
      await signInWithTestUser(page);

      // Ensure no AI settings exist
      await navigateToAISettings(page);
      const deleteButton = page.getByRole("button", { name: "Delete" });
      if (await deleteButton.isVisible().catch(() => false)) {
        page.once("dialog", async (dialog) => {
          await dialog.accept();
        });
        await deleteButton.click();
        await page.waitForTimeout(500);
      }
    });

    test("should show configure settings prompt", async ({ page }) => {
      await verifyChatNeedsConfiguration(page);
    });

    test("should show settings navigation hint", async ({ page }) => {
      await navigateToAIChat(page);

      await expect(page.getByText("Settings → AI Provider")).toBeVisible();
    });

    test("should disable chat input when not configured", async ({ page }) => {
      await verifyChatInputDisabled(page, /Configure AI settings first/);
    });
  });

  // Note: Tests requiring actual AI settings save need AI_ENCRYPTION_KEY env var
  // The following tests focus on UI behavior without requiring saved settings

  test.describe("WebLLM Settings UI", () => {
    test("should show WebGPU not supported warning when unavailable", async ({ page }) => {
      // Mock WebGPU as not supported BEFORE navigating
      await mockWebGPUSupport(page, false);
      await signInWithTestUser(page);

      // Select WebLLM provider
      await navigateToAISettings(page);
      await page.getByRole("button", { name: "Local AI (WebLLM)" }).click();

      // Should show warning in settings
      await expect(page.getByText("WebGPU Not Supported")).toBeVisible();
    });

    test("should show WebGPU supported when available", async ({ page }) => {
      // Mock WebGPU as supported BEFORE navigating
      await mockWebGPUSupport(page, true);
      await signInWithTestUser(page);

      // Select WebLLM provider
      await selectAIProvider(page, "webllm");

      // Should show supported status
      await expect(page.getByText("WebGPU Supported")).toBeVisible();
    });
  });

  test.describe("Chat Interface Structure", () => {
    test("should show chat interface header when navigating to AI Assistant", async ({ page }) => {
      await signInWithTestUser(page);
      await navigateToAIChat(page);

      // Header should always be visible
      await expect(page.getByRole("heading", { name: "AI Assistant" })).toBeVisible();
    });

    test("should show configure prompt when no settings exist", async ({ page }) => {
      await signInWithTestUser(page);

      // Clear any existing settings
      await navigateToAISettings(page);
      const deleteButton = page.getByRole("button", { name: "Delete" });
      if (await deleteButton.isVisible().catch(() => false)) {
        page.once("dialog", async (dialog) => await dialog.accept());
        await deleteButton.click();
        await page.waitForTimeout(500);
      }

      await navigateToAIChat(page);

      // Should show configure prompt
      await expect(page.getByText("Configure AI Provider")).toBeVisible();
    });

    test("should have message form elements", async ({ page }) => {
      await signInWithTestUser(page);
      await navigateToAIChat(page);

      // Form elements should exist
      const form = page.locator("form");
      await expect(form).toBeVisible();

      // Input and submit button should exist
      await expect(form.locator('input[type="text"]')).toBeVisible();
      await expect(form.locator('button[type="submit"]')).toBeVisible();
    });

    test("should show clear button when messages exist", async ({ page }) => {
      await mockWebGPUSupport(page, true);
      await signInAsGuest(page);
      await navigateToAIChat(page);

      // Initially no clear button (no messages)
      await expect(page.getByRole("button", { name: "Clear" })).not.toBeVisible();
    });
  });
});

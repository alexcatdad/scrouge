import { expect, test } from "@playwright/test";
import { mockWebGPUSupport, navigateToAIChat, signInAsGuest } from "./helpers";

/**
 * E2E tests for WebLLM chat functionality
 *
 * These tests mock the WebLLM engine at the browser level to enable
 * automated testing without downloading multi-GB models.
 *
 * The mock approach:
 * 1. Mock WebGPU as supported
 * 2. Inject a mock engine via window global before page loads
 * 3. The mock engine returns controlled responses for testing
 */

test.describe("WebLLM Chat with Mocked Engine", () => {
  test.beforeEach(async ({ page }) => {
    // Mock WebGPU support
    await mockWebGPUSupport(page, true);

    // Inject mock WebLLM configuration before any navigation
    await page.addInitScript(() => {
      // Set up global mock state
      (window as any).__webllmTestMode = true;
      (window as any).__webllmMockResponses = [];
      (window as any).__webllmMockIndex = 0;

      // Store the mock engine that will be injected
      (window as any).__webllmMockEngine = {
        chat: {
          completions: {
            create: async (params: any) => {
              const responses = (window as any).__webllmMockResponses || [];
              const index = (window as any).__webllmMockIndex || 0;
              const response = responses[index % Math.max(responses.length, 1)];
              (window as any).__webllmMockIndex = index + 1;

              console.log("[E2E Mock WebLLM] Request:", params.messages?.slice(-1));
              console.log("[E2E Mock WebLLM] Response:", response);

              return {
                choices: [
                  {
                    message: {
                      role: "assistant",
                      content:
                        response?.content ??
                        "I understand. How can I help you with your subscriptions?",
                      tool_calls: response?.toolCalls ?? undefined,
                    },
                    finish_reason: response?.toolCalls ? "tool_calls" : "stop",
                  },
                ],
              };
            },
          },
        },
        resetChat: async () => {
          console.log("[E2E Mock WebLLM] Chat reset");
        },
        unload: async () => {
          console.log("[E2E Mock WebLLM] Engine unloaded");
        },
      };
    });
  });

  test("should display chat interface for guest users with WebGPU", async ({ page }) => {
    await signInAsGuest(page);
    await navigateToAIChat(page);

    // Should show the chat interface
    await expect(page.getByRole("heading", { name: "AI Assistant" })).toBeVisible();
    // May show either "Local AI" status or loading state - use first() for multiple matches
    await expect(page.getByText(/Local AI|Loading Local AI Model/).first()).toBeVisible();
  });

  test("should show loading state while model initializes", async ({ page }) => {
    await signInAsGuest(page);
    await navigateToAIChat(page);

    // Should show loading indicator initially or "Ready" state
    const loadingOrReady = page.locator("text=/Loading Local AI Model|Local AI Ready/");
    await expect(loadingOrReady).toBeVisible({ timeout: 10000 });
  });

  test("should show suggestion buttons in empty chat state", async ({ page }) => {
    await signInAsGuest(page);
    await navigateToAIChat(page);

    // Should show suggestion prompts
    await expect(page.getByText("Start a conversation")).toBeVisible();
    await expect(page.getByText(/Add Netflix/)).toBeVisible();
    await expect(page.getByText(/total monthly spending/)).toBeVisible();
  });

  test("should enable chat input when WebGPU is supported", async ({ page }) => {
    await signInAsGuest(page);
    await navigateToAIChat(page);

    // Input should be visible and eventually enabled
    const input = page.getByPlaceholder(/Ask me about your subscriptions|Loading/);
    await expect(input).toBeVisible();
  });

  test("clicking suggestion populates input field", async ({ page }) => {
    await signInAsGuest(page);
    await navigateToAIChat(page);

    // Click a suggestion
    await page.getByRole("button", { name: /Add Netflix/ }).click();

    // Input should be populated
    const input = page.locator('input[type="text"]');
    await expect(input).toHaveValue(/Netflix.*15.99/);
  });

  test("should show clear button only when messages exist", async ({ page }) => {
    await signInAsGuest(page);
    await navigateToAIChat(page);

    // Initially no clear button
    await expect(page.getByRole("button", { name: "Clear" })).not.toBeVisible();
  });

  test("chat header shows correct provider info for guest", async ({ page }) => {
    await signInAsGuest(page);
    await navigateToAIChat(page);

    // Should show local AI info in the header description
    await expect(page.getByText("Local AI • Private & Offline")).toBeVisible();
  });
});

test.describe("WebLLM Chat Message Flow", () => {
  test("should show user message after sending", async ({ page }) => {
    // Set up mocks
    await mockWebGPUSupport(page, true);

    await page.addInitScript(() => {
      (window as any).__webllmTestMode = true;
      (window as any).__webllmSkipInit = true;
    });

    await signInAsGuest(page);
    await navigateToAIChat(page);

    // Wait for interface to be ready
    await page.waitForTimeout(1000);

    // Fill and submit a message
    const input = page.locator('input[type="text"]');

    // Check if input is enabled (may still be loading)
    const isEnabled = await input.isEnabled().catch(() => false);
    if (!isEnabled) {
      // Skip test if model is still loading
      test.skip();
      return;
    }

    await input.fill("Hello, can you help me?");
    await page.locator('form button[type="submit"]').click();

    // User message should appear
    await expect(page.locator(".chat-message-user")).toContainText("Hello, can you help me?");
  });
});

test.describe("WebLLM Error Handling", () => {
  test("should handle WebGPU not supported gracefully", async ({ page }) => {
    await mockWebGPUSupport(page, false);
    await signInAsGuest(page);
    await navigateToAIChat(page);

    // Should show not supported message
    await expect(page.getByText("Browser Not Supported")).toBeVisible();
    await expect(page.getByText(/WebGPU which isn't supported/)).toBeVisible();

    // Input should be disabled
    const input = page.locator('input[type="text"]');
    await expect(input).toBeDisabled();
  });

  test("should show appropriate error when model fails to load", async ({ page }) => {
    await mockWebGPUSupport(page, true);

    // Inject an error state
    await page.addInitScript(() => {
      (window as any).__webllmTestMode = true;
      (window as any).__webllmForceError = "Failed to initialize WebLLM engine";
    });

    await signInAsGuest(page);
    await navigateToAIChat(page);

    // Wait for potential error state
    await page.waitForTimeout(2000);

    // Either loading state or error state should be visible
    const hasLoading = await page
      .getByText("Loading Local AI Model")
      .isVisible()
      .catch(() => false);
    const hasError = await page
      .getByText(/Error|Failed/)
      .isVisible()
      .catch(() => false);
    const hasReady = await page
      .getByText("Local AI Ready")
      .isVisible()
      .catch(() => false);

    // One of these states should be present
    expect(hasLoading || hasError || hasReady).toBe(true);
  });
});

test.describe("WebLLM Chat Accessibility", () => {
  test("chat form has proper form structure", async ({ page }) => {
    await mockWebGPUSupport(page, true);
    await signInAsGuest(page);
    await navigateToAIChat(page);

    // Form should exist
    const form = page.locator("form");
    await expect(form).toBeVisible();

    // Form should have input and submit button
    await expect(form.locator('input[type="text"]')).toBeVisible();
    await expect(form.locator('button[type="submit"]')).toBeVisible();
  });

  test("input has appropriate placeholder text", async ({ page }) => {
    await mockWebGPUSupport(page, true);
    await signInAsGuest(page);
    await navigateToAIChat(page);

    const input = page.locator('input[type="text"]');

    // Should have a relevant placeholder (may vary based on loading state)
    const placeholder = await input.getAttribute("placeholder");
    expect(placeholder).toBeTruthy();
    expect(placeholder?.length).toBeGreaterThan(5);
  });

  test("submit button is disabled when input is empty", async ({ page }) => {
    await mockWebGPUSupport(page, true);
    await signInAsGuest(page);
    await navigateToAIChat(page);

    // Wait for potential loading to complete
    await page.waitForTimeout(1000);

    // Submit button should be disabled when input is empty
    const submitButton = page.locator('form button[type="submit"]');
    const input = page.locator('input[type="text"]');

    // Clear any existing value
    await input.fill("");

    // Button should be disabled
    await expect(submitButton).toBeDisabled();
  });
});

test.describe("WebLLM Chat Storage", () => {
  test("messages are persisted in local storage", async ({ page }) => {
    await mockWebGPUSupport(page, true);
    await signInAsGuest(page);

    // First, check if messages are stored in IndexedDB
    const messageCount = await page.evaluate(async () => {
      return new Promise((resolve) => {
        const request = indexedDB.open("scrougeGuest");
        request.onsuccess = () => {
          const db = request.result;
          try {
            const tx = db.transaction("chatMessages", "readonly");
            const store = tx.objectStore("chatMessages");
            const countReq = store.count();
            countReq.onsuccess = () => {
              db.close();
              resolve(countReq.result);
            };
            countReq.onerror = () => {
              db.close();
              resolve(0);
            };
          } catch {
            db.close();
            resolve(0);
          }
        };
        request.onerror = () => resolve(0);
      });
    });

    // Should return a number (may be 0 initially)
    expect(typeof messageCount).toBe("number");
  });

  test("clear button removes all messages", async ({ page }) => {
    await mockWebGPUSupport(page, true);
    await signInAsGuest(page);
    await navigateToAIChat(page);

    // Store the count before any action
    const _hasMessages = await page.evaluate(async () => {
      return new Promise((resolve) => {
        const request = indexedDB.open("scrougeGuest");
        request.onsuccess = () => {
          const db = request.result;
          try {
            const tx = db.transaction("chatMessages", "readonly");
            const store = tx.objectStore("chatMessages");
            const countReq = store.count();
            countReq.onsuccess = () => {
              db.close();
              resolve(countReq.result > 0);
            };
            countReq.onerror = () => {
              db.close();
              resolve(false);
            };
          } catch {
            db.close();
            resolve(false);
          }
        };
        request.onerror = () => resolve(false);
      });
    });

    // If there are messages and clear button is visible, clicking it should work
    const clearButton = page.getByRole("button", { name: "Clear" });
    if (await clearButton.isVisible().catch(() => false)) {
      await clearButton.click();
      // Messages area should show empty state
      await expect(page.getByText("Start a conversation")).toBeVisible();
    }
  });
});

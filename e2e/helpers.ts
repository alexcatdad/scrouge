import { expect, type Page } from "@playwright/test";

const TEST_USER = {
  email: "e2e-test@scrouge.local",
  password: "E2ETestPassword123!",
};

/**
 * Signs in as a guest user (local storage mode - no DB persistence)
 */
export async function signInAsGuest(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as guest" }).click();
  // Guest mode shows "Welcome, Guest" and "Guest" badge in header
  await expect(page.getByText("Welcome, Guest")).toBeVisible({ timeout: 10000 });
  // Use the header badge specifically (has class guest-badge)
  await expect(page.locator(".guest-badge")).toBeVisible();
}

/**
 * Exits guest mode and clears local data
 */
export async function exitGuestMode(page: Page) {
  await page.getByRole("button", { name: "Exit Guest Mode" }).click();
  // Should return to sign-in page
  await expect(page.getByText("Get Started")).toBeVisible({ timeout: 10000 });
}

/**
 * Checks if the page is in guest mode
 */
export async function isInGuestMode(page: Page): Promise<boolean> {
  return page.getByText("Guest Mode").isVisible();
}

/**
 * Clears IndexedDB data for guest mode (useful for test cleanup)
 */
export async function clearGuestData(page: Page) {
  await page.evaluate(async () => {
    const databases = await indexedDB.databases();
    for (const db of databases) {
      if (db.name === "scrougeGuest") {
        indexedDB.deleteDatabase(db.name);
      }
    }
    localStorage.removeItem("scrouge_guest_mode");
  });
}

/**
 * Gets the count of items in guest IndexedDB
 */
export async function getGuestDataCount(
  page: Page,
): Promise<{ subscriptions: number; paymentMethods: number }> {
  return await page.evaluate(async () => {
    return new Promise((resolve) => {
      const request = indexedDB.open("scrougeGuest");
      request.onsuccess = () => {
        const db = request.result;
        try {
          const subTx = db.transaction("subscriptions", "readonly");
          const subStore = subTx.objectStore("subscriptions");
          const subCountReq = subStore.count();

          subCountReq.onsuccess = () => {
            const subCount = subCountReq.result;

            const pmTx = db.transaction("paymentMethods", "readonly");
            const pmStore = pmTx.objectStore("paymentMethods");
            const pmCountReq = pmStore.count();

            pmCountReq.onsuccess = () => {
              db.close();
              resolve({ subscriptions: subCount, paymentMethods: pmCountReq.result });
            };
            pmCountReq.onerror = () => {
              db.close();
              resolve({ subscriptions: subCount, paymentMethods: 0 });
            };
          };
          subCountReq.onerror = () => {
            db.close();
            resolve({ subscriptions: 0, paymentMethods: 0 });
          };
        } catch {
          db.close();
          resolve({ subscriptions: 0, paymentMethods: 0 });
        }
      };
      request.onerror = () => {
        resolve({ subscriptions: 0, paymentMethods: 0 });
      };
    });
  });
}

/**
 * Signs in with test user for migration testing.
 * This version preserves IndexedDB data to test migration.
 */
export async function signInForMigration(page: Page) {
  // Don't clear localStorage guest mode flag - let migration detect it
  // Navigate to home which should show sign-in since we're not authenticated
  await page.goto("/");

  // Wait for the page to load - it might briefly show guest mode
  await page.waitForTimeout(500);

  // Fill credentials
  await page.getByPlaceholder("Email address").fill(TEST_USER.email);
  await page.getByPlaceholder("Password").fill(TEST_USER.password);

  // Try sign in first
  await page.getByRole("button", { name: "Sign in" }).click();

  // Wait for either success or error toast
  const result = await Promise.race([
    page
      .getByText("Welcome back")
      .waitFor({ timeout: 15000 })
      .then(() => "success" as const),
    page
      .getByText("Could not sign in")
      .first()
      .waitFor({ timeout: 5000 })
      .then(() => "needs_signup" as const)
      .catch(() => null),
  ]);

  if (result === "needs_signup") {
    // User doesn't exist - switch to sign up
    await page.getByRole("button", { name: "Sign up" }).click();
    await page.getByPlaceholder("Email address").fill(TEST_USER.email);
    await page.getByPlaceholder("Password").fill(TEST_USER.password);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Welcome back")).toBeVisible({ timeout: 15000 });
  }
}

/**
 * Signs in with a known test user (password auth).
 * Automatically creates the user if it doesn't exist yet.
 */
export async function signInWithTestUser(page: Page) {
  await page.goto("/");

  // Fill credentials
  await page.getByPlaceholder("Email address").fill(TEST_USER.email);
  await page.getByPlaceholder("Password").fill(TEST_USER.password);

  // Try sign in first
  await page.getByRole("button", { name: "Sign in" }).click();

  // Wait for either success or error toast
  const result = await Promise.race([
    page
      .getByText("Welcome back")
      .waitFor({ timeout: 10000 })
      .then(() => "success" as const),
    page
      .getByText("Could not sign in")
      .first()
      .waitFor({ timeout: 5000 })
      .then(() => "needs_signup" as const)
      .catch(() => null),
  ]);

  if (result === "needs_signup") {
    // User doesn't exist - switch to sign up
    await page.getByRole("button", { name: "Sign up" }).click();
    await page.getByPlaceholder("Email address").fill(TEST_USER.email);
    await page.getByPlaceholder("Password").fill(TEST_USER.password);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Welcome back")).toBeVisible({ timeout: 10000 });
  }
  // If result is 'success', we're already done - Welcome back is visible
}

/**
 * Navigates to a specific tab in the dashboard
 */
export async function navigateToTab(
  page: Page,
  tabName: "Overview" | "Subscriptions" | "Payments" | "AI Assistant" | "Settings",
) {
  // Use exact match to avoid conflicts with buttons like "Save Settings"
  await page.getByRole("button", { name: tabName, exact: true }).click();
  await page.waitForTimeout(500); // Wait for tab to be active
}

/**
 * Adds a payment method
 */
export async function addPaymentMethod(
  page: Page,
  options: {
    name: string;
    type?: "credit_card" | "debit_card" | "bank_account" | "paypal" | "other";
    lastFourDigits?: string;
    expiryDate?: string;
  },
) {
  await navigateToTab(page, "Payments");

  // Click "Add Payment Method" button
  await page.getByRole("button", { name: "Add Payment Method" }).click();

  // Wait for form to be visible
  await expect(page.getByText("Add Payment Method").first()).toBeVisible();

  // Fill in payment method form
  await page.getByPlaceholder("My Visa Card, Chase Checking, etc.").fill(options.name);

  if (options.type) {
    await page
      .locator("form")
      .filter({ hasText: "Add Payment Method" })
      .locator("select")
      .first()
      .selectOption(options.type);
  }

  if (options.lastFourDigits) {
    await page.getByPlaceholder("1234").fill(options.lastFourDigits);
  }

  if (options.expiryDate) {
    await page.locator('input[type="month"]').fill(options.expiryDate);
  }

  // Submit the form
  await page.getByRole("button", { name: "Add Payment Method" }).last().click();

  // Wait for success toast
  await expect(page.getByText("Payment method added!").first()).toBeVisible();

  // Verify payment method was added
  await expect(page.getByText(options.name).first()).toBeVisible();
}

/**
 * Adds a subscription
 */
export async function addSubscription(
  page: Page,
  options: {
    name: string;
    category: string;
    cost: string;
    billingCycle: "monthly" | "yearly" | "weekly" | "daily";
    paymentMethodName?: string;
    description?: string;
    website?: string;
  },
) {
  await navigateToTab(page, "Subscriptions");

  // Click "Add New Subscription" button
  await page.getByRole("button", { name: "Add New Subscription" }).click();

  // Wait for form to be visible
  await expect(page.getByText("Add New Subscription").first()).toBeVisible();

  // Fill in subscription form
  await page.getByPlaceholder("Netflix, Spotify, etc.").fill(options.name);

  // Wait for form to be fully rendered
  await page.waitForTimeout(500);

  // Select category
  await page
    .locator("select")
    .filter({ has: page.locator(`option:has-text("${options.category}")`) })
    .selectOption(options.category);

  // Fill cost
  await page.getByPlaceholder("9.99").fill(options.cost);

  // Select billing cycle
  const billingCycleLabel =
    options.billingCycle.charAt(0).toUpperCase() + options.billingCycle.slice(1);
  await page
    .locator("select")
    .filter({ has: page.locator(`option:has-text("${billingCycleLabel}")`) })
    .selectOption(options.billingCycle);

  // Select payment method if specified
  if (options.paymentMethodName) {
    await page.waitForTimeout(500);
    const paymentMethodSelect = page
      .locator("select")
      .filter({ has: page.locator(`option:has-text("${options.paymentMethodName}")`) });
    await paymentMethodSelect.selectOption({ index: 1 }); // Index 1 = first actual payment method (0 is placeholder)
  }

  // Optional fields
  if (options.description) {
    await page.getByPlaceholder("Brief description of the service").fill(options.description);
  }

  if (options.website) {
    await page.getByPlaceholder("https://example.com").fill(options.website);
  }

  // Submit the form
  await page.getByRole("button", { name: "Add Subscription" }).click();

  // Wait for success toast
  await expect(page.getByText("Subscription added successfully!").first()).toBeVisible();
}

/**
 * Verifies a subscription appears in the list with expected details
 */
export async function verifySubscriptionInList(
  page: Page,
  subscriptionName: string,
  expectedDetails: {
    cost?: string;
    category?: string;
    billingCycle?: string;
  },
) {
  await expect(page.getByText(subscriptionName).first()).toBeVisible();

  if (expectedDetails.cost) {
    await expect(page.getByText(expectedDetails.cost).first()).toBeVisible();
  }

  if (expectedDetails.category) {
    await expect(page.getByText(expectedDetails.category).first()).toBeVisible();
  }

  if (expectedDetails.billingCycle) {
    await expect(page.getByText(expectedDetails.billingCycle).first()).toBeVisible();
  }
}

/**
 * Verifies a subscription appears in the Overview dashboard
 */
export async function verifySubscriptionInOverview(
  page: Page,
  subscriptionName: string,
  expectedDetails: {
    cost?: string;
    category?: string;
  },
) {
  await navigateToTab(page, "Overview");

  await expect(page.getByText(subscriptionName)).toBeVisible();

  if (expectedDetails.category) {
    await expect(page.getByText(expectedDetails.category)).toBeVisible();
  }

  if (expectedDetails.cost) {
    await expect(page.getByText(expectedDetails.cost)).toBeVisible();
  }
}

/**
 * Sets a payment method as default
 */
export async function setDefaultPaymentMethod(page: Page, name: string) {
  await navigateToTab(page, "Payments");

  // Find the payment method by finding the heading with the name, then navigate to the card container
  const heading = page.locator("h4").filter({ hasText: name }).first();
  const paymentMethodCard = heading.locator('xpath=ancestor::div[contains(@class, "p-6")]');
  await paymentMethodCard.getByRole("button", { name: "Set Default" }).first().click();

  // Wait for success toast
  await expect(page.getByText("Default payment method updated").first()).toBeVisible();

  // Verify it shows "Default" badge within the card
  await expect(paymentMethodCard.getByText("Default").first()).toBeVisible();
}

/**
 * Deletes a payment method (handles confirm dialog)
 */
export async function deletePaymentMethod(page: Page, name: string) {
  await navigateToTab(page, "Payments");

  // Set up dialog handler to accept confirmation
  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain(name);
    await dialog.accept();
  });

  // Find the payment method by finding the heading with the name, then navigate to the card container
  const heading = page.locator("h4").filter({ hasText: name }).first();
  const paymentMethodCard = heading.locator('xpath=ancestor::div[contains(@class, "p-6")]');
  await paymentMethodCard.getByRole("button", { name: "Delete" }).first().click();

  // Wait for success toast
  await expect(page.getByText("Payment method deleted").first()).toBeVisible();

  // Verify payment method is no longer visible (wait a bit for the UI to update)
  await page.waitForTimeout(500);
  await expect(page.getByText(name).first()).not.toBeVisible();
}

/**
 * Toggles subscription active status (pause/activate)
 */
export async function toggleSubscriptionActive(
  page: Page,
  name: string,
  expectedStatus: "active" | "paused",
) {
  await navigateToTab(page, "Subscriptions");

  // Find the subscription by finding the heading with the name, then navigate to the card container
  const heading = page.locator("h4").filter({ hasText: name }).first();
  const subscriptionCard = heading.locator('xpath=ancestor::div[contains(@class, "p-6")]');

  // Click the appropriate button based on current status
  const buttonText = expectedStatus === "active" ? "Activate" : "Pause";
  await subscriptionCard.getByRole("button", { name: buttonText }).first().click();

  // Wait for success toast
  const expectedToast = expectedStatus === "active" ? "activated" : "paused";
  await expect(
    page.getByText(new RegExp(`Subscription ${expectedToast}`, "i")).first(),
  ).toBeVisible();

  // Wait a bit for UI to update
  await page.waitForTimeout(500);
}

/**
 * Deletes a subscription (handles confirm dialog)
 */
export async function deleteSubscription(page: Page, name: string) {
  await navigateToTab(page, "Subscriptions");

  // Set up dialog handler to accept confirmation
  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain(name);
    await dialog.accept();
  });

  // Find the subscription by finding the heading with the name, then navigate to the card container
  const heading = page.locator("h4").filter({ hasText: name }).first();
  const subscriptionCard = heading.locator('xpath=ancestor::div[contains(@class, "p-6")]');
  await subscriptionCard.getByRole("button", { name: "Delete" }).first().click();

  // Wait for success toast
  await expect(page.getByText("Subscription deleted").first()).toBeVisible();

  // Wait a bit for UI to update
  await page.waitForTimeout(500);

  // Verify subscription is no longer visible
  await expect(page.getByText(name).first()).not.toBeVisible();
}

/**
 * Filters subscriptions by status
 */
export async function filterSubscriptions(page: Page, filter: "all" | "active" | "inactive") {
  await navigateToTab(page, "Subscriptions");

  // Find the filter select and change it
  const filterSelect = page
    .locator("select")
    .filter({ has: page.locator('option:has-text("All")') });
  await filterSelect.selectOption(filter);

  // Wait a bit for the filter to apply
  await page.waitForTimeout(300);
}

// ==========================================
// AI Settings & Chat Helpers
// ==========================================

type AIProvider = "webllm" | "openai" | "xai" | "mistral" | "ollama";

/**
 * Navigates to AI Settings page
 */
export async function navigateToAISettings(page: Page) {
  await navigateToTab(page, "Settings");
  await page.waitForTimeout(300);
}

/**
 * Navigates to AI Chat interface
 */
export async function navigateToAIChat(page: Page) {
  await navigateToTab(page, "AI Assistant");
  await page.waitForTimeout(300);
}

/**
 * Selects an AI provider in the settings page
 */
export async function selectAIProvider(page: Page, provider: AIProvider) {
  await navigateToAISettings(page);

  // Find and click the provider button
  const providerLabels: Record<AIProvider, string> = {
    webllm: "Local AI (WebLLM)",
    openai: "OpenAI",
    xai: "xAI (Grok)",
    mistral: "Mistral AI",
    ollama: "Ollama",
  };

  await page.getByRole("button", { name: providerLabels[provider] }).click();
  await page.waitForTimeout(300);
}

/**
 * Saves AI settings with the specified provider and optional API key
 */
export async function saveAISettings(
  page: Page,
  options: {
    provider: AIProvider;
    apiKey?: string;
    modelId?: string;
    ollamaBaseUrl?: string;
  },
) {
  // Select provider (this also navigates to settings)
  await selectAIProvider(page, options.provider);

  // Fill API key if needed (not for webllm or ollama)
  if (options.apiKey && options.provider !== "webllm" && options.provider !== "ollama") {
    await page.getByPlaceholder(/Enter your .* API key/).fill(options.apiKey);
  }

  // Fill model ID if provided
  if (options.modelId && options.provider !== "webllm") {
    await page.getByPlaceholder(/gpt-4|grok|mistral|llama/).fill(options.modelId);
  }

  // Fill Ollama base URL if provided
  if (options.ollamaBaseUrl && options.provider === "ollama") {
    await page.getByPlaceholder("http://localhost:11434/api").fill(options.ollamaBaseUrl);
  }

  // Click save button - wait for it to be enabled first
  const saveButton = page.getByRole("button", { name: "Save Settings" });
  await expect(saveButton).toBeEnabled({ timeout: 10000 });
  await saveButton.click();

  // Wait for either success or error toast
  const successToast = page.getByText(/AI settings saved|Settings saved/i).first();
  const errorToast = page.getByText(/Failed to save|Error/i).first();

  // Wait for any response
  await page.waitForTimeout(2000);

  // Check if there's an error
  if (await errorToast.isVisible().catch(() => false)) {
    const errorText = await errorToast.textContent();
    throw new Error(`AI settings save failed: ${errorText}`);
  }

  // Wait for success toast
  await expect(successToast).toBeVisible({ timeout: 10000 });
}

/**
 * Deletes AI settings
 */
export async function deleteAISettings(page: Page) {
  await navigateToAISettings(page);

  // Set up dialog handler to accept confirmation
  page.once("dialog", async (dialog) => {
    await dialog.accept();
  });

  // Click delete button
  await page.getByRole("button", { name: "Delete" }).click();

  // Wait for success toast
  await expect(page.getByText("AI settings deleted").first()).toBeVisible({ timeout: 5000 });
}

/**
 * Verifies AI settings status indicator shows configured provider
 */
export async function verifyAISettingsConfigured(page: Page, provider: AIProvider) {
  await navigateToAISettings(page);

  const providerLabels: Record<AIProvider, string> = {
    webllm: "Local AI (WebLLM)",
    openai: "openai",
    xai: "xai",
    mistral: "mistral",
    ollama: "ollama",
  };

  // Check for the "Configured:" status indicator
  await expect(page.getByText("Configured:").first()).toBeVisible();
  await expect(page.getByText(providerLabels[provider]).first()).toBeVisible();
}

/**
 * Mocks WebGPU support status in the browser
 * IMPORTANT: Must be called BEFORE navigating to the page (before goto or sign in)
 */
export async function mockWebGPUSupport(page: Page, supported: boolean) {
  await page.addInitScript((isSupported) => {
    // Delete existing gpu property if it exists
    if ("gpu" in navigator) {
      try {
        delete (navigator as any).gpu;
      } catch {
        // Ignore if can't delete
      }
    }

    if (isSupported) {
      // Mock WebGPU as supported with a proper adapter mock
      const mockAdapter = {
        features: new Set(),
        limits: {},
        requestDevice: async () => ({}),
      };

      Object.defineProperty(navigator, "gpu", {
        value: {
          requestAdapter: async () => mockAdapter,
          getPreferredCanvasFormat: () => "bgra8unorm",
        },
        writable: true,
        configurable: true,
        enumerable: true,
      });
    } else {
      // Mock WebGPU as not supported
      Object.defineProperty(navigator, "gpu", {
        value: undefined,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }
  }, supported);
}

/**
 * Sends a chat message in the AI chat interface
 */
export async function sendChatMessage(page: Page, message: string) {
  await navigateToAIChat(page);

  // Fill in the message input
  const input = page.getByPlaceholder(/Ask me about your subscriptions/);
  await input.fill(message);

  // Click send button
  await page.locator('form button[type="submit"]').click();
}

/**
 * Clicks a chat suggestion button
 */
export async function clickChatSuggestion(page: Page, suggestionText: string) {
  await navigateToAIChat(page);

  // Click the suggestion button containing the text
  await page.getByRole("button", { name: new RegExp(suggestionText, "i") }).click();
}

/**
 * Verifies the chat interface shows the "configure settings" prompt
 */
export async function verifyChatNeedsConfiguration(page: Page) {
  await navigateToAIChat(page);

  await expect(page.getByText("Configure AI Provider")).toBeVisible();
  await expect(page.getByText("Set up your AI provider in Settings")).toBeVisible();
}

/**
 * Verifies chat input is disabled with a specific placeholder
 */
export async function verifyChatInputDisabled(page: Page, placeholderPattern?: RegExp | string) {
  await navigateToAIChat(page);

  const input = page.locator('form input[type="text"]');
  await expect(input).toBeDisabled();

  if (placeholderPattern) {
    await expect(input).toHaveAttribute("placeholder", placeholderPattern);
  }
}

/**
 * Verifies chat input is enabled
 */
export async function verifyChatInputEnabled(page: Page) {
  await navigateToAIChat(page);

  const input = page.locator('form input[type="text"]');
  await expect(input).toBeEnabled();
}

/**
 * Verifies WebGPU not supported warning is shown
 */
export async function verifyWebGPUNotSupportedWarning(page: Page) {
  await expect(page.getByText("WebGPU Not Supported")).toBeVisible();
}

/**
 * Verifies WebGPU supported indicator is shown
 */
export async function verifyWebGPUSupported(page: Page) {
  await expect(page.getByText("WebGPU Supported")).toBeVisible();
}

// ==========================================
// WebLLM Mocking Helpers for E2E Testing
// ==========================================

export interface MockWebLLMResponse {
  content: string | null;
  toolCalls?: Array<{
    id: string;
    type: "function";
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

/**
 * Mocks WebLLM engine to return controlled responses.
 * Must be called BEFORE navigating to the page.
 *
 * @param page - Playwright page
 * @param responses - Array of responses to return in order (cycles back to start)
 */
export async function mockWebLLMEngine(page: Page, responses: MockWebLLMResponse[]) {
  await page.addInitScript((mockResponses) => {
    // Store mock responses globally
    (window as any).__mockWebLLMResponses = mockResponses;
    (window as any).__mockWebLLMResponseIndex = 0;

    // Also ensure WebGPU is "supported"
    if (!("gpu" in navigator)) {
      Object.defineProperty(navigator, "gpu", {
        value: {
          requestAdapter: async () => ({
            features: new Set(),
            limits: {},
            requestDevice: async () => ({}),
          }),
          getPreferredCanvasFormat: () => "bgra8unorm",
        },
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }
  }, responses);

  // Intercept the webllm module import and mock CreateMLCEngine
  await page.route("**/@mlc-ai/web-llm*", async (route, _request) => {
    // Let the actual script load but we'll override the engine behavior
    await route.continue();
  });

  // Override the module after page load via evaluate
  await page.addInitScript(() => {
    // Intercept the actual engine creation
    const _originalFetch = window.fetch;

    // Create a mock engine factory that will be used when CreateMLCEngine is called
    (window as any).__createMockWebLLMEngine = async () => {
      const mockResponses = (window as any).__mockWebLLMResponses || [];

      return {
        chat: {
          completions: {
            create: async (_params: any) => {
              // Get next mock response
              const index = (window as any).__mockWebLLMResponseIndex || 0;
              const response = mockResponses[index % mockResponses.length];
              (window as any).__mockWebLLMResponseIndex = index + 1;

              // Log for debugging
              console.log("[MockWebLLM] Returning mock response:", response);

              return {
                choices: [
                  {
                    message: {
                      role: "assistant",
                      content: response?.content ?? null,
                      tool_calls: response?.toolCalls ?? undefined,
                    },
                    finish_reason: response?.toolCalls ? "tool_calls" : "stop",
                  },
                ],
              };
            },
          },
        },
        resetChat: async () => {},
        unload: async () => {},
      };
    };
  });
}

/**
 * Alternative approach: Mock the module initialization in a way that
 * replaces the actual WebLLM engine with our mock.
 *
 * This is called BEFORE navigating to the page.
 */
export async function setupMockWebLLM(
  page: Page,
  options: {
    responses: MockWebLLMResponse[];
    simulateLoadTime?: number;
  },
) {
  const { responses, simulateLoadTime = 100 } = options;

  // First, ensure WebGPU is "supported"
  await mockWebGPUSupport(page, true);

  await page.addInitScript(
    ({ responses, simulateLoadTime }) => {
      // Store mock configuration
      (window as any).__mockWebLLM = {
        responses,
        responseIndex: 0,
        simulateLoadTime,
        initialized: false,
      };

      // Store original module loader behavior to intercept later
      const scriptLoadCallbacks: Array<() => void> = [];
      (window as any).__onWebLLMReady = (callback: () => void) => {
        if ((window as any).__mockWebLLM.initialized) {
          callback();
        } else {
          scriptLoadCallbacks.push(callback);
        }
      };

      // Will be called when the real module tries to initialize
      (window as any).__initMockWebLLM = () => {
        (window as any).__mockWebLLM.initialized = true;
        scriptLoadCallbacks.forEach((cb) => {
          cb();
        });
      };
    },
    { responses, simulateLoadTime },
  );
}

/**
 * Injects a mock WebLLM engine that immediately returns controlled responses.
 * Call this after the page has loaded but before any WebLLM interactions.
 */
export async function injectMockWebLLMEngine(page: Page, responses: MockWebLLMResponse[]) {
  await page.evaluate((mockResponses) => {
    // Override the initWebLLM function globally
    const mockEngine = {
      chat: {
        completions: {
          create: async (_params: any) => {
            const mock = (window as any).__mockWebLLMState || { index: 0 };
            const response = mockResponses[mock.index % mockResponses.length];
            mock.index = mock.index + 1;
            (window as any).__mockWebLLMState = mock;

            console.log("[MockWebLLM] Processing request, returning:", response);

            return {
              choices: [
                {
                  message: {
                    role: "assistant",
                    content: response?.content ?? null,
                    tool_calls: response?.toolCalls ?? undefined,
                  },
                  finish_reason: response?.toolCalls ? "tool_calls" : "stop",
                },
              ],
            };
          },
        },
      },
      resetChat: async () => {},
      unload: async () => {},
    };

    (window as any).__mockWebLLMState = { index: 0 };
    (window as any).__mockWebLLMEngine = mockEngine;
  }, responses);
}

/**
 * Waits for WebLLM to be ready (either real or mocked)
 */
export async function waitForWebLLMReady(page: Page, timeout = 10000) {
  await page.waitForFunction(
    () => {
      // Check for "Local AI Ready" indicator
      return (
        document.body.textContent?.includes("Local AI Ready") ||
        document.body.textContent?.includes("Loading Local AI Model")
      );
    },
    { timeout },
  );
}

/**
 * Sends a chat message and waits for the response
 */
export async function sendChatMessageAndWaitForResponse(
  page: Page,
  message: string,
  responseTimeout = 30000,
) {
  // Find and fill the input
  const input = page.getByPlaceholder(/Ask me about your subscriptions/);
  await input.fill(message);

  // Submit
  await page.locator('form button[type="submit"]').click();

  // Wait for loading to complete (loading indicator disappears)
  await page.waitForFunction(() => !document.querySelector(".animate-bounce"), {
    timeout: responseTimeout,
  });

  // Small delay for UI to update
  await page.waitForTimeout(500);
}

/**
 * Gets all chat messages from the interface
 */
export async function getChatMessages(
  page: Page,
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  return await page.evaluate(() => {
    const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

    // Find all message containers
    const _userMessages = document.querySelectorAll(".chat-message-user");
    const _assistantMessages = document.querySelectorAll(".chat-message-assistant");

    // Get all message divs in order
    const allMessageDivs = document.querySelectorAll('[class*="chat-message-"]');

    allMessageDivs.forEach((div) => {
      const isUser = div.classList.contains("chat-message-user");
      const content = div.querySelector("p.whitespace-pre-wrap")?.textContent || "";

      if (content) {
        messages.push({
          role: isUser ? "user" : "assistant",
          content: content.trim(),
        });
      }
    });

    return messages;
  });
}

/**
 * Verifies that the last assistant message contains expected text
 */
export async function verifyLastAssistantMessage(page: Page, expectedText: string | RegExp) {
  const messages = await getChatMessages(page);
  const lastAssistantMessage = messages.filter((m) => m.role === "assistant").pop();

  if (!lastAssistantMessage) {
    throw new Error("No assistant messages found");
  }

  if (typeof expectedText === "string") {
    expect(lastAssistantMessage.content).toContain(expectedText);
  } else {
    expect(lastAssistantMessage.content).toMatch(expectedText);
  }
}

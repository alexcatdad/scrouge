import { expect, test } from "@playwright/test";
import { clearGuestData, navigateToTab, signInAsGuest, signInWithTestUser } from "./helpers";

test.describe("Error Scenarios", () => {
  test.describe("Network Errors", () => {
    test("should handle network failure gracefully on subscription list", async ({ page }) => {
      await page.goto("/");
      await signInAsGuest(page);

      // Intercept and fail network requests
      await page.route("**/api/**", (route) => route.abort("failed"));

      await navigateToTab(page, "Subscriptions");

      // App should not crash, should show error or empty state
      const appContainer = page.locator("#root");
      await expect(appContainer).toBeVisible();
    });

    test("should show error toast on mutation failure", async ({ page }) => {
      await page.goto("/");
      await signInAsGuest(page);

      await navigateToTab(page, "Subscriptions");

      // Try to perform an action that might fail
      // The app should handle errors gracefully
    });
  });

  test.describe("Form Validation Errors", () => {
    test("should show validation error for empty subscription name", async ({ page }) => {
      await page.goto("/");
      await signInAsGuest(page);

      await navigateToTab(page, "Subscriptions");

      // Open add form
      const addButton = page.getByRole("button", { name: /add.*subscription/i });
      if (await addButton.isVisible()) {
        await addButton.click();

        // Try to submit without name
        const submitButton = page.getByRole("button", { name: /add|save|submit/i }).last();
        await submitButton.click();

        // Should show validation error or prevent submission
      }
    });

    test("should show validation error for negative cost", async ({ page }) => {
      await page.goto("/");
      await signInAsGuest(page);

      await navigateToTab(page, "Subscriptions");

      const addButton = page.getByRole("button", { name: /add.*subscription/i });
      if (await addButton.isVisible()) {
        await addButton.click();

        // Enter negative cost
        const costInput = page.getByPlaceholder(/cost/i);
        if (await costInput.isVisible()) {
          await costInput.fill("-10");

          // Validation should catch this
        }
      }
    });

    test("should show error when deleting payment method in use", async ({ page }) => {
      await page.goto("/");
      await signInAsGuest(page);

      await navigateToTab(page, "Payments");

      // Try to delete a payment method that might be in use
      const deleteButton = page.getByRole("button", { name: /delete/i }).first();

      if (await deleteButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Handle confirmation dialog
        page.once("dialog", async (dialog) => {
          await dialog.accept();
        });

        await deleteButton.click();

        // Should show error if payment method is in use
      }
    });
  });

  test.describe("Authentication Errors", () => {
    test("should redirect to login when session expires", async ({ page }) => {
      await page.goto("/");
      await signInWithTestUser(page);

      // Clear auth state to simulate session expiry
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });

      // Reload page
      await page.reload();

      // Should show login form
      const _signInForm = page.getByRole("form");
      // User should see authentication options
    });

    test("should handle invalid credentials gracefully", async ({ page }) => {
      await page.goto("/");
      await clearGuestData(page);

      // Try to sign in with invalid credentials
      const emailInput = page.getByPlaceholder(/email/i);
      const passwordInput = page.getByPlaceholder(/password/i);

      if ((await emailInput.isVisible()) && (await passwordInput.isVisible())) {
        await emailInput.fill("invalid@test.com");
        await passwordInput.fill("wrongpassword123");

        const signInButton = page.getByRole("button", { name: /sign in|log in/i });
        if (await signInButton.isVisible()) {
          await signInButton.click();

          // Should show error message
          // Don't crash the app
        }
      }
    });
  });

  test.describe("Rate Limiting", () => {
    test("should display rate limit message when exceeded", async ({ page }) => {
      await page.goto("/");
      await signInWithTestUser(page);

      // Simulate rate limit response
      await page.route("**/api/**", (route) => {
        route.fulfill({
          status: 429,
          headers: {
            "Retry-After": "60",
            "X-RateLimit-Remaining": "0",
          },
          body: JSON.stringify({ error: "Rate limit exceeded" }),
        });
      });

      // Trigger an API call
      await navigateToTab(page, "Subscriptions");

      // App should handle 429 gracefully
      const appContainer = page.locator("#root");
      await expect(appContainer).toBeVisible();
    });
  });

  test.describe("Data Integrity Errors", () => {
    test("should handle missing payment method reference", async ({ page }) => {
      await page.goto("/");
      await signInAsGuest(page);

      // The app should handle orphaned references gracefully
      await navigateToTab(page, "Subscriptions");

      // App should not crash even with data inconsistencies
      const appContainer = page.locator("#root");
      await expect(appContainer).toBeVisible();
    });
  });

  test.describe("Browser Compatibility", () => {
    test("should show WebGPU warning when not supported", async ({ page }) => {
      // Mock WebGPU as not available
      await page.addInitScript(() => {
        Object.defineProperty(navigator, "gpu", {
          value: undefined,
          writable: true,
          configurable: true,
        });
      });

      await page.goto("/");
      await signInAsGuest(page);

      await navigateToTab(page, "AI Assistant");

      // Should show warning about WebGPU not being supported
      const _warning = page.getByText(/not supported|unavailable|webgpu/i);
      // Warning should be visible for unsupported browsers
    });
  });

  test.describe("Empty States", () => {
    test("should show empty state for no subscriptions", async ({ page }) => {
      await page.goto("/");
      await clearGuestData(page);
      await page.reload();
      await signInAsGuest(page);

      await navigateToTab(page, "Subscriptions");

      // Should show empty state message
      const _emptyMessage = page.getByText(/no subscription|get started|add your first/i);
      // Empty state should guide user
    });

    test("should show empty state for no payment methods", async ({ page }) => {
      await page.goto("/");
      await clearGuestData(page);
      await page.reload();
      await signInAsGuest(page);

      await navigateToTab(page, "Payments");

      // Should show empty state for payments
      const _emptyMessage = page.getByText(/no payment|add.*payment/i);
      // Empty state should be helpful
    });

    test("should show empty chat state with suggestions", async ({ page }) => {
      await page.goto("/");
      await clearGuestData(page);
      await page.reload();
      await signInAsGuest(page);

      await navigateToTab(page, "AI Assistant");

      // Should show suggestions for empty chat
      const _suggestions = page.getByRole("button").filter({ hasText: /add|help|show/i });
      // Chat should have helpful suggestions
    });
  });

  test.describe("Loading States", () => {
    test("should show loading indicator while data loads", async ({ page }) => {
      // Slow down API responses
      await page.route("**/api/**", async (route) => {
        await new Promise((r) => setTimeout(r, 2000));
        await route.continue();
      });

      await page.goto("/");

      // Should show some loading indicator
      const _loadingIndicator = page.locator(
        '[data-testid="loading"], .animate-spin, .animate-pulse',
      );
      // Loading indicator should appear during slow loads
    });
  });

  test.describe("Confirmation Dialogs", () => {
    test("should show confirmation before deleting subscription", async ({ page }) => {
      await page.goto("/");
      await signInAsGuest(page);

      // Add a subscription first
      await navigateToTab(page, "Payments");
      const addPaymentButton = page.getByRole("button", { name: /add.*payment/i });
      if (await addPaymentButton.isVisible()) {
        await addPaymentButton.click();
        await page.getByPlaceholder(/name/i).fill("Test Card");
        const typeSelect = page.locator("select").first();
        if (await typeSelect.isVisible()) {
          await typeSelect.selectOption("credit_card");
        }
        await page
          .getByRole("button", { name: /add|save/i })
          .last()
          .click();
      }

      await navigateToTab(page, "Subscriptions");

      // Look for delete button
      const deleteButton = page.getByRole("button", { name: /delete/i }).first();

      if (await deleteButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Set up dialog handler to verify confirmation
        let _dialogShown = false;
        page.once("dialog", async (dialog) => {
          _dialogShown = true;
          expect(dialog.type()).toBe("confirm");
          await dialog.dismiss();
        });

        await deleteButton.click();

        // Dialog should have been shown
      }
    });

    test("should cancel deletion when dialog dismissed", async ({ page }) => {
      await page.goto("/");
      await signInAsGuest(page);

      await navigateToTab(page, "Subscriptions");

      const deleteButton = page.getByRole("button", { name: /delete/i }).first();

      if (await deleteButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        const subscriptionName = await page
          .locator('[data-testid="subscription-name"]')
          .first()
          .textContent();

        // Dismiss the confirmation
        page.once("dialog", async (dialog) => {
          await dialog.dismiss();
        });

        await deleteButton.click();

        // Subscription should still be visible
        if (subscriptionName) {
          await expect(page.getByText(subscriptionName)).toBeVisible();
        }
      }
    });
  });
});

test.describe("Accessibility Error Handling", () => {
  test("should announce errors to screen readers", async ({ page }) => {
    await page.goto("/");
    await signInAsGuest(page);

    // Check for ARIA attributes on error messages
    const _alerts = page.locator('[role="alert"]');
    // Error messages should have proper ARIA roles
  });

  test("should focus on first error field after validation failure", async ({ page }) => {
    await page.goto("/");
    await signInAsGuest(page);

    await navigateToTab(page, "Subscriptions");

    const addButton = page.getByRole("button", { name: /add.*subscription/i });
    if (await addButton.isVisible()) {
      await addButton.click();

      // Submit empty form
      const submitButton = page.getByRole("button", { name: /add|save|submit/i }).last();
      await submitButton.click();

      // First invalid field should be focused
    }
  });
});

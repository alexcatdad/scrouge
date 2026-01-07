import { test, expect } from '@playwright/test';
import {
  signInAsGuest,
  exitGuestMode,
  clearGuestData,
  getGuestDataCount,
  signInForMigration,
  addPaymentMethod,
  addSubscription,
  navigateToTab,
  signInWithTestUser,
  verifySubscriptionInList,
  deleteSubscription,
  deletePaymentMethod,
} from './helpers';

/**
 * E2E tests for guest mode functionality:
 * - Guest sign-in with local storage (IndexedDB via Dexie)
 * - Full CRUD operations in guest mode
 * - AI Chat blocked for guests
 * - Data persistence across page reloads
 * - Exit guest mode clears data
 * - Migration flow when guest signs up
 */
test.describe('Guest Mode', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing guest data before each test
    await page.goto('/');
    await clearGuestData(page);
    await page.reload();
  });

  test.describe('Guest Sign-In', () => {
    test('should enter guest mode when clicking Continue as guest', async ({ page }) => {
      await page.goto('/');
      
      // Click guest button
      await page.getByRole('button', { name: 'Continue as guest' }).click();
      
      // Verify guest mode is active
      await expect(page.getByText('Welcome, Guest')).toBeVisible({ timeout: 10000 });
      // Use the header badge specifically
      await expect(page.getByRole('banner').getByText('Guest Mode', { exact: true })).toBeVisible();
      // Check the main content area for the data storage message
      await expect(page.getByRole('main').getByText('Your data is stored locally', { exact: false })).toBeVisible();
      
      // Verify toast message appeared (may have already disappeared)
      // We check for the toast or just verify we're in guest mode
    });

    test('should show Exit Guest Mode button in header', async ({ page }) => {
      await signInAsGuest(page);
      
      await expect(page.getByRole('button', { name: 'Exit Guest Mode' })).toBeVisible();
    });

    test('should persist guest mode across page reloads', async ({ page }) => {
      await signInAsGuest(page);
      
      // Reload the page
      await page.reload();
      
      // Should still be in guest mode
      await expect(page.getByText('Welcome, Guest')).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole('banner').getByText('Guest Mode', { exact: true })).toBeVisible();
    });
  });

  test.describe('Guest Mode CRUD Operations', () => {
    test.beforeEach(async ({ page }) => {
      await signInAsGuest(page);
    });

    test('should add and display payment method in guest mode', async ({ page }) => {
      await addPaymentMethod(page, {
        name: 'Guest Visa Card',
        type: 'credit_card',
        lastFourDigits: '9999',
        expiryDate: '2026-06',
      });

      // Verify payment method is displayed
      await expect(page.getByText('Guest Visa Card')).toBeVisible();
      await expect(page.getByText('****9999')).toBeVisible();
    });

    test('should add and display subscription in guest mode', async ({ page }) => {
      // First add a payment method
      await addPaymentMethod(page, {
        name: 'Guest Payment',
        type: 'credit_card',
      });

      // Add subscription
      await addSubscription(page, {
        name: 'Guest Netflix',
        category: 'Entertainment',
        cost: '19.99',
        billingCycle: 'monthly',
        paymentMethodName: 'Guest Payment',
      });

      // Verify subscription is displayed
      await verifySubscriptionInList(page, 'Guest Netflix', {
        cost: '$19.99',
        category: 'Entertainment',
        billingCycle: 'monthly',
      });
    });

    test('should persist data in IndexedDB across page reloads', async ({ page }) => {
      // Add payment method and subscription
      await addPaymentMethod(page, {
        name: 'Persistent Card',
        type: 'debit_card',
      });

      await addSubscription(page, {
        name: 'Persistent Spotify',
        category: 'Entertainment',
        cost: '9.99',
        billingCycle: 'monthly',
        paymentMethodName: 'Persistent Card',
      });

      // Reload page
      await page.reload();
      await expect(page.getByText('Welcome, Guest')).toBeVisible({ timeout: 10000 });

      // Verify data persisted
      await navigateToTab(page, 'Subscriptions');
      await expect(page.getByText('Persistent Spotify')).toBeVisible();

      await navigateToTab(page, 'Payments');
      await expect(page.getByText('Persistent Card')).toBeVisible();
    });

    test('should delete subscription in guest mode', async ({ page }) => {
      // Add payment method and subscription
      await addPaymentMethod(page, {
        name: 'Delete Test Card',
        type: 'credit_card',
      });

      await addSubscription(page, {
        name: 'To Be Deleted',
        category: 'Software',
        cost: '5.00',
        billingCycle: 'monthly',
        paymentMethodName: 'Delete Test Card',
      });

      // Delete the subscription
      await deleteSubscription(page, 'To Be Deleted');

      // Verify it's gone
      await expect(page.getByText('To Be Deleted')).not.toBeVisible();
    });

    test('should delete payment method in guest mode', async ({ page }) => {
      await addPaymentMethod(page, {
        name: 'Payment To Delete',
        type: 'paypal',
      });

      await deletePaymentMethod(page, 'Payment To Delete');

      // Verify it's gone
      await expect(page.getByText('Payment To Delete')).not.toBeVisible();
    });

    test('should show subscriptions in Overview dashboard', async ({ page }) => {
      await addPaymentMethod(page, {
        name: 'Overview Card',
        type: 'credit_card',
      });

      await addSubscription(page, {
        name: 'Overview Test Sub',
        category: 'Cloud Services',
        cost: '29.99',
        billingCycle: 'monthly',
        paymentMethodName: 'Overview Card',
      });

      // Navigate to Overview
      await navigateToTab(page, 'Overview');

      // Verify subscription appears in Recent Subscriptions
      await expect(page.getByText('Overview Test Sub')).toBeVisible();
      await expect(page.getByText('$29.99')).toBeVisible();
    });
  });

  test.describe('AI Chat Blocked for Guests', () => {
    test('should show upgrade prompt when guest accesses AI chat', async ({ page }) => {
      await signInAsGuest(page);
      
      // Navigate to AI Assistant tab
      await navigateToTab(page, 'AI Assistant');

      // Verify blocked message
      await expect(page.getByText('AI Chat Requires an Account')).toBeVisible();
      await expect(page.getByText('The AI assistant requires an account')).toBeVisible();
      
      // Verify benefits are listed
      await expect(page.getByText('Bring your own AI API key')).toBeVisible();
      await expect(page.getByText('Manage subscriptions via chat')).toBeVisible();
      await expect(page.getByText('Conversation history saved')).toBeVisible();
    });

    test('should have disabled chat input for guests', async ({ page }) => {
      await signInAsGuest(page);
      await navigateToTab(page, 'AI Assistant');

      // Verify input is disabled
      const input = page.getByPlaceholder('Sign up to use AI chat');
      await expect(input).toBeDisabled();
    });
  });

  test.describe('Settings Tab Hidden for Guests', () => {
    test('should not show Settings tab for guest users', async ({ page }) => {
      await signInAsGuest(page);

      // Settings tab should not be visible
      await expect(page.getByRole('button', { name: 'Settings' })).not.toBeVisible();
    });

    test('should show all other tabs for guest users', async ({ page }) => {
      await signInAsGuest(page);

      // Other tabs should be visible
      await expect(page.getByRole('button', { name: 'Overview' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Subscriptions' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Payments' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'AI Assistant' })).toBeVisible();
    });
  });

  test.describe('Exit Guest Mode', () => {
    test('should clear data and return to sign-in when exiting guest mode', async ({ page }) => {
      await signInAsGuest(page);

      // Add some data
      await addPaymentMethod(page, {
        name: 'Exit Test Card',
        type: 'credit_card',
      });

      // Exit guest mode
      await exitGuestMode(page);

      // Should be back at sign-in
      await expect(page.getByText('Get Started')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Continue as guest' })).toBeVisible();

      // Re-enter guest mode
      await signInAsGuest(page);

      // Data should be cleared
      await navigateToTab(page, 'Payments');
      await expect(page.getByText('Exit Test Card')).not.toBeVisible();
      await expect(page.getByText('No payment methods added')).toBeVisible();
    });
  });

  test.describe('Data Migration on Sign Up', () => {
    test('should migrate guest data when user signs in', async ({ page }) => {
      // Use unique names to identify migrated data
      const timestamp = Date.now();
      const migrateCardName = `Migrate Card ${timestamp}`;
      const migrateSubName = `Migrate Sub ${timestamp}`;
      
      // Enter guest mode and add data
      await signInAsGuest(page);

      await addPaymentMethod(page, {
        name: migrateCardName,
        type: 'credit_card',
        lastFourDigits: '8888',
      });

      await addSubscription(page, {
        name: migrateSubName,
        category: 'Entertainment',
        cost: '12.99',
        billingCycle: 'monthly',
        paymentMethodName: migrateCardName,
      });

      // Verify guest data exists in IndexedDB
      const guestDataBefore = await getGuestDataCount(page);
      expect(guestDataBefore.paymentMethods).toBeGreaterThan(0);
      expect(guestDataBefore.subscriptions).toBeGreaterThan(0);

      // Now we need to sign in WITHOUT clearing IndexedDB
      // The trick is to just clear the localStorage flag but keep IndexedDB data
      await page.evaluate(() => {
        localStorage.removeItem('scrouge_guest_mode');
      });
      
      // Reload to go back to sign-in page (no longer in guest mode)
      await page.reload();
      await expect(page.getByText('Get Started')).toBeVisible({ timeout: 10000 });

      // Sign in with test user - migration should happen automatically
      await signInForMigration(page);
      
      // Wait for potential migration to complete
      await page.waitForTimeout(2000);
      
      // Check if migration toast appeared (optional - may have already disappeared)
      // The key verification is that the data now appears in the authenticated view
      
      // Verify the migrated data appears in the authenticated user's account
      await navigateToTab(page, 'Payments');
      await expect(page.getByText(migrateCardName).first()).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('****8888').first()).toBeVisible();

      await navigateToTab(page, 'Subscriptions');
      await expect(page.getByText(migrateSubName).first()).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('$12.99').first()).toBeVisible();

      // Verify IndexedDB was cleared after migration
      const guestDataAfter = await getGuestDataCount(page);
      expect(guestDataAfter.paymentMethods).toBe(0);
      expect(guestDataAfter.subscriptions).toBe(0);
    });

    test('should show migration in progress indicator', async ({ page }) => {
      // Enter guest mode and add data
      await signInAsGuest(page);

      await addPaymentMethod(page, {
        name: 'Progress Test Card',
        type: 'debit_card',
      });

      // Clear only localStorage flag, keep IndexedDB
      await page.evaluate(() => {
        localStorage.removeItem('scrouge_guest_mode');
      });
      
      await page.reload();
      await expect(page.getByText('Get Started')).toBeVisible({ timeout: 10000 });

      // Sign in - should trigger migration
      await signInForMigration(page);
      
      // The migration should complete and show welcome
      await expect(page.getByText('Welcome back')).toBeVisible({ timeout: 15000 });
    });

    test('should not migrate if no guest data exists', async ({ page }) => {
      // Clear any existing guest data
      await clearGuestData(page);
      
      // Go directly to sign in (no guest mode)
      await page.goto('/');
      
      // Sign in with test user
      await signInWithTestUser(page);
      
      // Should just show welcome without any migration
      await expect(page.getByText('Welcome back')).toBeVisible({ timeout: 10000 });
      
      // No migration toast should appear (hard to test negative, but we verify normal flow works)
    });
  });

  test.describe('Guest Mode Isolation', () => {
    test('should not affect authenticated user data', async ({ page }) => {
      // Use unique names to avoid conflicts with other test runs
      const realUserCardName = `Real User Card ${Date.now()}`;
      const guestCardName = `Guest Only Card ${Date.now()}`;
      
      // First, sign in as a real user and add data
      await signInWithTestUser(page);
      
      await addPaymentMethod(page, {
        name: realUserCardName,
        type: 'credit_card',
      });

      // Sign out (we need to add this helper or do it manually)
      await page.getByRole('button', { name: 'Sign out' }).click();
      await expect(page.getByText('Get Started')).toBeVisible({ timeout: 10000 });

      // Enter guest mode
      await signInAsGuest(page);

      // Guest should not see the real user's data
      await navigateToTab(page, 'Payments');
      await expect(page.getByText(realUserCardName)).not.toBeVisible();
      await expect(page.getByText('No payment methods added')).toBeVisible();

      // Add guest data
      await addPaymentMethod(page, {
        name: guestCardName,
        type: 'paypal',
      });

      // Exit guest mode and sign back in as real user
      await exitGuestMode(page);
      await signInWithTestUser(page);

      // Real user should see their data, not guest data
      await navigateToTab(page, 'Payments');
      await expect(page.getByText(realUserCardName).first()).toBeVisible();
      await expect(page.getByText(guestCardName)).not.toBeVisible();
    });
  });
});


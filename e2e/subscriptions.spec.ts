import { test } from '@playwright/test';
import {
  signInAsGuest,
  addPaymentMethod,
  addSubscription,
  verifySubscriptionInList,
  verifySubscriptionInOverview,
} from './helpers';

/**
 * Integration tests that verify the full happy path flow across multiple features.
 * Individual CRUD operations are tested in payment-methods.spec.ts and subscriptions-crud.spec.ts
 */
test.describe('Subscriptions Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in as guest before each test
    await signInAsGuest(page);
  });

  test('should complete full subscription flow end-to-end', async ({ page }) => {
    // Step 1: Add payment method
    await addPaymentMethod(page, {
      name: 'Test Visa Card',
      type: 'credit_card',
      lastFourDigits: '1234',
      expiryDate: '2025-12',
    });

    // Step 2: Add subscription
    await addSubscription(page, {
      name: 'Netflix',
      category: 'Entertainment',
      cost: '15.99',
      billingCycle: 'monthly',
      paymentMethodName: 'Test Visa Card',
    });

    // Step 3: Verify in subscriptions list
    await verifySubscriptionInList(page, 'Netflix', {
      cost: '$15.99',
      category: 'Entertainment',
      billingCycle: 'monthly',
    });

    // Step 4: Verify in overview dashboard
    await verifySubscriptionInOverview(page, 'Netflix', {
      cost: '$15.99',
      category: 'Entertainment',
    });
  });

  test('should show subscription in overview dashboard after creation', async ({ page }) => {
    // Add payment method
    await addPaymentMethod(page, {
      name: 'Test Visa Card',
      type: 'credit_card',
    });

    // Add subscription
    await addSubscription(page, {
      name: 'Spotify',
      category: 'Entertainment',
      cost: '9.99',
      billingCycle: 'monthly',
      paymentMethodName: 'Test Visa Card',
    });

    // Verify in overview
    await verifySubscriptionInOverview(page, 'Spotify', {
      cost: '$9.99',
      category: 'Entertainment',
    });
  });
});


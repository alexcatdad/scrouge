import { Page, expect } from '@playwright/test';

const TEST_USER = {
  email: 'e2e-test@scrouge.local',
  password: 'E2ETestPassword123!',
};

/**
 * Signs in as a guest user (local storage mode - no DB persistence)
 */
export async function signInAsGuest(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Continue as guest' }).click();
  // Guest mode shows "Welcome, Guest" and "Guest Mode" badge in header
  await expect(page.getByText('Welcome, Guest')).toBeVisible({ timeout: 10000 });
  // Use the header badge specifically (first match in banner)
  await expect(page.getByRole('banner').getByText('Guest Mode', { exact: true })).toBeVisible();
}

/**
 * Exits guest mode and clears local data
 */
export async function exitGuestMode(page: Page) {
  await page.getByRole('button', { name: 'Exit Guest Mode' }).click();
  // Should return to sign-in page
  await expect(page.getByText('Get Started')).toBeVisible({ timeout: 10000 });
}

/**
 * Checks if the page is in guest mode
 */
export async function isInGuestMode(page: Page): Promise<boolean> {
  return page.getByText('Guest Mode').isVisible();
}

/**
 * Clears IndexedDB data for guest mode (useful for test cleanup)
 */
export async function clearGuestData(page: Page) {
  await page.evaluate(async () => {
    const databases = await indexedDB.databases();
    for (const db of databases) {
      if (db.name === 'scrougeGuest') {
        indexedDB.deleteDatabase(db.name);
      }
    }
    localStorage.removeItem('scrouge_guest_mode');
  });
}

/**
 * Gets the count of items in guest IndexedDB
 */
export async function getGuestDataCount(page: Page): Promise<{ subscriptions: number; paymentMethods: number }> {
  return await page.evaluate(async () => {
    return new Promise((resolve) => {
      const request = indexedDB.open('scrougeGuest');
      request.onsuccess = () => {
        const db = request.result;
        try {
          const subTx = db.transaction('subscriptions', 'readonly');
          const subStore = subTx.objectStore('subscriptions');
          const subCountReq = subStore.count();
          
          subCountReq.onsuccess = () => {
            const subCount = subCountReq.result;
            
            const pmTx = db.transaction('paymentMethods', 'readonly');
            const pmStore = pmTx.objectStore('paymentMethods');
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
  await page.goto('/');
  
  // Wait for the page to load - it might briefly show guest mode
  await page.waitForTimeout(500);
  
  // Fill credentials
  await page.getByPlaceholder('Email address').fill(TEST_USER.email);
  await page.getByPlaceholder('Password').fill(TEST_USER.password);
  
  // Try sign in first
  await page.getByRole('button', { name: 'Sign in' }).click();
  
  // Wait for either success or error toast
  const result = await Promise.race([
    page.getByText('Welcome back').waitFor({ timeout: 15000 }).then(() => 'success' as const),
    page.getByText('Could not sign in').first().waitFor({ timeout: 5000 }).then(() => 'needs_signup' as const).catch(() => null),
  ]);
  
  if (result === 'needs_signup') {
    // User doesn't exist - switch to sign up
    await page.getByRole('button', { name: 'Sign up' }).click();
    await page.getByPlaceholder('Email address').fill(TEST_USER.email);
    await page.getByPlaceholder('Password').fill(TEST_USER.password);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Welcome back')).toBeVisible({ timeout: 15000 });
  }
}

/**
 * Signs in with a known test user (password auth).
 * Automatically creates the user if it doesn't exist yet.
 */
export async function signInWithTestUser(page: Page) {
  await page.goto('/');
  
  // Fill credentials
  await page.getByPlaceholder('Email address').fill(TEST_USER.email);
  await page.getByPlaceholder('Password').fill(TEST_USER.password);
  
  // Try sign in first
  await page.getByRole('button', { name: 'Sign in' }).click();
  
  // Wait for either success or error toast
  const result = await Promise.race([
    page.getByText('Welcome back').waitFor({ timeout: 10000 }).then(() => 'success' as const),
    page.getByText('Could not sign in').first().waitFor({ timeout: 5000 }).then(() => 'needs_signup' as const).catch(() => null),
  ]);
  
  if (result === 'needs_signup') {
    // User doesn't exist - switch to sign up
    await page.getByRole('button', { name: 'Sign up' }).click();
    await page.getByPlaceholder('Email address').fill(TEST_USER.email);
    await page.getByPlaceholder('Password').fill(TEST_USER.password);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Welcome back')).toBeVisible({ timeout: 10000 });
  }
  // If result is 'success', we're already done - Welcome back is visible
}

/**
 * Navigates to a specific tab in the dashboard
 */
export async function navigateToTab(page: Page, tabName: 'Overview' | 'Subscriptions' | 'Payments' | 'AI Assistant' | 'Settings') {
  await page.getByRole('button', { name: tabName }).click();
  await page.waitForTimeout(500); // Wait for tab to be active
}

/**
 * Adds a payment method
 */
export async function addPaymentMethod(
  page: Page,
  options: {
    name: string;
    type?: 'credit_card' | 'debit_card' | 'bank_account' | 'paypal' | 'other';
    lastFourDigits?: string;
    expiryDate?: string;
  }
) {
  await navigateToTab(page, 'Payments');
  
  // Click "Add Payment Method" button
  await page.getByRole('button', { name: 'Add Payment Method' }).click();
  
  // Wait for form to be visible
  await expect(page.getByText('Add Payment Method').first()).toBeVisible();
  
  // Fill in payment method form
  await page.getByPlaceholder('My Visa Card, Chase Checking, etc.').fill(options.name);
  
  if (options.type) {
    await page.locator('form').filter({ hasText: 'Add Payment Method' }).locator('select').first().selectOption(options.type);
  }
  
  if (options.lastFourDigits) {
    await page.getByPlaceholder('1234').fill(options.lastFourDigits);
  }
  
  if (options.expiryDate) {
    await page.locator('input[type="month"]').fill(options.expiryDate);
  }
  
  // Submit the form
  await page.getByRole('button', { name: 'Add Payment Method' }).last().click();
  
  // Wait for success toast
  await expect(page.getByText('Payment method added!').first()).toBeVisible();
  
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
    billingCycle: 'monthly' | 'yearly' | 'weekly' | 'daily';
    paymentMethodName?: string;
    description?: string;
    website?: string;
  }
) {
  await navigateToTab(page, 'Subscriptions');
  
  // Click "Add New Subscription" button
  await page.getByRole('button', { name: 'Add New Subscription' }).click();
  
  // Wait for form to be visible
  await expect(page.getByText('Add New Subscription').first()).toBeVisible();
  
  // Fill in subscription form
  await page.getByPlaceholder('Netflix, Spotify, etc.').fill(options.name);
  
  // Wait for form to be fully rendered
  await page.waitForTimeout(500);
  
  // Select category
  await page.locator('select').filter({ has: page.locator(`option:has-text("${options.category}")`) }).selectOption(options.category);
  
  // Fill cost
  await page.getByPlaceholder('9.99').fill(options.cost);
  
  // Select billing cycle
  const billingCycleLabel = options.billingCycle.charAt(0).toUpperCase() + options.billingCycle.slice(1);
  await page.locator('select').filter({ has: page.locator(`option:has-text("${billingCycleLabel}")`) }).selectOption(options.billingCycle);
  
  // Select payment method if specified
  if (options.paymentMethodName) {
    await page.waitForTimeout(500);
    const paymentMethodSelect = page.locator('select').filter({ has: page.locator(`option:has-text("${options.paymentMethodName}")`) });
    await paymentMethodSelect.selectOption({ index: 1 }); // Index 1 = first actual payment method (0 is placeholder)
  }
  
  // Optional fields
  if (options.description) {
    await page.getByPlaceholder('Brief description of the service').fill(options.description);
  }
  
  if (options.website) {
    await page.getByPlaceholder('https://example.com').fill(options.website);
  }
  
  // Submit the form
  await page.getByRole('button', { name: 'Add Subscription' }).click();
  
  // Wait for success toast
  await expect(page.getByText('Subscription added successfully!').first()).toBeVisible();
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
  }
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
  }
) {
  await navigateToTab(page, 'Overview');
  
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
  await navigateToTab(page, 'Payments');
  
  // Find the payment method by finding the heading with the name, then navigate to the card container
  const heading = page.locator('h4').filter({ hasText: name }).first();
  const paymentMethodCard = heading.locator('xpath=ancestor::div[contains(@class, "p-6")]');
  await paymentMethodCard.getByRole('button', { name: 'Set Default' }).first().click();
  
  // Wait for success toast
  await expect(page.getByText('Default payment method updated').first()).toBeVisible();
  
  // Verify it shows "Default" badge within the card
  await expect(paymentMethodCard.getByText('Default').first()).toBeVisible();
}

/**
 * Deletes a payment method (handles confirm dialog)
 */
export async function deletePaymentMethod(page: Page, name: string) {
  await navigateToTab(page, 'Payments');
  
  // Set up dialog handler to accept confirmation
  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain(name);
    await dialog.accept();
  });
  
  // Find the payment method by finding the heading with the name, then navigate to the card container
  const heading = page.locator('h4').filter({ hasText: name }).first();
  const paymentMethodCard = heading.locator('xpath=ancestor::div[contains(@class, "p-6")]');
  await paymentMethodCard.getByRole('button', { name: 'Delete' }).first().click();
  
  // Wait for success toast
  await expect(page.getByText('Payment method deleted').first()).toBeVisible();
  
  // Verify payment method is no longer visible (wait a bit for the UI to update)
  await page.waitForTimeout(500);
  await expect(page.getByText(name).first()).not.toBeVisible();
}

/**
 * Toggles subscription active status (pause/activate)
 */
export async function toggleSubscriptionActive(page: Page, name: string, expectedStatus: 'active' | 'paused') {
  await navigateToTab(page, 'Subscriptions');
  
  // Find the subscription by finding the heading with the name, then navigate to the card container
  const heading = page.locator('h4').filter({ hasText: name }).first();
  const subscriptionCard = heading.locator('xpath=ancestor::div[contains(@class, "p-6")]');
  
  // Click the appropriate button based on current status
  const buttonText = expectedStatus === 'active' ? 'Activate' : 'Pause';
  await subscriptionCard.getByRole('button', { name: buttonText }).first().click();
  
  // Wait for success toast
  const expectedToast = expectedStatus === 'active' ? 'activated' : 'paused';
  await expect(page.getByText(new RegExp(`Subscription ${expectedToast}`, 'i')).first()).toBeVisible();
  
  // Wait a bit for UI to update
  await page.waitForTimeout(500);
}

/**
 * Deletes a subscription (handles confirm dialog)
 */
export async function deleteSubscription(page: Page, name: string) {
  await navigateToTab(page, 'Subscriptions');
  
  // Set up dialog handler to accept confirmation
  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain(name);
    await dialog.accept();
  });
  
  // Find the subscription by finding the heading with the name, then navigate to the card container
  const heading = page.locator('h4').filter({ hasText: name }).first();
  const subscriptionCard = heading.locator('xpath=ancestor::div[contains(@class, "p-6")]');
  await subscriptionCard.getByRole('button', { name: 'Delete' }).first().click();
  
  // Wait for success toast
  await expect(page.getByText('Subscription deleted').first()).toBeVisible();
  
  // Wait a bit for UI to update
  await page.waitForTimeout(500);
  
  // Verify subscription is no longer visible
  await expect(page.getByText(name).first()).not.toBeVisible();
}

/**
 * Filters subscriptions by status
 */
export async function filterSubscriptions(page: Page, filter: 'all' | 'active' | 'inactive') {
  await navigateToTab(page, 'Subscriptions');
  
  // Find the filter select and change it
  const filterSelect = page.locator('select').filter({ has: page.locator('option:has-text("All")') });
  await filterSelect.selectOption(filter);
  
  // Wait a bit for the filter to apply
  await page.waitForTimeout(300);
}


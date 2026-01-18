import { chromium } from '@playwright/test';
import * as fs from 'fs';

const credentials = JSON.parse(fs.readFileSync('./e2e/test-credentials.json', 'utf-8'));

// Test mode: 'auth' for authenticated, 'guest' for guest mode
const mode = process.argv[2] || 'auth';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.setViewportSize({ width: 1280, height: 800 });

  if (mode === 'guest') {
    console.log('Testing GUEST mode...');

    // Go to home page and click "Try without an account"
    await page.goto('http://localhost:5173/');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/scrouge-guest-home.png', fullPage: true });

    // Click the guest mode button
    const guestButton = page.locator('text=Try without an account');
    if (await guestButton.isVisible()) {
      console.log('Clicking "Try without an account"...');
      await guestButton.click();
      await page.waitForTimeout(2000);
    }

    console.log('After guest click, URL:', page.url());
    await page.screenshot({ path: '/tmp/scrouge-guest-dashboard.png', fullPage: true });

    // Navigate to wizard
    await page.goto('http://localhost:5173/wizard');
    await page.waitForTimeout(2000);
    console.log('Wizard URL:', page.url());
    await page.screenshot({ path: '/tmp/scrouge-guest-wizard.png', fullPage: true });

    console.log('Guest mode screenshots saved:');
    console.log('- /tmp/scrouge-guest-home.png');
    console.log('- /tmp/scrouge-guest-dashboard.png');
    console.log('- /tmp/scrouge-guest-wizard.png');

  } else {
    console.log('Testing AUTHENTICATED mode...');

    // Go to sign-up page and create test user (or sign in if already exists)
    await page.goto('http://localhost:5173/sign-up');
    await page.waitForTimeout(2000);

    // Try to sign up first
    const emailInput = page.locator('#email');
    const passwordInput = page.locator('#password');
    const confirmPasswordInput = page.locator('#confirmPassword');
    const nameInput = page.locator('#name');

    console.log('On sign-up page, attempting to create test user...');

    if (await emailInput.isVisible()) {
      // Fill optional name
      if (await nameInput.isVisible()) {
        await nameInput.fill('Test User');
      }

      await emailInput.fill(credentials.testUser.email);
      await passwordInput.fill(credentials.testUser.password);

      // Fill confirm password if visible
      if (await confirmPasswordInput.isVisible()) {
        await confirmPasswordInput.fill(credentials.testUser.password);
      }

      // Look for sign up button
      const signUpButton = page.locator('button[type="submit"]');
      await signUpButton.click();

      // Wait for navigation or error
      await page.waitForTimeout(3000);
    }

    // Check if we're still on auth page (might need to sign in instead)
    let currentUrl = page.url();
    console.log('After sign-up attempt, URL:', currentUrl);

    if (currentUrl.includes('sign-in') || currentUrl.includes('sign-up')) {
      console.log('Trying to sign in...');
      await page.goto('http://localhost:5173/sign-in');
      await page.waitForTimeout(2000);

      await page.locator('#email').fill(credentials.testUser.email);
      await page.locator('#password').fill(credentials.testUser.password);
      await page.locator('button[type="submit"]').click();

      await page.waitForTimeout(3000);
    }

    // Take screenshot of current page (should be dashboard after auth)
    console.log('Current URL:', page.url());
    await page.screenshot({ path: '/tmp/scrouge-auth-result.png', fullPage: true });

    // Navigate to dashboard
    await page.goto('http://localhost:5173/dashboard');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/scrouge-dashboard.png', fullPage: true });

    // Navigate to subscriptions page
    await page.goto('http://localhost:5173/dashboard/subscriptions');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/scrouge-subscriptions.png', fullPage: true });

    // Navigate to add subscription page
    await page.goto('http://localhost:5173/dashboard/subscriptions/new');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/scrouge-new-subscription.png', fullPage: true });

    console.log('Screenshots saved to /tmp/');
    console.log('- /tmp/scrouge-auth-result.png');
    console.log('- /tmp/scrouge-dashboard.png');
    console.log('- /tmp/scrouge-subscriptions.png');
    console.log('- /tmp/scrouge-new-subscription.png');
  }

  await browser.close();
})();

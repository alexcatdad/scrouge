import { test, expect } from '@playwright/test';
import { signInWithTestUser } from './helpers';

/**
 * Tests for password-based authentication with known test user
 */
test.describe('Password Auth', () => {
  test('should sign in with test user (auto-creates if needed)', async ({ page }) => {
    await signInWithTestUser(page);
    
    // Verify we're signed in by checking for dashboard elements
    await expect(page.getByText('Welcome back')).toBeVisible();
  });

  test('should persist user session across page reloads', async ({ page }) => {
    await signInWithTestUser(page);
    await expect(page.getByText('Welcome back')).toBeVisible();
    
    // Reload the page
    await page.reload();
    
    // Should still be signed in
    await expect(page.getByText('Welcome back')).toBeVisible({ timeout: 5000 });
  });
});


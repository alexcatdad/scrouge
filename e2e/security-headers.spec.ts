import { test, expect } from '@playwright/test';

/**
 * Tests for security headers on the Bun server
 */
test.describe('Security Headers', () => {
  test('should include X-Frame-Options header', async ({ request }) => {
    const response = await request.get('/');
    expect(response.headers()['x-frame-options']).toBe('DENY');
  });

  test('should include X-Content-Type-Options header', async ({ request }) => {
    const response = await request.get('/');
    expect(response.headers()['x-content-type-options']).toBe('nosniff');
  });

  test('should include X-XSS-Protection header', async ({ request }) => {
    const response = await request.get('/');
    expect(response.headers()['x-xss-protection']).toBe('1; mode=block');
  });

  test('should include Referrer-Policy header', async ({ request }) => {
    const response = await request.get('/');
    expect(response.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });

  test('should include Permissions-Policy header', async ({ request }) => {
    const response = await request.get('/');
    const permissionsPolicy = response.headers()['permissions-policy'];
    expect(permissionsPolicy).toContain('camera=()');
    expect(permissionsPolicy).toContain('microphone=()');
    expect(permissionsPolicy).toContain('geolocation=()');
  });

  test('should include Content-Security-Policy header', async ({ request }) => {
    const response = await request.get('/');
    const csp = response.headers()['content-security-policy'];
    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  test('should include security headers on static files', async ({ request }) => {
    const response = await request.get('/src/dist.css');
    expect(response.headers()['x-frame-options']).toBe('DENY');
    expect(response.headers()['x-content-type-options']).toBe('nosniff');
  });

  test('should include security headers on 404 responses', async ({ request }) => {
    const response = await request.get('/nonexistent-page');
    expect(response.status()).toBe(404);
    expect(response.headers()['x-frame-options']).toBe('DENY');
    expect(response.headers()['x-content-type-options']).toBe('nosniff');
  });

  test('health endpoint should not require security headers', async ({ request }) => {
    const response = await request.get('/health');
    expect(response.status()).toBe(200);
    expect(await response.text()).toBe('ok');
    // Health endpoint doesn't need security headers
  });
});


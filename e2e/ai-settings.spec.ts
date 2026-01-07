import { test, expect } from '@playwright/test';
import {
  signInAsGuest,
  signInWithTestUser,
  navigateToAISettings,
  selectAIProvider,
  saveAISettings,
  deleteAISettings,
  verifyAISettingsConfigured,
  mockWebGPUSupport,
  verifyWebGPUNotSupportedWarning,
  verifyWebGPUSupported,
} from './helpers';

test.describe('AI Settings Page', () => {
  // Note: Settings tab is hidden for guest users, so we only test with authenticated users

  test.describe('Authenticated User', () => {
    // Note: Tests that need WebGPU must call mockWebGPUSupport BEFORE signInWithTestUser
    // Tests that don't need WebGPU can use the simpler pattern

    test('should select WebLLM provider and show model options', async ({ page }) => {
      await signInWithTestUser(page);
      await selectAIProvider(page, 'webllm');
      
      // Should show WebLLM-specific options - use exact match for "Model" label
      await expect(page.getByText('Model', { exact: true })).toBeVisible();
      await expect(page.locator('select').filter({ has: page.locator('option:has-text("Hermes")') })).toBeVisible();
      
      // Should show info about local AI
      await expect(page.getByText('How Local AI Works')).toBeVisible();
      await expect(page.getByText('No data sent to external servers')).toBeVisible();
    });

    test('should select OpenAI provider and show API key input', async ({ page }) => {
      await signInWithTestUser(page);
      await selectAIProvider(page, 'openai');
      
      // Should show API key input
      await expect(page.getByPlaceholder(/Enter your openai API key/i)).toBeVisible();
      
      // Should show model ID input with default
      await expect(page.getByPlaceholder('gpt-4o-mini')).toBeVisible();
      
      // Should show security note
      await expect(page.getByText('Security')).toBeVisible();
      await expect(page.getByText('API keys are encrypted with AES-256-GCM')).toBeVisible();
    });

    test('should select xAI provider and show API key input', async ({ page }) => {
      await signInWithTestUser(page);
      await selectAIProvider(page, 'xai');
      
      // Should show API key input
      await expect(page.getByPlaceholder(/Enter your xai API key/i)).toBeVisible();
      
      // Should show model ID input with default
      await expect(page.getByPlaceholder('grok-2-latest')).toBeVisible();
    });

    test('should select Mistral provider and show API key input', async ({ page }) => {
      await signInWithTestUser(page);
      await selectAIProvider(page, 'mistral');
      
      // Should show API key input
      await expect(page.getByPlaceholder(/Enter your mistral API key/i)).toBeVisible();
      
      // Should show model ID input with default
      await expect(page.getByPlaceholder('mistral-large-latest')).toBeVisible();
    });

    test('should select Ollama provider and show base URL input', async ({ page }) => {
      await signInWithTestUser(page);
      await selectAIProvider(page, 'ollama');
      
      // Should NOT show API key input (Ollama doesn't need it)
      await expect(page.getByPlaceholder(/Enter your .* API key/)).not.toBeVisible();
      
      // Should show base URL input
      await expect(page.getByPlaceholder('http://localhost:11434/api')).toBeVisible();
      
      // Should show model ID input
      await expect(page.getByPlaceholder('llama3.2')).toBeVisible();
    });

    // Note: Save tests require AI_ENCRYPTION_KEY to be set in Convex dashboard
    // These tests verify the save button is enabled and clickable
    test('should enable save button for WebLLM when WebGPU supported', async ({ page }) => {
      // WebLLM requires WebGPU - must mock BEFORE any navigation
      await mockWebGPUSupport(page, true);
      await signInWithTestUser(page);
      await selectAIProvider(page, 'webllm');
      
      // Save button should be enabled
      const saveButton = page.getByRole('button', { name: 'Save Settings' });
      await expect(saveButton).toBeEnabled({ timeout: 5000 });
    });

    test('should enable save button for OpenAI with API key', async ({ page }) => {
      await signInWithTestUser(page);
      await selectAIProvider(page, 'openai');
      
      // Fill API key
      await page.getByPlaceholder(/Enter your openai API key/i).fill('sk-test-key-12345');
      
      // Save button should be enabled
      const saveButton = page.getByRole('button', { name: 'Save Settings' });
      await expect(saveButton).toBeEnabled({ timeout: 5000 });
    });

    test('should enable save button for Ollama without API key', async ({ page }) => {
      await signInWithTestUser(page);
      await selectAIProvider(page, 'ollama');
      
      // Save button should be enabled (Ollama doesn't need API key)
      const saveButton = page.getByRole('button', { name: 'Save Settings' });
      await expect(saveButton).toBeEnabled({ timeout: 5000 });
    });

    test('should show "Recommended" badge for WebLLM', async ({ page }) => {
      await signInWithTestUser(page);
      await navigateToAISettings(page);
      
      // Find the WebLLM provider button and check for badge
      const webllmButton = page.getByRole('button', { name: 'Local AI (WebLLM)' });
      await expect(webllmButton.locator('..').getByText('Recommended')).toBeVisible();
    });

    test('should allow switching between providers', async ({ page }) => {
      await mockWebGPUSupport(page, true);
      await signInWithTestUser(page);
      
      // Select WebLLM first
      await selectAIProvider(page, 'webllm');
      await expect(page.getByText('How Local AI Works')).toBeVisible();
      
      // Switch to OpenAI
      await selectAIProvider(page, 'openai');
      await expect(page.getByPlaceholder(/Enter your openai API key/i)).toBeVisible();
      
      // Switch back to WebLLM
      await selectAIProvider(page, 'webllm');
      await expect(page.getByText('How Local AI Works')).toBeVisible();
    });
  });

  test.describe('WebGPU Support Detection', () => {
    test('should show WebGPU supported when available', async ({ page }) => {
      // Mock WebGPU as supported BEFORE navigating (addInitScript runs on page load)
      await mockWebGPUSupport(page, true);
      await signInWithTestUser(page);
      await selectAIProvider(page, 'webllm');
      
      // Should show supported status
      await verifyWebGPUSupported(page);
    });

    test('should show WebGPU not supported warning', async ({ page }) => {
      // Mock WebGPU as not supported BEFORE navigating
      await mockWebGPUSupport(page, false);
      await signInWithTestUser(page);
      await selectAIProvider(page, 'webllm');
      
      // Should show not supported warning
      await verifyWebGPUNotSupportedWarning(page);
      
      // Save button should be disabled
      await expect(page.getByRole('button', { name: 'Save Settings' })).toBeDisabled();
    });

    test('should enable save for non-WebLLM provider when WebGPU is not supported', async ({ page }) => {
      // Mock WebGPU as not supported BEFORE navigating
      await mockWebGPUSupport(page, false);
      await signInWithTestUser(page);
      
      // Select OpenAI instead - should work fine
      await selectAIProvider(page, 'openai');
      await page.getByPlaceholder(/Enter your openai API key/i).fill('sk-test-key');
      
      // Save button should be enabled
      const saveButton = page.getByRole('button', { name: 'Save Settings' });
      await expect(saveButton).toBeEnabled({ timeout: 5000 });
    });
  });

  test.describe('WebLLM Model Selection', () => {
    // Note: mockWebGPUSupport must be called in each test before signIn

    test('should display available WebLLM models', async ({ page }) => {
      await mockWebGPUSupport(page, true);
      await signInWithTestUser(page);
      await selectAIProvider(page, 'webllm');
      
      // Check that model select has options
      const modelSelect = page.locator('select').filter({ has: page.locator('option:has-text("Hermes")') });
      await expect(modelSelect).toBeVisible();
      
      // Verify model options exist (options are hidden until dropdown opens, so check count)
      const optionCount = await modelSelect.locator('option').count();
      expect(optionCount).toBeGreaterThanOrEqual(3);
    });

    test('should show model description when selected', async ({ page }) => {
      await mockWebGPUSupport(page, true);
      await signInWithTestUser(page);
      await selectAIProvider(page, 'webllm');
      
      // Default model should show its description
      await expect(page.getByText('Best for tool calling and function execution')).toBeVisible();
    });
  });
});


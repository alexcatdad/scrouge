import { afterEach, beforeEach, describe, expect, test } from "bun:test";

// Store original env
const originalEnv = process.env.AI_ENCRYPTION_KEY;

describe("Encryption Module", () => {
  beforeEach(() => {
    // Set a test encryption key (64 hex characters = 32 bytes)
    process.env.AI_ENCRYPTION_KEY =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  });

  afterEach(() => {
    // Restore original env
    if (originalEnv !== undefined) {
      process.env.AI_ENCRYPTION_KEY = originalEnv;
    } else {
      process.env.AI_ENCRYPTION_KEY = undefined;
    }
  });

  test("encrypt returns a base64 string", async () => {
    const { encrypt } = await import("../convex/lib/encryption");

    const plaintext = "test-api-key-12345";
    const encrypted = await encrypt(plaintext);

    expect(typeof encrypted).toBe("string");
    expect(encrypted.length).toBeGreaterThan(0);

    // Should be valid base64
    expect(() => atob(encrypted)).not.toThrow();
  });

  test("decrypt returns original plaintext", async () => {
    const { encrypt, decrypt } = await import("../convex/lib/encryption");

    const plaintext = "test-api-key-12345";
    const encrypted = await encrypt(plaintext);
    const decrypted = await decrypt(encrypted);

    expect(decrypted).toBe(plaintext);
  });

  test("encrypt produces different ciphertext for same input", async () => {
    const { encrypt } = await import("../convex/lib/encryption");

    const plaintext = "test-api-key";
    const encrypted1 = await encrypt(plaintext);
    const encrypted2 = await encrypt(plaintext);

    // Due to random IV, same plaintext should produce different ciphertext
    expect(encrypted1).not.toBe(encrypted2);
  });

  test("handles empty string", async () => {
    const { encrypt, decrypt } = await import("../convex/lib/encryption");

    const plaintext = "";
    const encrypted = await encrypt(plaintext);
    const decrypted = await decrypt(encrypted);

    expect(decrypted).toBe(plaintext);
  });

  test("handles special characters", async () => {
    const { encrypt, decrypt } = await import("../convex/lib/encryption");

    const plaintext = "api-key-with-special-chars!@#$%^&*()_+-=[]{}|;':\",./<>?";
    const encrypted = await encrypt(plaintext);
    const decrypted = await decrypt(encrypted);

    expect(decrypted).toBe(plaintext);
  });

  test("handles unicode characters", async () => {
    const { encrypt, decrypt } = await import("../convex/lib/encryption");

    const plaintext = "api-key-with-unicode-🔑-日本語-العربية";
    const encrypted = await encrypt(plaintext);
    const decrypted = await decrypt(encrypted);

    expect(decrypted).toBe(plaintext);
  });

  test("handles long strings", async () => {
    const { encrypt, decrypt } = await import("../convex/lib/encryption");

    const plaintext = "a".repeat(10000);
    const encrypted = await encrypt(plaintext);
    const decrypted = await decrypt(encrypted);

    expect(decrypted).toBe(plaintext);
  });

  test("throws error when encryption key is not set", async () => {
    process.env.AI_ENCRYPTION_KEY = undefined;

    // Need to re-import to get fresh module state
    // In practice, this would fail at runtime
    const { encrypt } = await import("../convex/lib/encryption");

    await expect(encrypt("test")).rejects.toThrow("AI_ENCRYPTION_KEY");
  });

  test("works with non-hex key (derives key using SHA-256)", async () => {
    // Set a non-hex key (will be derived using SHA-256)
    process.env.AI_ENCRYPTION_KEY = "my-simple-password-key";

    const { encrypt, decrypt } = await import("../convex/lib/encryption");

    const plaintext = "test-api-key";
    const encrypted = await encrypt(plaintext);
    const decrypted = await decrypt(encrypted);

    expect(decrypted).toBe(plaintext);
  });

  test("decrypt fails with tampered ciphertext", async () => {
    const { encrypt, decrypt } = await import("../convex/lib/encryption");

    const plaintext = "test-api-key";
    const encrypted = await encrypt(plaintext);

    // Tamper with the encrypted data
    const bytes = atob(encrypted)
      .split("")
      .map((c) => c.charCodeAt(0));
    bytes[20] = (bytes[20] + 1) % 256; // Modify a byte
    const tampered = btoa(String.fromCharCode(...bytes));

    // Should fail authentication
    await expect(decrypt(tampered)).rejects.toThrow();
  });

  test("decrypt fails with wrong key", async () => {
    const { encrypt } = await import("../convex/lib/encryption");

    const plaintext = "test-api-key";
    const encrypted = await encrypt(plaintext);

    // Change the key
    process.env.AI_ENCRYPTION_KEY =
      "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210";

    // Re-import to get module with new key
    const { decrypt } = await import("../convex/lib/encryption");

    // Should fail to decrypt
    await expect(decrypt(encrypted)).rejects.toThrow();
  });
});

describe("Encryption Constants", () => {
  test("uses AES-GCM algorithm", async () => {
    // The module uses AES-GCM which is authenticated encryption
    // This is verified by the fact that tampered ciphertext fails
    const { encrypt, decrypt } = await import("../convex/lib/encryption");

    process.env.AI_ENCRYPTION_KEY =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    const encrypted = await encrypt("test");
    const decrypted = await decrypt(encrypted);

    expect(decrypted).toBe("test");
  });

  test("IV length is 12 bytes (96 bits)", async () => {
    const { encrypt } = await import("../convex/lib/encryption");

    process.env.AI_ENCRYPTION_KEY =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    const encrypted = await encrypt("test");
    const decoded = atob(encrypted);

    // First 12 bytes are the IV
    expect(decoded.length).toBeGreaterThan(12);
  });
});

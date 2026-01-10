/**
 * Encryption utilities for sensitive data (API keys, tokens)
 * Uses Web Crypto API for Convex V8 runtime compatibility
 *
 * Features:
 * - AES-256-GCM authenticated encryption
 * - Key versioning for safe rotation
 * - Automatic re-encryption with current key on read
 *
 * Environment Variables:
 * - AI_ENCRYPTION_KEY: Current encryption key (required)
 * - AI_ENCRYPTION_KEY_PREVIOUS: Previous key for rotation (optional)
 *
 * Key Format: 64 hex characters (32 bytes) or any string (hashed to 32 bytes)
 *
 * Encrypted Data Format (v2):
 * Base64({ version: 1 byte, keyId: 1 byte, iv: 12 bytes, ciphertext: N bytes, authTag: 16 bytes })
 *
 * Legacy Format (v1 - no version prefix):
 * Base64({ iv: 12 bytes, ciphertext: N bytes, authTag: 16 bytes })
 */

const ALGORITHM = "AES-GCM";
const IV_LENGTH = 12; // 96 bits for GCM
const VERSION = 2; // Current format version

// Key IDs for rotation support
const KEY_ID_CURRENT = 1;
const KEY_ID_PREVIOUS = 2;

interface EncryptionKey {
  key: CryptoKey;
  keyId: number;
}

/**
 * Parse a key string into bytes
 * Accepts 64 hex characters or derives key from arbitrary string using SHA-256
 */
async function parseKeyBytes(keyString: string): Promise<Uint8Array> {
  if (keyString.length === 64 && /^[a-fA-F0-9]+$/.test(keyString)) {
    // Hex string - convert to bytes
    const hexPairs = keyString.match(/.{1,2}/g);
    if (!hexPairs) {
      throw new Error("Invalid hex key format");
    }
    return new Uint8Array(hexPairs.map((byte) => Number.parseInt(byte, 16)));
  }
  // Derive a 32-byte key from the string using SHA-256
  const encoder = new TextEncoder();
  const data = encoder.encode(keyString);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(hashBuffer);
}

/**
 * Import a key string into a CryptoKey
 */
async function importKey(keyString: string): Promise<CryptoKey> {
  const keyBytes = await parseKeyBytes(keyString);
  return await crypto.subtle.importKey(
    "raw",
    keyBytes as BufferSource,
    { name: ALGORITHM },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Get available encryption keys from environment
 * Returns current key and optionally previous key for rotation
 */
async function getEncryptionKeys(): Promise<{
  current: EncryptionKey;
  previous?: EncryptionKey;
}> {
  const currentKeyString = process.env.AI_ENCRYPTION_KEY;
  if (!currentKeyString) {
    throw new Error("AI_ENCRYPTION_KEY environment variable is not set");
  }

  const current: EncryptionKey = {
    key: await importKey(currentKeyString),
    keyId: KEY_ID_CURRENT,
  };

  // Check for previous key (for rotation support)
  const previousKeyString = process.env.AI_ENCRYPTION_KEY_PREVIOUS;
  let previous: EncryptionKey | undefined;

  if (previousKeyString) {
    previous = {
      key: await importKey(previousKeyString),
      keyId: KEY_ID_PREVIOUS,
    };
  }

  return { current, previous };
}

/**
 * Get a specific key by ID
 */
async function getKeyById(keyId: number): Promise<CryptoKey> {
  const keys = await getEncryptionKeys();

  if (keyId === KEY_ID_CURRENT) {
    return keys.current.key;
  }
  if (keyId === KEY_ID_PREVIOUS && keys.previous) {
    return keys.previous.key;
  }

  throw new Error(`Encryption key with ID ${keyId} not found`);
}

/**
 * Encrypt plaintext using AES-256-GCM with the current key
 * Returns a base64 string containing version, keyId, IV, ciphertext, and authTag
 */
export async function encrypt(plaintext: string): Promise<string> {
  const keys = await getEncryptionKeys();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  const encrypted = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv: iv,
    },
    keys.current.key,
    data,
  );

  // Format: version (1 byte) + keyId (1 byte) + iv (12 bytes) + ciphertext (includes authTag)
  const combined = new Uint8Array(2 + iv.length + encrypted.byteLength);
  combined[0] = VERSION;
  combined[1] = keys.current.keyId;
  combined.set(iv, 2);
  combined.set(new Uint8Array(encrypted), 2 + iv.length);

  // Convert to base64 for storage
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt ciphertext using AES-256-GCM
 * Supports both v1 (legacy) and v2 (versioned) formats
 * Automatically detects format based on data structure
 */
export async function decrypt(encrypted: string): Promise<string> {
  // Decode from base64
  const combined = new Uint8Array(
    atob(encrypted)
      .split("")
      .map((c) => c.charCodeAt(0)),
  );

  let iv: Uint8Array;
  let ciphertext: Uint8Array;
  let key: CryptoKey;

  // Check if this is v2 format (has version and keyId prefix)
  // v2 format: version (1) + keyId (1) + iv (12) + ciphertext
  // v1 format: iv (12) + ciphertext
  // We detect v2 by checking if first byte is VERSION (2) and second byte is a valid keyId
  const possibleVersion = combined[0];
  const possibleKeyId = combined[1];

  if (
    possibleVersion === VERSION &&
    (possibleKeyId === KEY_ID_CURRENT || possibleKeyId === KEY_ID_PREVIOUS)
  ) {
    // v2 format
    iv = combined.slice(2, 2 + IV_LENGTH);
    ciphertext = combined.slice(2 + IV_LENGTH);
    key = await getKeyById(possibleKeyId);
  } else {
    // v1 legacy format (no version prefix)
    iv = combined.slice(0, IV_LENGTH);
    ciphertext = combined.slice(IV_LENGTH);
    // Legacy data was encrypted with current key
    const keys = await getEncryptionKeys();
    key = keys.current.key;
  }

  const decrypted = await crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv: iv as BufferSource,
    },
    key,
    ciphertext as BufferSource,
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Check if encrypted data needs re-encryption (was encrypted with previous key)
 * Returns true if data should be re-encrypted with current key
 */
export function needsReEncryption(encrypted: string): boolean {
  try {
    const combined = new Uint8Array(
      atob(encrypted)
        .split("")
        .map((c) => c.charCodeAt(0)),
    );

    const possibleVersion = combined[0];
    const possibleKeyId = combined[1];

    // v2 format with previous key needs re-encryption
    if (possibleVersion === VERSION && possibleKeyId === KEY_ID_PREVIOUS) {
      return true;
    }

    // v1 format should be upgraded to v2
    if (possibleVersion !== VERSION) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Re-encrypt data with the current key
 * Use this during key rotation to migrate data to the new key
 */
export async function reEncrypt(encrypted: string): Promise<string> {
  const plaintext = await decrypt(encrypted);
  return await encrypt(plaintext);
}

/**
 * Utility to generate a new encryption key
 * Returns a 64-character hex string (32 bytes)
 * Use: openssl rand -hex 32
 */
export function generateKeyHint(): string {
  return "Generate a new key with: openssl rand -hex 32";
}

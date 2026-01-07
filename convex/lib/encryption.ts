// Use Web Crypto API for Convex V8 runtime compatibility
const ALGORITHM = "AES-GCM";
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Get the encryption key from environment variable
 * Should be a 32-byte (64 hex characters) key
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  const keyString = process.env.AI_ENCRYPTION_KEY;
  if (!keyString) {
    throw new Error("AI_ENCRYPTION_KEY environment variable is not set");
  }
  
  let keyBytes: Uint8Array;
  
  // If it's a hex string, convert it to bytes
  if (keyString.length === 64) {
    keyBytes = new Uint8Array(
      keyString.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
    );
  } else {
    // Otherwise, derive a 32-byte key from the string using SHA-256
    const encoder = new TextEncoder();
    const data = encoder.encode(keyString);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    keyBytes = new Uint8Array(hashBuffer);
  }
  
  return await crypto.subtle.importKey(
    "raw",
    keyBytes as BufferSource,
    { name: ALGORITHM },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt plaintext using AES-GCM
 * Returns a base64 string containing IV + ciphertext + authTag
 */
export async function encrypt(plaintext: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  
  const encrypted = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv: iv,
    },
    key,
    data
  );
  
  // Combine IV + ciphertext (which includes authTag)
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  // Convert to base64 for storage
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt ciphertext using AES-GCM
 * Expects a base64 string containing IV + ciphertext + authTag
 */
export async function decrypt(encrypted: string): Promise<string> {
  const key = await getEncryptionKey();
  
  // Decode from base64
  const combined = new Uint8Array(
    atob(encrypted)
      .split("")
      .map((c) => c.charCodeAt(0))
  );
  
  // Extract IV and ciphertext
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);
  
  const decrypted = await crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv: iv,
    },
    key,
    ciphertext
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}


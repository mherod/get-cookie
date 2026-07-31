import { createDecipheriv } from "node:crypto";

export const CHROME_M127_META_VERSION = 24;
export const CHROME_DOMAIN_HASH_LENGTH = 32;
export const WINDOWS_GCM_KEY_LENGTH = 32;

/**
 * Decrypts Chrome v10 encrypted cookies on Windows using AES-256-GCM
 *
 * Chrome v10 cookies use AES-256-GCM encryption with:
 * - 12-byte nonce (96 bits)
 * - 16-byte authentication tag
 * @param encryptedValue - The encrypted cookie value starting with 'v10' prefix
 * @param key - The decrypted master key from DPAPI
 * @param metaVersion - The cookie DB `meta.version`; when >= 24 (Chrome M127+) the
 * decrypted plaintext is prefixed with a 32-byte SHA-256 domain hash that is stripped
 * @returns The decrypted cookie value
 * @throws {Error} If the cookie is not v10 format or decryption fails
 */
export function decryptV10Cookie(
  encryptedValue: Buffer,
  key: Buffer,
  metaVersion?: number,
): string {
  // Check for v10 prefix
  const VERSION_PREFIX = Buffer.from("v10");
  if (!encryptedValue.subarray(0, 3).equals(VERSION_PREFIX)) {
    throw new Error("Not a v10 encrypted cookie");
  }

  // Remove the version prefix
  const ciphertext = encryptedValue.subarray(3);

  // Extract components
  const NONCE_LENGTH = 12; // 96 bits / 8
  const TAG_LENGTH = 16; // 128 bits / 8

  if (ciphertext.length < NONCE_LENGTH + TAG_LENGTH) {
    throw new Error("Invalid v10 cookie: too short");
  }

  const nonce = ciphertext.subarray(0, NONCE_LENGTH);
  const encryptedData = ciphertext.subarray(
    NONCE_LENGTH,
    ciphertext.length - TAG_LENGTH,
  );
  const authTag = ciphertext.subarray(ciphertext.length - TAG_LENGTH);

  // Decrypt using AES-256-GCM
  const decipher = createDecipheriv("aes-256-gcm", key, nonce);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encryptedData),
    decipher.final(),
  ]);

  // Chrome M127+ (cookie DB meta.version >= 24) prepends a 32-byte SHA-256 hash of
  // the cookie's domain to the decrypted plaintext; strip it to recover the value.
  // Ref: https://chromium.googlesource.com/chromium/src/+/b02dcebd7cafab92770734dc2bc317bd07f1d891/net/extras/sqlite/sqlite_persistent_cookie_store.cc#223
  if (
    (metaVersion ?? 0) >= CHROME_M127_META_VERSION &&
    decrypted.length >= CHROME_DOMAIN_HASH_LENGTH
  ) {
    return decrypted.subarray(CHROME_DOMAIN_HASH_LENGTH).toString("utf8");
  }

  return decrypted.toString("utf8");
}

/**
 * Checks if a cookie value is v10 encrypted
 * @param value - The cookie value to check
 * @returns True if the cookie starts with 'v10' prefix
 */
export function isV10Cookie(value: Buffer): boolean {
  const VERSION_PREFIX = Buffer.from("v10");
  return value.length >= 3 && value.subarray(0, 3).equals(VERSION_PREFIX);
}

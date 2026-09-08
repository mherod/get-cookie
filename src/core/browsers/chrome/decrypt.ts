// External imports
import { createDecipheriv, createHash, pbkdf2 } from "node:crypto";

import { isLinux, isMacOS, isWindows } from "@utils/platformUtils";

import { usesRawCookieValues } from "../../cookies/CookieQueryContext";

/**
 * Simple memoization utility for caching Buffer operations
 * @param fn - The function to memoize that takes a Buffer and returns a Buffer
 * @param keyFn - Optional function to generate cache keys from Buffer values
 * @returns A memoized version of the input function
 */
function memoizeBuffer(
  fn: (value: Buffer) => Buffer,
  keyFn?: (value: Buffer) => string,
): (value: Buffer) => Buffer {
  const cache = new Map<string, Buffer>();

  return (value: Buffer): Buffer => {
    const key = keyFn ? keyFn(value) : value.toString("hex");

    if (cache.has(key)) {
      const cachedResult = cache.get(key);
      if (cachedResult !== undefined) {
        return cachedResult;
      }
    }

    const result = fn(value);
    cache.set(key, result);
    return result;
  };
}

import {
  CHROME_DOMAIN_HASH_LENGTH,
  CHROME_M127_META_VERSION,
  decryptV10Cookie,
  isV10Cookie,
  WINDOWS_GCM_KEY_LENGTH,
} from "./windows/decryptV10Cookie";

/**
 * Removes the v10 prefix from the encrypted value if present
 * @param value - The encrypted value
 * @returns The value without the v10 prefix
 */
const removeV10Prefix = memoizeBuffer(
  (value: Buffer): Buffer => {
    if (
      value.length >= 3 &&
      value[0] === 0x76 && // 'v'
      value[1] === 0x31 && // '1'
      value[2] === 0x30
    ) {
      // '0'
      return value.slice(3);
    }
    return value;
  },
  (value: Buffer) => value.toString("hex"),
);

/**
 * Removes PKCS7 padding from the decrypted value
 * @param decrypted - The decrypted buffer
 * @returns The buffer without padding
 */
const removePadding = memoizeBuffer(
  (decrypted: Buffer): Buffer => {
    const padding = decrypted[decrypted.length - 1];
    if (padding && padding <= 16) {
      return decrypted.slice(0, -padding);
    }
    return decrypted;
  },
  (decrypted: Buffer) => decrypted.toString("hex"),
);

/**
 * Extracts the actual value from the decoded string by removing Chrome's prefixes
 * @param decodedString - The decoded string to clean up
 * @returns The cleaned up value
 */
function extractValue(decodedString: string): string {
  // First try to find a UUID pattern which is common in cookies
  const uuidMatch = decodedString.match(
    /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i,
  );
  if (uuidMatch?.[1]) {
    return uuidMatch[1];
  }

  // Look for common patterns at the end of the string
  const endPatterns = [
    /([A-Z]{3})$/, // Currency codes (USD, GBP, EUR)
    /([a-z]{2}_[A-Z]{2})$/, // Locale codes (en_US, en_GB)
    /(\d{3}-\d{7}-\d{7})$/, // Amazon session IDs
  ];

  for (const pattern of endPatterns) {
    const match = decodedString.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  // Then try other cleanup patterns
  const cleanupPatterns = [
    /.*?0t(.+)$/, // Pattern ending in "0t" followed by value
    /.*?1e`(.+)$/, // Pattern ending in "1e`" followed by value
    /.*?[`'](.+)$/, // Any backtick or quote followed by value
    /[^\x20-\x7E]*([\x20-\x7E]+)$/, // Non-printable chars followed by printable chars
    /.*?([a-zA-Z0-9_\-.]+)$/, // Alphanumeric value at the end
  ];

  for (const pattern of cleanupPatterns) {
    const match = decodedString.match(pattern);
    const value = match?.[1] ?? "";
    if (value.length > 0) {
      return value;
    }
  }
  return decodedString;
}

/**
 * Cache of derived AES keys, keyed by iteration count and source password.
 *
 * Chrome's key derivation is a pure function of the password: the salt
 * ("saltysalt"), key length (16) and digest (sha1) are constant. macOS uses
 * 1003 iterations and Linux uses one, so the cache distinguishes both.
 * Re-running PBKDF2 (1003 HMAC-SHA1 rounds) for every cookie is wasted work —
 * memoizing collapses it to a single derivation per distinct password.
 *
 * The in-flight Promise (not the resolved Buffer) is cached so that concurrent
 * callers coalesce onto one derivation. A rejected derivation is evicted so a
 * transient failure cannot poison subsequent lookups.
 */
const derivedKeyCache = new Map<string, Promise<Buffer>>();

/**
 * Derives (or returns a cached) AES-128 key from a Chrome password via PBKDF2.
 * @param password - The Chrome encryption password
 * @param iterations - Platform-specific PBKDF2 iteration count
 * @returns A promise resolving to the 16-byte derived key
 */
async function deriveKey(password: string, iterations = 1003): Promise<Buffer> {
  const cacheKey = `${iterations}:${password}`;
  const cached = derivedKeyCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const keyPromise = new Promise<Buffer>((resolve, reject) => {
    pbkdf2(password, "saltysalt", iterations, 16, "sha1", (error, key) => {
      if (error) {
        reject(new Error(`Failed to derive key: ${error.message}`));
        return;
      }
      resolve(key);
    });
  }).catch((error: unknown) => {
    // Don't cache failures — let the next call retry from scratch.
    derivedKeyCache.delete(cacheKey);
    throw error;
  });

  derivedKeyCache.set(cacheKey, keyPromise);
  return keyPromise;
}

/** Tries Linux's keyring, basic and empty passwords using strict plaintext validation. */
async function decryptLinuxCookie(
  encryptedValue: Buffer,
  password: string,
  metaVersion?: number,
  domain?: string,
): Promise<string> {
  const prefix = encryptedValue.subarray(0, 3).toString("ascii");
  if (prefix !== "v10" && prefix !== "v11") {
    throw new Error(`Unsupported Linux cookie encryption: ${prefix}`);
  }
  const value = encryptedValue.subarray(3);
  if (!value.length || value.length % 16 !== 0) {
    throw new Error("Encrypted data length is not a multiple of 16");
  }
  const hasDomainHash = (metaVersion ?? 0) >= CHROME_M127_META_VERSION;
  if (hasDomainHash && domain === undefined) {
    throw new Error(
      "Cookie domain is required for Linux version 24+ decryption",
    );
  }
  const expectedHash = hasDomainHash
    ? createHash("sha256")
        .update(domain ?? "")
        .digest()
    : null;
  for (const candidate of new Set([password, "peanuts", ""])) {
    const key = await deriveKey(candidate, 1);
    try {
      const decipher = createDecipheriv(
        "aes-128-cbc",
        key,
        Buffer.alloc(16, " "),
      );
      // Node's default padding verifies every PKCS7 byte before returning data.
      let plaintext = Buffer.concat([decipher.update(value), decipher.final()]);
      if (expectedHash) {
        if (
          plaintext.length < CHROME_DOMAIN_HASH_LENGTH ||
          !plaintext.subarray(0, CHROME_DOMAIN_HASH_LENGTH).equals(expectedHash)
        ) {
          continue;
        }
        plaintext = plaintext.subarray(CHROME_DOMAIN_HASH_LENGTH);
      }
      return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(
        plaintext,
      );
    } catch {
      // Invalid padding or UTF-8 means this candidate cannot decrypt the cookie.
    }
  }
  throw new Error(
    "Decryption failed: no Linux password produced valid cookie data",
  );
}

/**
 * Normalizes a Windows v10 master key to raw bytes without throwing.
 *
 * `Buffer.from()` raises a TypeError on anything that isn't a string or bytes, and
 * callers reach decrypt() through untyped SQLite rows. Returning null instead lets
 * the caller fall through to the "password must be a string" guard, which reports
 * the real problem.
 * @param password - The Chrome encryption password or DPAPI master key
 * @returns The key as raw bytes, or null if the input isn't string-or-Buffer
 */
function normalizeV10MasterKey(password: string | Buffer): Buffer | null {
  if (Buffer.isBuffer(password)) {
    return password;
  }
  if (typeof password !== "string") {
    return null;
  }
  return Buffer.from(password, "latin1");
}

/**
 * Decrypts Chrome's encrypted cookie values
 * @param encryptedValue - The encrypted cookie value as a Buffer
 * @param password - The Chrome encryption password
 * @param metaVersion - Optional meta version for determining decryption behavior
 * @param domain - Exact database host_key, required for Linux version 24+ hash validation
 * @returns A promise that resolves to the decrypted cookie value
 * @throws {Error} If decryption fails
 * @example
 */
export async function decrypt(
  encryptedValue: Buffer,
  password: string | Buffer,
  metaVersion?: number,
  domain?: string,
): Promise<string> {
  // v10 cookies use AES-GCM on Windows only
  // On macOS, cookies starting with v10 are actually v11 encrypted with a value that starts with "v10,"
  // Only dispatch to GCM when the normalized DPAPI master key is exactly 32 bytes.
  if (
    isWindows() &&
    isV10Cookie(encryptedValue) &&
    encryptedValue.length >= 31
  ) {
    // The Windows DPAPI master key arrives as a latin1 string (lossless byte<->char
    // mapping), so normalize it back to the raw key Buffer for AES-256-GCM. Forwarding
    // metaVersion lets the GCM path strip the Chrome M127+ 32-byte hash prefix.
    const keyBuffer = normalizeV10MasterKey(password);
    if (keyBuffer?.length === WINDOWS_GCM_KEY_LENGTH) {
      return decryptV10Cookie(encryptedValue, keyBuffer, metaVersion);
    }
  }

  // On macOS, cookies that don't start with v10 are considered 'old data' stored as plaintext
  // Ref: https://chromium.googlesource.com/chromium/src/+/refs/heads/main/components/os_crypt/sync/os_crypt_mac.mm
  if (isMacOS()) {
    // Check if this looks like encrypted data (starts with common version prefixes)
    const hasVersionPrefix = encryptedValue
      .slice(0, 3)
      .toString()
      .match(/^v\d\d$/);
    if (!hasVersionPrefix) {
      // Not a version prefix - treat as plaintext on macOS
      return Promise.resolve(encryptedValue.toString("utf8"));
    }
  }

  // v11 cookies and other encrypted cookies use AES-CBC with PBKDF2
  if (typeof password !== "string") {
    throw new Error("password must be a string");
  }
  if (!Buffer.isBuffer(encryptedValue)) {
    throw new Error("encryptedData must be a Buffer");
  }

  if (isLinux()) {
    return decryptLinuxCookie(encryptedValue, password, metaVersion, domain);
  }

  // Derive the AES key once per password (cached); see deriveKey above.
  const key = await deriveKey(password);

  const value = removeV10Prefix(encryptedValue);
  if (value.length % 16 !== 0) {
    throw new Error("Encrypted data length is not a multiple of 16");
  }

  try {
    // Chrome's encryption parameters
    const iv = Buffer.alloc(16, " "); // 16 spaces
    const decipher = createDecipheriv("aes-128-cbc", key, iv);
    decipher.setAutoPadding(false);

    // Decrypt the value
    let decrypted: Buffer = decipher.update(value);
    try {
      decipher.final();
    } catch (e) {
      throw new Error(`Failed to finalize decryption: ${(e as Error).message}`);
    }

    decrypted = removePadding(decrypted);

    // Skip the first 32 bytes (hash prefix) if meta version >= 24
    // Ref: https://chromium.googlesource.com/chromium/src/+/b02dcebd7cafab92770734dc2bc317bd07f1d891/net/extras/sqlite/sqlite_persistent_cookie_store.cc#223
    const useHashPrefix = (metaVersion ?? 0) >= CHROME_M127_META_VERSION;
    const finalDecrypted =
      useHashPrefix && decrypted.length >= CHROME_DOMAIN_HASH_LENGTH
        ? decrypted.slice(CHROME_DOMAIN_HASH_LENGTH)
        : decrypted;

    const decodedString = finalDecrypted.toString("utf8");
    return usesRawCookieValues() ? decodedString : extractValue(decodedString);
  } catch (e) {
    // Preserve the specific finalize-failure message; wrap anything else.
    if (
      e instanceof Error &&
      e.message.startsWith("Failed to finalize decryption")
    ) {
      throw e;
    }
    throw new Error(`Decryption failed: ${(e as Error).message}`);
  }
}

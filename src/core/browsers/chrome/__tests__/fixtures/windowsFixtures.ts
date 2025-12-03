/**
 * Windows-specific test fixtures for Chrome cookie encryption
 *
 * Chrome on Windows uses AES-256-GCM encryption with:
 * - v10 prefix (3 bytes)
 * - 12-byte nonce (96 bits)
 * - Encrypted data (variable length)
 * - 16-byte authentication tag (128 bits)
 *
 * The encryption key is stored in the Local State file and is
 * protected by Windows DPAPI (Data Protection API).
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// ============================================================================
// Test Keys and Constants
// ============================================================================

/**
 * Test AES-256 key for Windows v10 cookie encryption
 * 32 bytes (256 bits) for AES-256-GCM
 * This is a deterministic key for reproducible tests
 */
export const WINDOWS_TEST_KEY = Buffer.from(
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  "hex",
);

/**
 * Alternative test key for testing key rotation scenarios
 */
export const WINDOWS_ALT_TEST_KEY = Buffer.from(
  "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210",
  "hex",
);

/**
 * DPAPI prefix used in Windows Local State encrypted keys
 */
export const DPAPI_PREFIX = Buffer.from("DPAPI");

/**
 * v10 version prefix for Windows Chrome cookies
 */
export const V10_PREFIX = Buffer.from("v10");

/**
 * v11 version prefix (used on macOS/Linux, but good to test cross-platform)
 */
export const V11_PREFIX = Buffer.from("v11");

// ============================================================================
// Encryption Utilities
// ============================================================================

/**
 * Generate a Windows v10 encrypted cookie value using AES-256-GCM
 * Format: v10 (3 bytes) + nonce (12 bytes) + ciphertext + authTag (16 bytes)
 * @param plaintext - The cookie value to encrypt
 * @param key - The 32-byte AES-256 key
 * @param nonce - Optional 12-byte nonce (random if not provided)
 * @returns The encrypted cookie value with v10 prefix
 * @throws Error if nonce or key has invalid length
 */
export function encryptWindowsV10Cookie(
  plaintext: string,
  key: Buffer = WINDOWS_TEST_KEY,
  nonce?: Buffer,
): Buffer {
  const actualNonce = nonce ?? randomBytes(12);

  if (actualNonce.length !== 12) {
    throw new Error("Nonce must be exactly 12 bytes");
  }

  if (key.length !== 32) {
    throw new Error("Key must be exactly 32 bytes for AES-256");
  }

  const cipher = createCipheriv("aes-256-gcm", key, actualNonce);
  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(plaintext, "utf8")),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([V10_PREFIX, actualNonce, encrypted, authTag]);
}

/**
 * Decrypt a Windows v10 encrypted cookie value
 * @param encryptedValue - The encrypted cookie value with v10 prefix
 * @param key - The 32-byte AES-256 key
 * @returns The decrypted plaintext
 * @throws {Error} If decryption fails or format is invalid
 */
export function decryptWindowsV10Cookie(
  encryptedValue: Buffer,
  key: Buffer = WINDOWS_TEST_KEY,
): string {
  if (!encryptedValue.subarray(0, 3).equals(V10_PREFIX)) {
    throw new Error("Not a v10 encrypted cookie");
  }

  const NONCE_LENGTH = 12;
  const TAG_LENGTH = 16;

  const ciphertext = encryptedValue.subarray(3);

  if (ciphertext.length < NONCE_LENGTH + TAG_LENGTH) {
    throw new Error("Invalid v10 cookie: too short");
  }

  const nonce = ciphertext.subarray(0, NONCE_LENGTH);
  const encryptedData = ciphertext.subarray(
    NONCE_LENGTH,
    ciphertext.length - TAG_LENGTH,
  );
  const authTag = ciphertext.subarray(ciphertext.length - TAG_LENGTH);

  const decipher = createDecipheriv("aes-256-gcm", key, nonce);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encryptedData),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

// ============================================================================
// Local State File Utilities
// ============================================================================

/**
 * Windows Local State file structure
 */
export interface WindowsLocalState {
  os_crypt: {
    encrypted_key: string;
  };
  [key: string]: unknown;
}

/**
 * Create a mock Windows Local State JSON structure
 * In real Chrome, the encrypted_key is protected by DPAPI.
 * For testing, we create a mock structure with a known key.
 * @param testKey - The test encryption key to embed
 * @returns A Local State object that can be JSON.stringify'd
 */
export function createMockLocalState(
  testKey: Buffer = WINDOWS_TEST_KEY,
): WindowsLocalState {
  // Real format: DPAPI prefix + DPAPI-encrypted key
  // For testing: DPAPI prefix + raw key (since we can't use real DPAPI in tests)
  const mockEncryptedKey = Buffer.concat([DPAPI_PREFIX, testKey]);

  return {
    os_crypt: {
      encrypted_key: mockEncryptedKey.toString("base64"),
    },
  };
}

/**
 * Create a Local State JSON string for writing to disk
 * @param testKey - The test encryption key
 * @returns JSON string representation of Local State
 */
export function createMockLocalStateJson(
  testKey: Buffer = WINDOWS_TEST_KEY,
): string {
  return JSON.stringify(createMockLocalState(testKey), null, 2);
}

// ============================================================================
// Pre-computed Test Cookies
// ============================================================================

/**
 * Deterministic nonce for reproducible test fixtures
 * Using a fixed nonce allows us to pre-compute expected encrypted values
 */
export const DETERMINISTIC_NONCE = Buffer.from("123456789abc", "utf8");

/**
 * Pre-computed test cookies with known encrypted values
 * These can be used for deterministic unit tests
 */
export const WINDOWS_TEST_COOKIES = {
  /**
   * Simple session cookie
   */
  session: {
    name: "test_session",
    value: "session_123456",
    host: ".example.com",
    path: "/",
    get encrypted(): Buffer {
      return encryptWindowsV10Cookie(
        "session_123456",
        WINDOWS_TEST_KEY,
        DETERMINISTIC_NONCE,
      );
    },
  },

  /**
   * Authentication token cookie
   */
  auth_token: {
    name: "auth_token",
    value: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test",
    host: ".api.example.com",
    path: "/api",
    get encrypted(): Buffer {
      return encryptWindowsV10Cookie(
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test",
        WINDOWS_TEST_KEY,
        DETERMINISTIC_NONCE,
      );
    },
  },

  /**
   * User preferences cookie (JSON value)
   */
  preferences: {
    name: "user_prefs",
    value: '{"theme":"dark","lang":"en"}',
    host: ".example.com",
    path: "/",
    get encrypted(): Buffer {
      return encryptWindowsV10Cookie(
        '{"theme":"dark","lang":"en"}',
        WINDOWS_TEST_KEY,
        DETERMINISTIC_NONCE,
      );
    },
  },

  /**
   * Empty value cookie (edge case)
   */
  empty: {
    name: "empty_cookie",
    value: "",
    host: ".example.com",
    path: "/",
    get encrypted(): Buffer {
      return encryptWindowsV10Cookie("", WINDOWS_TEST_KEY, DETERMINISTIC_NONCE);
    },
  },

  /**
   * Unicode value cookie
   */
  unicode: {
    name: "unicode_cookie",
    value: "こんにちは世界",
    host: ".example.com",
    path: "/",
    get encrypted(): Buffer {
      return encryptWindowsV10Cookie(
        "こんにちは世界",
        WINDOWS_TEST_KEY,
        DETERMINISTIC_NONCE,
      );
    },
  },

  /**
   * Long value cookie (stress test)
   */
  long_value: {
    name: "long_cookie",
    value: "x".repeat(4096),
    host: ".example.com",
    path: "/",
    get encrypted(): Buffer {
      return encryptWindowsV10Cookie(
        "x".repeat(4096),
        WINDOWS_TEST_KEY,
        DETERMINISTIC_NONCE,
      );
    },
  },
} as const;

// ============================================================================
// Error Case Fixtures
// ============================================================================

/**
 * Test fixtures for error handling scenarios
 */
export const WINDOWS_ERROR_CASES = {
  /**
   * Cookie with invalid v10 prefix
   */
  invalidPrefix: {
    name: "invalid_prefix",
    encrypted: Buffer.from("v99" + "0".repeat(60), "utf8"),
    expectedError: "Not a v10 encrypted cookie",
  },

  /**
   * Cookie that's too short (missing auth tag)
   */
  tooShort: {
    name: "too_short",
    encrypted: Buffer.concat([V10_PREFIX, Buffer.alloc(10)]),
    expectedError: "Invalid v10 cookie: too short",
  },

  /**
   * Cookie with corrupted auth tag
   */
  corruptedAuthTag: {
    name: "corrupted_auth_tag",
    get encrypted(): Buffer {
      const valid = encryptWindowsV10Cookie("test", WINDOWS_TEST_KEY);
      // Corrupt the last byte of the auth tag
      const lastIndex = valid.length - 1;
      const lastByte = valid[lastIndex];
      if (lastByte !== undefined) {
        valid[lastIndex] = lastByte ^ 0xff;
      }
      return valid;
    },
    expectedError: "Unsupported state or unable to authenticate data",
  },

  /**
   * Cookie encrypted with wrong key
   */
  wrongKey: {
    name: "wrong_key",
    get encrypted(): Buffer {
      return encryptWindowsV10Cookie("test", WINDOWS_ALT_TEST_KEY);
    },
    decryptKey: WINDOWS_TEST_KEY,
    expectedError: "Unsupported state or unable to authenticate data",
  },
} as const;

// ============================================================================
// Database Fixture Utilities
// ============================================================================

/**
 * Configuration for generating a Windows Chrome cookie database
 */
export interface WindowsCookieDatabaseConfig {
  /** Path to create the database */
  dbPath: string;
  /** Number of cookies to generate */
  cookieCount?: number;
  /** Encryption key to use */
  encryptionKey?: Buffer;
  /** Whether to use deterministic values (for reproducible tests) */
  deterministic?: boolean;
  /** Custom domains to use */
  domains?: string[];
  /** Custom cookie names to use */
  cookieNames?: string[];
}

/**
 * Configuration for generating Windows test cookies
 */
export interface GenerateWindowsTestCookiesConfig {
  /** Number of cookies to generate */
  count: number;
  /** Encryption key to use */
  key?: Buffer;
  /** Whether to use deterministic values */
  deterministic?: boolean;
  /** Custom domains to use */
  domains?: string[];
  /** Custom cookie names to use */
  cookieNames?: string[];
}

/**
 * Generated cookie data
 */
export interface GeneratedCookie {
  /** Cookie name */
  name: string;
  /** Cookie value (plaintext) */
  value: string;
  /** Encrypted cookie value */
  encrypted: Buffer;
  /** Cookie host/domain */
  host: string;
  /** Cookie path */
  path: string;
}

/**
 * Generate a batch of encrypted cookies for database insertion
 * @param config - Configuration for cookie generation
 * @returns Array of cookie objects ready for database insertion
 */
export function generateWindowsTestCookies(
  config: GenerateWindowsTestCookiesConfig,
): GeneratedCookie[] {
  const {
    count,
    key = WINDOWS_TEST_KEY,
    deterministic = false,
    domains = [".example.com", ".api.example.com", ".test.com", ".github.com"],
    cookieNames = ["session", "auth", "csrf", "prefs", "tracking", "consent"],
  } = config;

  const cookies: GeneratedCookie[] = [];

  for (let i = 0; i < count; i++) {
    const cookieName = cookieNames[i % cookieNames.length] ?? "cookie";
    const name = `${cookieName}_${Math.floor(i / cookieNames.length)}`;
    const value = deterministic
      ? `value_${i}`
      : `value_${i}_${randomBytes(8).toString("hex")}`;
    const host = domains[i % domains.length] ?? ".example.com";

    // Use deterministic nonce if requested
    const nonce = deterministic
      ? Buffer.from(`nonce_${i.toString().padStart(6, "0")}`.slice(0, 12))
      : undefined;

    cookies.push({
      name,
      value,
      encrypted: encryptWindowsV10Cookie(value, key, nonce),
      host,
      path: "/",
    });
  }

  return cookies;
}

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Validation result for v10 format
 */
export interface V10ValidationResult {
  /** Whether the format is valid */
  valid: boolean;
  /** List of validation errors */
  errors: string[];
  /** Detailed format information */
  details: {
    /** Whether the v10 prefix is present */
    hasPrefix: boolean;
    /** The actual prefix value */
    prefixValue: string;
    /** Total length of the encrypted value */
    totalLength: number;
    /** Expected nonce length */
    nonceLength: number;
    /** Calculated ciphertext length */
    ciphertextLength: number;
    /** Expected auth tag length */
    authTagLength: number;
  };
}

/**
 * Validate that an encrypted value has the correct v10 format
 * @param encrypted - The encrypted buffer to validate
 * @returns Validation result with details
 */
export function validateV10Format(encrypted: Buffer): V10ValidationResult {
  const errors: string[] = [];
  const NONCE_LENGTH = 12;
  const TAG_LENGTH = 16;
  const PREFIX_LENGTH = 3;

  const hasPrefix =
    encrypted.length >= PREFIX_LENGTH &&
    encrypted.subarray(0, PREFIX_LENGTH).equals(V10_PREFIX);

  if (!hasPrefix) {
    errors.push("Missing or invalid v10 prefix");
  }

  const minLength = PREFIX_LENGTH + NONCE_LENGTH + TAG_LENGTH;
  if (encrypted.length < minLength) {
    errors.push(
      `Too short: ${encrypted.length} bytes, minimum ${minLength} bytes`,
    );
  }

  const ciphertextLength =
    encrypted.length - PREFIX_LENGTH - NONCE_LENGTH - TAG_LENGTH;

  return {
    valid: errors.length === 0,
    errors,
    details: {
      hasPrefix,
      prefixValue: encrypted.subarray(0, PREFIX_LENGTH).toString("utf8"),
      totalLength: encrypted.length,
      nonceLength: NONCE_LENGTH,
      ciphertextLength: Math.max(0, ciphertextLength),
      authTagLength: TAG_LENGTH,
    },
  };
}

/**
 * Verify that a cookie can be encrypted and decrypted correctly
 * @param plaintext - The value to test
 * @param key - The encryption key
 * @returns True if round-trip succeeds
 */
export function verifyRoundTrip(
  plaintext: string,
  key: Buffer = WINDOWS_TEST_KEY,
): boolean {
  try {
    const encrypted = encryptWindowsV10Cookie(plaintext, key);
    const decrypted = decryptWindowsV10Cookie(encrypted, key);
    return decrypted === plaintext;
  } catch {
    return false;
  }
}

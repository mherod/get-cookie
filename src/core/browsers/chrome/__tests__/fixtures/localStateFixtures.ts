/**
 * Windows Local State file fixtures for testing DPAPI key extraction
 *
 * Chrome on Windows stores the cookie encryption key in a file called "Local State"
 * located in the Chrome User Data directory. The key is encrypted using Windows DPAPI.
 *
 * Structure:
 * - Local State is a JSON file
 * - os_crypt.encrypted_key contains the base64-encoded encrypted key
 * - The encrypted key has format: "DPAPI" (5 bytes) + DPAPI-encrypted data
 */

import { writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";

import { WINDOWS_TEST_KEY, DPAPI_PREFIX } from "./windowsFixtures";

// ============================================================================
// Types
// ============================================================================

/**
 * Full Local State file structure (subset of actual Chrome Local State)
 */
export interface LocalStateFile {
  os_crypt: {
    /** Base64-encoded DPAPI-encrypted key */
    encrypted_key: string;
    /** Audit enabled flag (Chrome 91+) */
    audit_enabled?: boolean;
  };
  /** Browser configuration */
  browser?: {
    enabled_labs_experiments?: string[];
  };
  /** Profile information */
  profile?: {
    info_cache?: Record<string, unknown>;
  };
  /** Additional fields Chrome may add */
  [key: string]: unknown;
}

/**
 * Options for creating a test Local State file
 */
export interface CreateLocalStateOptions {
  /** The encryption key to embed (default: WINDOWS_TEST_KEY) */
  encryptionKey?: Buffer;
  /** Whether to include additional realistic Chrome fields */
  includeExtras?: boolean;
  /** Custom audit_enabled value */
  auditEnabled?: boolean;
}

// ============================================================================
// Local State Generation
// ============================================================================

/**
 * Create a mock DPAPI-encrypted key buffer
 *
 * Real DPAPI encryption is only available on Windows and requires
 * the Windows CryptoAPI. For testing, we create a mock format that
 * our test infrastructure can recognize.
 *
 * Format: "DPAPI" (5 bytes) + raw key
 *
 * @param key - The encryption key to wrap
 * @returns Buffer with DPAPI prefix + key
 */
export function createMockDPAPIKey(key: Buffer = WINDOWS_TEST_KEY): Buffer {
  return Buffer.concat([DPAPI_PREFIX, key]);
}

/**
 * Create a Local State object with the given encryption key
 *
 * @param options - Configuration options
 * @returns A Local State object ready for JSON serialization
 */
export function createLocalStateObject(
  options: CreateLocalStateOptions = {},
): LocalStateFile {
  const {
    encryptionKey = WINDOWS_TEST_KEY,
    includeExtras = false,
    auditEnabled = true,
  } = options;

  const encryptedKey = createMockDPAPIKey(encryptionKey);

  const localState: LocalStateFile = {
    os_crypt: {
      encrypted_key: encryptedKey.toString("base64"),
      audit_enabled: auditEnabled,
    },
  };

  if (includeExtras) {
    localState.browser = {
      enabled_labs_experiments: [],
    };
    localState.profile = {
      info_cache: {
        Default: {
          active_time: Date.now() / 1000,
          avatar_icon: "chrome://theme/IDR_PROFILE_AVATAR_0",
          background_apps: false,
          gaia_given_name: "",
          gaia_id: "",
          gaia_name: "",
          is_consented_primary_account: false,
          is_ephemeral: false,
          is_using_default_avatar: true,
          is_using_default_name: true,
          managed_user_id: "",
          metrics_bucket_index: 0,
          name: "Person 1",
          shortcut_name: "",
          user_name: "",
        },
      },
    };
  }

  return localState;
}

/**
 * Create a Local State JSON string
 *
 * @param options - Configuration options
 * @returns JSON string representation
 */
export function createLocalStateJson(
  options: CreateLocalStateOptions = {},
): string {
  return JSON.stringify(createLocalStateObject(options), null, 2);
}

// ============================================================================
// File System Utilities
// ============================================================================

/**
 * Test environment configuration for Windows Chrome fixtures
 */
export interface WindowsTestEnvironment {
  /** Root directory for the test environment */
  rootDir: string;
  /** Path to the User Data directory */
  userDataDir: string;
  /** Path to the Local State file */
  localStatePath: string;
  /** Path to the Default profile directory */
  defaultProfileDir: string;
  /** Path to the Cookies database */
  cookiesDbPath: string;
  /** Cleanup function to remove all test files */
  cleanup: () => void;
}

/**
 * Create a complete Windows Chrome test environment
 *
 * Creates the directory structure:
 * ```
 * {rootDir}/
 *   User Data/
 *     Local State
 *     Default/
 *       Cookies
 * ```
 *
 * @param options - Configuration options
 * @returns Test environment with paths and cleanup function
 */
export function createWindowsTestEnvironment(
  options: CreateLocalStateOptions & {
    /** Base directory (default: system temp) */
    baseDir?: string;
    /** Unique identifier for this test environment */
    testId?: string;
  } = {},
): WindowsTestEnvironment {
  const {
    baseDir = tmpdir(),
    testId = randomBytes(8).toString("hex"),
    ...localStateOptions
  } = options;

  const rootDir = join(baseDir, `chrome-test-${testId}`);
  const userDataDir = join(rootDir, "User Data");
  const localStatePath = join(userDataDir, "Local State");
  const defaultProfileDir = join(userDataDir, "Default");
  const cookiesDbPath = join(defaultProfileDir, "Cookies");

  // Create directory structure
  mkdirSync(defaultProfileDir, { recursive: true });

  // Write Local State file
  writeFileSync(localStatePath, createLocalStateJson(localStateOptions));

  const cleanup = (): void => {
    try {
      if (existsSync(rootDir)) {
        rmSync(rootDir, { recursive: true, force: true });
      }
    } catch {
      // Ignore cleanup errors in tests
    }
  };

  return {
    rootDir,
    userDataDir,
    localStatePath,
    defaultProfileDir,
    cookiesDbPath,
    cleanup,
  };
}

/**
 * Write a Local State file to a specific path
 *
 * @param path - The file path to write to
 * @param options - Configuration options
 */
export function writeLocalStateFile(
  path: string,
  options: CreateLocalStateOptions = {},
): void {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path, createLocalStateJson(options));
}

// ============================================================================
// Error Case Fixtures
// ============================================================================

/**
 * Invalid Local State fixtures for error handling tests
 */
export const INVALID_LOCAL_STATE_CASES = {
  /**
   * Missing os_crypt section entirely
   */
  missingOsCrypt: {
    name: "missing_os_crypt",
    content: JSON.stringify({ browser: {} }),
    expectedError: "Cannot read properties of undefined",
  },

  /**
   * Missing encrypted_key field
   */
  missingEncryptedKey: {
    name: "missing_encrypted_key",
    content: JSON.stringify({ os_crypt: {} }),
    expectedError: "No encrypted key found",
  },

  /**
   * Empty encrypted_key
   */
  emptyEncryptedKey: {
    name: "empty_encrypted_key",
    content: JSON.stringify({ os_crypt: { encrypted_key: "" } }),
    expectedError: "Invalid DPAPI key prefix",
  },

  /**
   * Invalid base64 in encrypted_key
   */
  invalidBase64: {
    name: "invalid_base64",
    content: JSON.stringify({
      os_crypt: { encrypted_key: "not-valid-base64!!!" },
    }),
    expectedError: "Invalid DPAPI key prefix",
  },

  /**
   * Missing DPAPI prefix
   */
  missingDPAPIPrefix: {
    name: "missing_dpapi_prefix",
    content: JSON.stringify({
      os_crypt: {
        encrypted_key: Buffer.from("WRONG" + "x".repeat(32)).toString("base64"),
      },
    }),
    expectedError: "Invalid DPAPI key prefix",
  },

  /**
   * Corrupted JSON
   */
  corruptedJson: {
    name: "corrupted_json",
    content: '{ "os_crypt": { "encrypted_key": ',
    expectedError: "Unexpected end of JSON input",
  },

  /**
   * Not JSON at all
   */
  notJson: {
    name: "not_json",
    content: "This is not JSON",
    expectedError: "Unexpected token",
  },
} as const;

/**
 * Write an invalid Local State file for error testing
 *
 * @param path - The file path to write to
 * @param caseKey - The error case to write
 */
export function writeInvalidLocalState(
  path: string,
  caseKey: keyof typeof INVALID_LOCAL_STATE_CASES,
): void {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path, INVALID_LOCAL_STATE_CASES[caseKey].content);
}

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Result of validating a Local State file
 */
export interface LocalStateValidationResult {
  /** Whether the Local State is valid */
  valid: boolean;
  /** List of validation errors */
  errors: string[];
  /** The parsed Local State (only present if valid) */
  parsed?: LocalStateFile | undefined;
}

/**
 * Validate a Local State file structure
 * @param content - The file content to validate
 * @returns Validation result
 */
export function validateLocalState(
  content: string,
): LocalStateValidationResult {
  const errors: string[] = [];

  let parsed: LocalStateFile;
  try {
    parsed = JSON.parse(content) as LocalStateFile;
  } catch (e) {
    return {
      valid: false,
      errors: [
        `JSON parse error: ${e instanceof Error ? e.message : String(e)}`,
      ],
      parsed: undefined,
    };
  }

  if (!parsed.os_crypt) {
    errors.push("Missing os_crypt section");
  } else if (!parsed.os_crypt.encrypted_key) {
    errors.push("Missing os_crypt.encrypted_key");
  } else {
    try {
      const keyBuffer = Buffer.from(parsed.os_crypt.encrypted_key, "base64");
      if (keyBuffer.length < 5) {
        errors.push("encrypted_key too short");
      } else if (!keyBuffer.subarray(0, 5).equals(DPAPI_PREFIX)) {
        errors.push("encrypted_key missing DPAPI prefix");
      }
    } catch {
      errors.push("encrypted_key is not valid base64");
    }
  }

  const isValid = errors.length === 0;
  return {
    valid: isValid,
    errors,
    parsed: isValid ? parsed : undefined,
  };
}

/**
 * Extract the encryption key from a Local State object
 * (Only works with mock DPAPI keys, not real Windows DPAPI)
 *
 * @param localState - The parsed Local State object
 * @returns The extracted key buffer
 */
export function extractMockKey(localState: LocalStateFile): Buffer {
  const encryptedKey = Buffer.from(localState.os_crypt.encrypted_key, "base64");

  if (!encryptedKey.subarray(0, 5).equals(DPAPI_PREFIX)) {
    throw new Error("Invalid DPAPI key prefix");
  }

  // Return the key portion (after DPAPI prefix)
  return encryptedKey.subarray(5);
}

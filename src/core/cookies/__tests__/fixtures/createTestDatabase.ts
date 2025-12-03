/**
 * Creates a test SQLite database with sample cookie data
 * Used for benchmarking and testing database operations
 *
 * Supports both Windows (v10) and macOS/Linux (v11) encryption formats:
 * - v10: AES-256-GCM with DPAPI-protected key (Windows)
 * - v11: AES-128-CBC with PBKDF2-derived key (macOS/Linux)
 */

import { randomBytes, createCipheriv } from "node:crypto";
import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";

import BetterSqlite3 from "better-sqlite3";

// ============================================================================
// Constants
// ============================================================================

/** Chrome timestamp: microseconds since January 1, 1601 */
const CHROME_EPOCH_OFFSET = 11644473600000; // milliseconds between 1601 and 1970

/** v10 prefix for Windows Chrome cookies */
const V10_PREFIX = Buffer.from("v10");

/** v11 prefix for macOS/Linux Chrome cookies */
const V11_PREFIX = Buffer.from("v11");

/** DPAPI prefix for Windows Local State encrypted key */
const DPAPI_PREFIX = Buffer.from("DPAPI");

/** Default test key for Windows v10 encryption (32 bytes for AES-256) */
const DEFAULT_WINDOWS_TEST_KEY = Buffer.from(
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  "hex",
);

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert a JavaScript Date to Chrome's timestamp format
 * @param date - The date to convert
 * @returns Chrome timestamp (microseconds since 1601-01-01)
 */
function dateToChromiumTimestamp(date: Date): number {
  return (date.getTime() + CHROME_EPOCH_OFFSET) * 1000;
}

// ============================================================================
// Types
// ============================================================================

/**
 * Cookie data structure for Chrome/Chromium databases
 */
interface ChromeCookie {
  creation_utc: number;
  host_key: string;
  name: string;
  value: string;
  path: string;
  expires_utc: number;
  is_secure: number;
  is_httponly: number;
  last_access_utc: number;
  has_expires: number;
  is_persistent: number;
  priority: number;
  encrypted_value: Buffer;
  samesite: number;
  source_scheme: number;
  source_port: number;
  is_same_party: number;
}

/**
 * Encryption format for test cookies
 */
export type EncryptionFormat = "v10" | "v11" | "mixed";

/**
 * Options for creating a Chrome cookie database
 */
export interface ChromeDatabaseOptions {
  /** Number of cookies to generate (default: 1000) */
  cookieCount?: number;
  /** Encryption format to use (default: "v11") */
  encryptionFormat?: EncryptionFormat;
  /** Custom encryption key for v10 format (default: DEFAULT_WINDOWS_TEST_KEY) */
  encryptionKey?: Buffer;
  /** Whether to use deterministic values for reproducible tests */
  deterministic?: boolean;
  /** Custom domains to use */
  domains?: string[];
  /** Custom cookie names to use */
  cookieNames?: string[];
  /** Whether to create a Local State file for Windows testing */
  createLocalState?: boolean;
}

// ============================================================================
// Encryption Functions
// ============================================================================

/**
 * Generate a Windows v10 encrypted cookie value using AES-256-GCM
 *
 * Format: v10 (3 bytes) + nonce (12 bytes) + ciphertext + authTag (16 bytes)
 * @param value - The cookie value to encrypt
 * @param key - The 32-byte AES-256 key
 * @param nonce - Optional 12-byte nonce (random if not provided)
 * @returns The encrypted cookie value with v10 prefix
 */
function generateV10EncryptedValue(
  value: string,
  key: Buffer = DEFAULT_WINDOWS_TEST_KEY,
  nonce?: Buffer,
): Buffer {
  const actualNonce = nonce ?? randomBytes(12);

  const cipher = createCipheriv("aes-256-gcm", key, actualNonce);
  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(value, "utf8")),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([V10_PREFIX, actualNonce, encrypted, authTag]);
}

/**
 * Generate a macOS/Linux v11 encrypted cookie value
 *
 * Note: This is a mock implementation for testing. Real v11 cookies use
 * AES-128-CBC with a PBKDF2-derived key from the keychain password.
 *
 * Format: v11 (3 bytes) + nonce (12 bytes) + encrypted data + auth tag (16 bytes)
 * @param value - The cookie value to encrypt
 * @returns The mock encrypted cookie value with v11 prefix
 */
function generateV11EncryptedValue(value: string): Buffer {
  return Buffer.concat([
    V11_PREFIX,
    randomBytes(12), // nonce
    Buffer.from(value), // mock encrypted data (not real encryption)
    randomBytes(16), // mock auth tag
  ]);
}

/**
 * Generate an encrypted value based on the specified format
 * @param value - The cookie value to encrypt
 * @param format - The encryption format ("v10" or "v11")
 * @param key - The encryption key (only used for v10)
 * @param index - Cookie index (used for deterministic nonce generation)
 * @param deterministic - Whether to use deterministic values
 * @returns The encrypted cookie value
 */
function generateEncryptedValue(
  value: string,
  format: "v10" | "v11" = "v11",
  key?: Buffer,
  index?: number,
  deterministic?: boolean,
): Buffer {
  if (format === "v10") {
    // Generate deterministic nonce if requested
    const nonce =
      deterministic === true && index !== undefined
        ? Buffer.from(`nonce_${index.toString().padStart(6, "0")}`.slice(0, 12))
        : undefined;
    return generateV10EncryptedValue(value, key, nonce);
  }
  return generateV11EncryptedValue(value);
}

// ============================================================================
// Local State File Generation
// ============================================================================

/**
 * Create a Windows Local State file with a mock DPAPI-encrypted key
 * @param localStatePath - Path to write the Local State file
 * @param encryptionKey - The encryption key to embed
 */
export function createWindowsLocalState(
  localStatePath: string,
  encryptionKey: Buffer = DEFAULT_WINDOWS_TEST_KEY,
): void {
  const dir = dirname(localStatePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const mockEncryptedKey = Buffer.concat([DPAPI_PREFIX, encryptionKey]);

  const localState = {
    os_crypt: {
      encrypted_key: mockEncryptedKey.toString("base64"),
      audit_enabled: true,
    },
    browser: {
      enabled_labs_experiments: [],
    },
    profile: {
      info_cache: {
        Default: {
          active_time: Date.now() / 1000,
          name: "Test Profile",
        },
      },
    },
  };

  writeFileSync(localStatePath, JSON.stringify(localState, null, 2));
}

// ============================================================================
// Chrome Database Creation
// ============================================================================

/**
 * Default domains for test cookies
 */
const DEFAULT_DOMAINS = [
  ".example.com",
  ".api.example.com",
  ".auth.example.com",
  ".cdn.example.com",
  ".app.example.com",
  ".test.com",
  ".demo.com",
  ".localhost",
  ".127.0.0.1",
  ".github.com",
];

/**
 * Default cookie names for test cookies
 */
const DEFAULT_COOKIE_NAMES = [
  "session_id",
  "auth_token",
  "user_id",
  "csrf_token",
  "preferences",
  "analytics_id",
  "tracking_id",
  "refresh_token",
  "device_id",
  "language",
  "theme",
  "consent",
  "ab_test",
  "feature_flag",
  "debug_mode",
];

/**
 * Default paths for test cookies
 */
const DEFAULT_PATHS = ["/", "/api", "/auth", "/app", "/admin"];

/**
 * Initialize Chrome database schema (meta table and cookies table)
 * @param db
 */
function initializeChromeSchema(db: BetterSqlite3.Database): void {
  // Create meta table (Chrome specific)
  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT
    );
  `);

  // Insert meta values
  db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)").run(
    "version",
    "20",
  );
  db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)").run(
    "last_compatible_version",
    "20",
  );

  // Create cookies table with Chrome schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS cookies (
      creation_utc INTEGER NOT NULL,
      host_key TEXT NOT NULL,
      name TEXT NOT NULL,
      value TEXT NOT NULL DEFAULT '',
      path TEXT NOT NULL,
      expires_utc INTEGER NOT NULL,
      is_secure INTEGER NOT NULL DEFAULT 0,
      is_httponly INTEGER NOT NULL DEFAULT 0,
      last_access_utc INTEGER NOT NULL,
      has_expires INTEGER NOT NULL DEFAULT 1,
      is_persistent INTEGER NOT NULL DEFAULT 1,
      priority INTEGER NOT NULL DEFAULT 1,
      encrypted_value BLOB DEFAULT '',
      samesite INTEGER NOT NULL DEFAULT -1,
      source_scheme INTEGER NOT NULL DEFAULT 0,
      source_port INTEGER NOT NULL DEFAULT -1,
      is_same_party INTEGER NOT NULL DEFAULT 0,
      UNIQUE (host_key, name, path)
    );
  `);

  // Create indices for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS cookies_host_key_idx ON cookies(host_key);
    CREATE INDEX IF NOT EXISTS cookies_name_idx ON cookies(name);
  `);
}

/**
 * Insert cookies into the database
 * @param db
 * @param config
 * @param config.cookieCount
 * @param config.encryptionFormat
 * @param config.encryptionKey
 * @param config.deterministic
 * @param config.domains
 * @param config.cookieNames
 */
function insertChromeCookies(
  db: BetterSqlite3.Database,
  config: {
    cookieCount: number;
    encryptionFormat: EncryptionFormat;
    encryptionKey: Buffer;
    deterministic: boolean;
    domains: string[];
    cookieNames: string[];
  },
): void {
  const insertCookie = db.prepare(`
    INSERT OR REPLACE INTO cookies (
      creation_utc, host_key, name, value, path, expires_utc,
      is_secure, is_httponly, last_access_utc, has_expires,
      is_persistent, priority, encrypted_value, samesite,
      source_scheme, source_port, is_same_party
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  const now = new Date();
  const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const transaction = db.transaction(() => {
    for (let i = 0; i < config.cookieCount; i++) {
      const domain =
        config.domains[i % config.domains.length] ?? ".example.com";
      const cookieName =
        config.cookieNames[i % config.cookieNames.length] ?? "cookie";
      const name = `${cookieName}_${Math.floor(i / config.cookieNames.length)}`;
      const path = DEFAULT_PATHS[i % DEFAULT_PATHS.length] ?? "/";
      const value = config.deterministic
        ? `value_${i}`
        : `value_${i}_${randomBytes(8).toString("hex")}`;

      const cookieFormat: "v10" | "v11" =
        config.encryptionFormat === "mixed"
          ? i % 2 === 0
            ? "v10"
            : "v11"
          : config.encryptionFormat;

      const cookie: ChromeCookie = {
        creation_utc: dateToChromiumTimestamp(now),
        host_key: domain,
        name,
        value: "",
        path,
        expires_utc: dateToChromiumTimestamp(futureDate),
        is_secure: 1,
        is_httponly: i % 2,
        last_access_utc: dateToChromiumTimestamp(now),
        has_expires: 1,
        is_persistent: 1,
        priority: 1,
        encrypted_value: generateEncryptedValue(
          value,
          cookieFormat,
          config.encryptionKey,
          i,
          config.deterministic,
        ),
        samesite: 0,
        source_scheme: 2,
        source_port: 443,
        is_same_party: 0,
      };

      insertCookie.run(
        cookie.creation_utc,
        cookie.host_key,
        cookie.name,
        cookie.value,
        cookie.path,
        cookie.expires_utc,
        cookie.is_secure,
        cookie.is_httponly,
        cookie.last_access_utc,
        cookie.has_expires,
        cookie.is_persistent,
        cookie.priority,
        cookie.encrypted_value,
        cookie.samesite,
        cookie.source_scheme,
        cookie.source_port,
        cookie.is_same_party,
      );
    }
  });

  transaction();
}

/**
 * Normalize options to ChromeDatabaseOptions
 * @param options
 */
function normalizeOptions(
  options: ChromeDatabaseOptions | number,
): ChromeDatabaseOptions {
  return typeof options === "number" ? { cookieCount: options } : options;
}

/**
 * Ensure directory exists for database
 * @param dbPath
 */
function ensureDirectoryExists(dbPath: string): void {
  const dir = dirname(dbPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Create Chrome-style cookie database
 * @param dbPath - Path to create the database
 * @param options - Configuration options (or cookie count for backward compatibility)
 */
export function createChromeCookieDatabase(
  dbPath: string,
  options: ChromeDatabaseOptions | number = 1000,
): void {
  const opts = normalizeOptions(options);

  const {
    cookieCount = 1000,
    encryptionFormat = "v11",
    encryptionKey = DEFAULT_WINDOWS_TEST_KEY,
    deterministic = false,
    domains = DEFAULT_DOMAINS,
    cookieNames = DEFAULT_COOKIE_NAMES,
    createLocalState: shouldCreateLocalState = false,
  } = opts;

  ensureDirectoryExists(dbPath);

  if (shouldCreateLocalState === true) {
    const localStatePath = join(dirname(dirname(dbPath)), "Local State");
    createWindowsLocalState(localStatePath, encryptionKey);
  }

  const db = new BetterSqlite3(dbPath);

  try {
    initializeChromeSchema(db);
    insertChromeCookies(db, {
      cookieCount,
      encryptionFormat,
      encryptionKey,
      deterministic,
      domains,
      cookieNames,
    });

    const formatLabel =
      encryptionFormat === "mixed" ? "mixed v10/v11" : encryptionFormat;
    console.log(
      `Created ${formatLabel} test database with ${cookieCount} cookies at ${dbPath}`,
    );
  } finally {
    db.close();
  }
}

/**
 * Create a Windows-specific Chrome cookie database with v10 encryption
 *
 * This is a convenience function that creates a database with:
 * - v10 (AES-256-GCM) encrypted cookies
 * - A Local State file with the mock DPAPI key
 * @param dbPath - Path to create the database
 * @param options - Configuration options
 */
export function createWindowsChromeCookieDatabase(
  dbPath: string,
  options: Omit<
    ChromeDatabaseOptions,
    "encryptionFormat" | "createLocalState"
  > = {},
): void {
  createChromeCookieDatabase(dbPath, {
    ...options,
    encryptionFormat: "v10",
    createLocalState: true,
  });
}

/** Firefox cookie domains for testing */
const FIREFOX_DOMAINS = [
  ".example.com",
  ".api.example.com",
  ".test.com",
  ".localhost",
];

/** Firefox cookie names for testing */
const FIREFOX_COOKIE_NAMES = [
  "firefox_session",
  "firefox_auth",
  "firefox_pref",
  "firefox_id",
];

/**
 * Initialize Firefox database schema
 * @param db
 */
function initializeFirefoxSchema(db: BetterSqlite3.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS moz_cookies (
      id INTEGER PRIMARY KEY,
      originAttributes TEXT NOT NULL DEFAULT '',
      name TEXT NOT NULL,
      value TEXT NOT NULL,
      host TEXT NOT NULL,
      path TEXT NOT NULL,
      expiry INTEGER NOT NULL,
      lastAccessed INTEGER NOT NULL,
      creationTime INTEGER NOT NULL,
      isSecure INTEGER NOT NULL DEFAULT 0,
      isHttpOnly INTEGER NOT NULL DEFAULT 0,
      inBrowserElement INTEGER NOT NULL DEFAULT 0,
      sameSite INTEGER NOT NULL DEFAULT 0,
      rawSameSite INTEGER NOT NULL DEFAULT 0,
      schemeMap INTEGER NOT NULL DEFAULT 0,
      CONSTRAINT moz_uniqueid UNIQUE (name, host, path, originAttributes)
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS moz_cookies_host_idx ON moz_cookies(host);
    CREATE INDEX IF NOT EXISTS moz_cookies_name_idx ON moz_cookies(name);
  `);
}

/**
 * Insert Firefox cookies into the database
 * @param db
 * @param cookieCount
 */
function insertFirefoxCookies(
  db: BetterSqlite3.Database,
  cookieCount: number,
): void {
  const insertCookie = db.prepare(`
    INSERT OR REPLACE INTO moz_cookies (
      originAttributes, name, value, host, path, expiry,
      lastAccessed, creationTime, isSecure, isHttpOnly,
      inBrowserElement, sameSite, rawSameSite, schemeMap
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = Math.floor(Date.now() / 1000);
  const futureDate = now + 30 * 24 * 60 * 60;

  const transaction = db.transaction(() => {
    for (let i = 0; i < cookieCount; i++) {
      const domain =
        FIREFOX_DOMAINS[i % FIREFOX_DOMAINS.length] ?? ".example.com";
      const cookieName =
        FIREFOX_COOKIE_NAMES[i % FIREFOX_COOKIE_NAMES.length] ?? "cookie";
      const name = `${cookieName}_${i}`;

      insertCookie.run(
        "",
        name,
        `firefox_value_${i}`,
        domain,
        "/",
        futureDate,
        now * 1000000,
        now * 1000000,
        1,
        0,
        0,
        0,
        0,
        1,
      );
    }
  });

  transaction();
}

/**
 * Create Firefox-style cookie database
 * @param dbPath - Path to create the database
 * @param cookieCount - Number of cookies to generate
 */
export function createFirefoxCookieDatabase(
  dbPath: string,
  cookieCount = 1000,
): void {
  const dir = dirname(dbPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const db = new BetterSqlite3(dbPath);

  try {
    initializeFirefoxSchema(db);
    insertFirefoxCookies(db, cookieCount);
    console.log(
      `Created Firefox test database with ${cookieCount} cookies at ${dbPath}`,
    );
  } finally {
    db.close();
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Result of creating test databases
 */
export interface TestDatabasePaths {
  /** Path to Chrome cookie database */
  chromePath: string;
  /** Path to Firefox cookie database */
  firefoxPath: string;
  /** Path to Windows Chrome cookie database (v10 format) */
  windowsChromePath?: string;
  /** Path to Windows Local State file */
  windowsLocalStatePath?: string;
}

/**
 * Options for creating test databases
 */
export interface CreateTestDatabasesOptions {
  /** Include Windows v10 format database */
  includeWindows?: boolean;
  /** Number of cookies per database */
  cookieCount?: number;
}

/**
 * Create test databases for benchmarking and testing
 * @param baseDir - Base directory to create databases in
 * @param options - Configuration options
 * @param options.includeWindows - Whether to include Windows v10 format database
 * @param options.cookieCount - Number of cookies per database
 * @returns Paths to created databases
 */
export function createTestDatabases(
  baseDir: string,
  options: CreateTestDatabasesOptions = {},
): TestDatabasePaths {
  const { includeWindows = false, cookieCount = 1000 } = options;

  const chromePath = join(baseDir, "chrome_cookies.db");
  const firefoxPath = join(baseDir, "firefox_cookies.db");

  createChromeCookieDatabase(chromePath, { cookieCount });
  createFirefoxCookieDatabase(firefoxPath, Math.floor(cookieCount / 2));

  const result: TestDatabasePaths = {
    chromePath,
    firefoxPath,
  };

  if (includeWindows === true) {
    const windowsDir = join(baseDir, "windows", "Default");
    const windowsChromePath = join(windowsDir, "Cookies");
    const windowsLocalStatePath = join(baseDir, "windows", "Local State");

    createWindowsChromeCookieDatabase(windowsChromePath, { cookieCount });

    result.windowsChromePath = windowsChromePath;
    result.windowsLocalStatePath = windowsLocalStatePath;
  }

  return result;
}

/**
 * Get the default Windows test encryption key
 * Useful for tests that need to decrypt the generated cookies
 * @returns A copy of the default Windows test encryption key
 */
export function getDefaultWindowsTestKey(): Buffer {
  return Buffer.from(DEFAULT_WINDOWS_TEST_KEY);
}

// If run directly, create test databases
if (require.main === module) {
  const testDir = join(__dirname, "test-databases");
  const paths = createTestDatabases(testDir, { includeWindows: true });
  console.log("Created test databases:");
  console.log(`  Chrome (v11):  ${paths.chromePath}`);
  console.log(`  Firefox:       ${paths.firefoxPath}`);
  if (paths.windowsChromePath !== undefined && paths.windowsChromePath !== "") {
    console.log(`  Windows (v10): ${paths.windowsChromePath}`);
    console.log(`  Local State:   ${paths.windowsLocalStatePath}`);
  }
}

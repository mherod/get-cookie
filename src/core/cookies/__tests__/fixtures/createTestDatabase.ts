/**
 * Creates a test SQLite database with sample cookie data
 * Used for benchmarking and testing database operations
 */

import BetterSqlite3 from "better-sqlite3";
import { mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { randomBytes } from "node:crypto";

// Chrome timestamp: microseconds since January 1, 1601
const CHROME_EPOCH_OFFSET = 11644473600000; // milliseconds between 1601 and 1970

function dateToChromiumTimestamp(date: Date): number {
  return (date.getTime() + CHROME_EPOCH_OFFSET) * 1000;
}

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
 * Generate a realistic encrypted value
 * Chrome cookies start with v10 or v11 prefix
 */
function generateEncryptedValue(value: string): Buffer {
  // Simulate Chrome encryption (v11 prefix + encrypted data)
  const prefix = Buffer.from("v11");
  const encrypted = Buffer.concat([
    randomBytes(12), // nonce
    Buffer.from(value), // actual value (normally encrypted)
    randomBytes(16), // auth tag
  ]);
  return Buffer.concat([prefix, encrypted]);
}

/**
 * Create Chrome-style cookie database
 */
export function createChromeCookieDatabase(
  dbPath: string,
  cookieCount = 1000,
): void {
  // Ensure directory exists
  const dir = dirname(dbPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const db = new BetterSqlite3(dbPath);

  try {
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

    // Prepare insert statement
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

    // Generate test cookies
    const now = new Date();
    const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const domains = [
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

    const cookieNames = [
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

    const paths = ["/", "/api", "/auth", "/app", "/admin"];

    // Use transaction for better performance
    const transaction = db.transaction(() => {
      for (let i = 0; i < cookieCount; i++) {
        const domain = domains[i % domains.length];
        const name = `${cookieNames[i % cookieNames.length]}_${Math.floor(
          i / cookieNames.length,
        )}`;
        const path = paths[i % paths.length];
        const value = `value_${i}_${randomBytes(8).toString("hex")}`;

        const cookie: ChromeCookie = {
          creation_utc: dateToChromiumTimestamp(now),
          host_key: domain ?? ".example.com",
          name,
          value: "", // Empty when using encrypted_value
          path: path ?? "/",
          expires_utc: dateToChromiumTimestamp(futureDate),
          is_secure: 1,
          is_httponly: i % 2,
          last_access_utc: dateToChromiumTimestamp(now),
          has_expires: 1,
          is_persistent: 1,
          priority: 1,
          encrypted_value: generateEncryptedValue(value),
          samesite: 0,
          source_scheme: 2, // HTTPS
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

    console.log(
      `Created test database with ${cookieCount} cookies at ${dbPath}`,
    );
  } finally {
    db.close();
  }
}

/**
 * Create Firefox-style cookie database
 */
export function createFirefoxCookieDatabase(
  dbPath: string,
  cookieCount = 1000,
): void {
  // Ensure directory exists
  const dir = dirname(dbPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const db = new BetterSqlite3(dbPath);

  try {
    // Create Firefox cookies table
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

    // Create indices
    db.exec(`
      CREATE INDEX IF NOT EXISTS moz_cookies_host_idx ON moz_cookies(host);
      CREATE INDEX IF NOT EXISTS moz_cookies_name_idx ON moz_cookies(name);
    `);

    // Prepare insert statement
    const insertCookie = db.prepare(`
      INSERT OR REPLACE INTO moz_cookies (
        originAttributes, name, value, host, path, expiry,
        lastAccessed, creationTime, isSecure, isHttpOnly,
        inBrowserElement, sameSite, rawSameSite, schemeMap
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);

    // Generate test cookies
    const now = Math.floor(Date.now() / 1000); // Firefox uses seconds
    const futureDate = now + 30 * 24 * 60 * 60; // 30 days

    const domains = [
      ".example.com",
      ".api.example.com",
      ".test.com",
      ".localhost",
    ];

    const cookieNames = [
      "firefox_session",
      "firefox_auth",
      "firefox_pref",
      "firefox_id",
    ];

    // Use transaction
    const transaction = db.transaction(() => {
      for (let i = 0; i < cookieCount; i++) {
        const domain = domains[i % domains.length];
        const name = `${cookieNames[i % cookieNames.length]}_${i}`;

        insertCookie.run(
          "", // originAttributes
          name,
          `firefox_value_${i}`,
          domain,
          "/",
          futureDate,
          now * 1000000, // microseconds
          now * 1000000, // microseconds
          1, // isSecure
          0, // isHttpOnly
          0, // inBrowserElement
          0, // sameSite
          0, // rawSameSite
          1, // schemeMap
        );
      }
    });

    transaction();

    console.log(
      `Created Firefox test database with ${cookieCount} cookies at ${dbPath}`,
    );
  } finally {
    db.close();
  }
}

// Export a function to create test databases for benchmarking
export function createTestDatabases(baseDir: string): {
  chromePath: string;
  firefoxPath: string;
} {
  const chromePath = join(baseDir, "chrome_cookies.db");
  const firefoxPath = join(baseDir, "firefox_cookies.db");

  createChromeCookieDatabase(chromePath, 1000);
  createFirefoxCookieDatabase(firefoxPath, 500);

  return {
    chromePath,
    firefoxPath,
  };
}

// If run directly, create test databases
if (require.main === module) {
  const testDir = join(__dirname, "test-databases");
  const { chromePath, firefoxPath } = createTestDatabases(testDir);
  console.log("Created test databases:");
  console.log(`  Chrome:  ${chromePath}`);
  console.log(`  Firefox: ${firefoxPath}`);
}

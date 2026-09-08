import { createCipheriv, pbkdf2Sync } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import Database from "better-sqlite3";
import { getPlatform, isLinux, isMacOS, isWindows } from "@utils/platformUtils";

import {
  withCookieQueryOptions,
  withRawCookieValues,
} from "../../../cookies/CookieQueryContext";
import { BaseChromiumCookieQueryStrategy } from "../BaseChromiumCookieQueryStrategy";

jest.mock("../../chrome/getChromiumPassword", () => ({
  getChromiumPassword: jest.fn().mockResolvedValue("password"),
}));

jest.mock("@utils/platformUtils", () => ({
  ...jest.requireActual("@utils/platformUtils"),
  getPlatform: jest.fn(() => "darwin"),
  isMacOS: jest.fn(() => true),
  isWindows: jest.fn(() => false),
  isLinux: jest.fn(() => false),
}));

function encryptAes128Cbc(
  value: string,
  password = "password",
  withHashPrefix = true,
): Buffer {
  const cipher = createCipheriv(
    "aes-128-cbc",
    pbkdf2Sync(password, "saltysalt", isLinux() ? 1 : 1003, 16, "sha1"),
    Buffer.alloc(16, " "),
  );
  const payload = withHashPrefix
    ? Buffer.concat([Buffer.alloc(32, "a"), Buffer.from(value, "utf8")])
    : Buffer.from(value, "utf8");
  return Buffer.concat([
    Buffer.from("v10"),
    cipher.update(payload),
    cipher.final(),
  ]);
}

class TestChromiumStrategy extends BaseChromiumCookieQueryStrategy {
  public constructor(private readonly files: string[]) {
    super("TestChromiumStrategy", "Chrome", "chrome");
  }

  protected override getCookieFilePaths(): string[] {
    return this.files;
  }

  protected override getCookieFiles(): string[] {
    return this.files;
  }

  protected override isPlatformSupported(): boolean {
    return true;
  }
}

const platforms = ["darwin", "linux"] as const;
const forPlatform = describe.each(platforms);
forPlatform(
  "BaseChromiumCookieQueryStrategy — raw values & metadata (%s)",
  (platform) => {
    let tempDir: string;
    let modernDbPath: string;
    let legacyDbPath: string;

    const rawAuthToken = "prefix-12345678-1234-1234-1234-123456789abc-suffix";
    const jwt =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP8p4w62I";
    const percentEncoded = "token%20value%3D123%26role%3Dadmin";
    const futureExpiry = Math.floor(Date.now() / 1000) + 86400;
    // Chrome timestamp: microseconds since 1601-01-01 (approx 11644473600 seconds offset)
    const chromeExpiry = (futureExpiry + 11644473600) * 1000000;

    beforeAll(() => {
      jest.mocked(getPlatform).mockReturnValue(platform);
      jest.mocked(isLinux).mockReturnValue(platform === "linux");
      jest.mocked(isMacOS).mockReturnValue(platform === "darwin");
      jest.mocked(isWindows).mockReturnValue(false);
      tempDir = mkdtempSync(join(tmpdir(), "chromium-raw-test-"));
      modernDbPath = join(tempDir, "modern-cookies.sqlite");
      legacyDbPath = join(tempDir, "legacy-cookies.sqlite");

      // 1. Create modern database with top_frame_site_key
      const modernDb = new Database(modernDbPath);
      modernDb.exec(`
      CREATE TABLE meta (key TEXT NOT NULL UNIQUE, value TEXT);
      INSERT INTO meta VALUES ('version', '24');
      CREATE TABLE cookies (
        creation_utc INTEGER NOT NULL,
        host_key TEXT NOT NULL,
        top_frame_site_key TEXT NOT NULL,
        name TEXT NOT NULL,
        value TEXT NOT NULL,
        encrypted_value BLOB NOT NULL,
        path TEXT NOT NULL,
        expires_utc INTEGER NOT NULL,
        is_secure INTEGER NOT NULL,
        is_httponly INTEGER NOT NULL,
        last_access_utc INTEGER NOT NULL,
        has_expires INTEGER NOT NULL,
        is_persistent INTEGER NOT NULL,
        priority INTEGER NOT NULL,
        samesite INTEGER NOT NULL,
        source_scheme INTEGER NOT NULL,
        source_port INTEGER NOT NULL,
        is_same_party INTEGER NOT NULL,
        last_update_utc INTEGER NOT NULL
      );
    `);

      const insertModern = modernDb.prepare(`
      INSERT INTO cookies (
        creation_utc, host_key, top_frame_site_key, name, value,
        encrypted_value, path, expires_utc, is_secure, is_httponly,
        last_access_utc, has_expires, is_persistent, priority,
        samesite, source_scheme, source_port, is_same_party, last_update_utc
      ) VALUES (
        0, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        0, 1, 1, 1,
        0, 1, 443, 0, 0
      )
    `);

      // Row 1: Encrypted raw auth token with UUID substring and domain wildcard
      insertModern.run(
        ".example.com",
        "",
        "auth_token",
        "",
        encryptAes128Cbc(rawAuthToken),
        "/api",
        chromeExpiry,
        1,
        1,
      );

      // Row 2: Encrypted JWT
      insertModern.run(
        "example.com",
        "",
        "jwt_token",
        "",
        encryptAes128Cbc(jwt),
        "/",
        chromeExpiry,
        1,
        0,
      );

      // Row 3: Plaintext fallback when encrypted_value is empty
      insertModern.run(
        "example.com",
        "",
        "plain_token",
        percentEncoded,
        Buffer.alloc(0),
        "/secure",
        chromeExpiry,
        0,
        1,
      );

      // Row 4: Partitioned cookie with top_frame_site_key
      insertModern.run(
        ".example.com",
        "https://partitioned.com",
        "partition_cookie",
        "val",
        Buffer.alloc(0),
        "/",
        chromeExpiry,
        0,
        0,
      );

      // Row 5: Decryption failure (corrupted encrypted payload)
      insertModern.run(
        "example.com",
        "",
        "corrupt_cookie",
        "",
        Buffer.from("v10badlength"),
        "/failed",
        chromeExpiry,
        1,
        1,
      );

      insertModern.run(
        "example.com",
        "",
        "session_cookie",
        "session%2Fvalue",
        Buffer.alloc(0),
        "/",
        0,
        0,
        1,
      );
      insertModern.run(
        "example.com",
        "",
        "expired_cookie",
        "old",
        Buffer.alloc(0),
        "/",
        (futureExpiry - 172800 + 11644473600) * 1000000,
        0,
        0,
      );
      modernDb.close();

      // 2. Create legacy database WITHOUT top_frame_site_key
      const legacyDb = new Database(legacyDbPath);
      legacyDb.exec(`
      CREATE TABLE cookies (
        creation_utc INTEGER NOT NULL,
        host_key TEXT NOT NULL,
        name TEXT NOT NULL,
        value TEXT NOT NULL,
        encrypted_value BLOB NOT NULL,
        path TEXT NOT NULL,
        expires_utc INTEGER NOT NULL,
        is_secure INTEGER NOT NULL,
        is_httponly INTEGER NOT NULL,
        last_access_utc INTEGER NOT NULL,
        has_expires INTEGER NOT NULL,
        is_persistent INTEGER NOT NULL,
        priority INTEGER NOT NULL,
        samesite INTEGER NOT NULL,
        source_scheme INTEGER NOT NULL,
        source_port INTEGER NOT NULL,
        is_same_party INTEGER NOT NULL,
        last_update_utc INTEGER NOT NULL
      );
    `);

      const insertLegacy = legacyDb.prepare(`
      INSERT INTO cookies (
        creation_utc, host_key, name, value,
        encrypted_value, path, expires_utc, is_secure, is_httponly,
        last_access_utc, has_expires, is_persistent, priority,
        samesite, source_scheme, source_port, is_same_party, last_update_utc
      ) VALUES (
        0, ?, ?, ?,
        ?, ?, ?, ?, ?,
        0, 1, 1, 1,
        0, 1, 443, 0, 0
      )
    `);

      insertLegacy.run(
        "example.com",
        "legacy_token",
        "legacy_plain",
        Buffer.alloc(0),
        "/legacy",
        chromeExpiry,
        1,
        1,
      );

      legacyDb.close();
    });

    afterAll(() => {
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup error
      }
    });

    it("retains session rows for callers that filter converted expiries", async () => {
      const strategy = new TestChromiumStrategy([modernDbPath]);
      const rows = await withCookieQueryOptions(
        { rawValues: true, includeAllExpiries: true },
        () => strategy.queryCookies("%", "%", modernDbPath),
      );
      expect(rows).toContainEqual(
        expect.objectContaining({
          name: "session_cookie",
          value: "session%2Fvalue",
          expiry: "Infinity",
        }),
      );
      expect(rows).toContainEqual(
        expect.objectContaining({
          name: "expired_cookie",
          expiry: expect.any(Date),
        }),
      );
      const defaultRows = await withRawCookieValues(() =>
        strategy.queryCookies("%", "%", modernDbPath),
      );
      expect(defaultRows.some((row) => row.name === "session_cookie")).toBe(
        false,
      );
    });

    it("extracts raw values with full metadata under withRawCookieValues()", async () => {
      const strategy = new TestChromiumStrategy([modernDbPath]);

      const cookies = await withRawCookieValues(async () =>
        strategy.queryCookies("%", "%", modernDbPath),
      );

      const tokenCookie = cookies.find((c) => c.name === "auth_token");
      expect(tokenCookie).toBeDefined();
      expect(tokenCookie?.value).toBe(rawAuthToken);
      expect(tokenCookie?.meta).toMatchObject({
        file: modernDbPath,
        browser: "Chrome",
        decrypted: true,
        secure: true,
        httpOnly: true,
        path: "/api",
        hostOnly: false,
        partitioned: false,
      });

      const jwtCookie = cookies.find((c) => c.name === "jwt_token");
      expect(jwtCookie).toBeDefined();
      expect(jwtCookie?.value).toBe(jwt);
      expect(jwtCookie?.meta).toMatchObject({
        decrypted: true,
        secure: true,
        httpOnly: false,
        path: "/",
        hostOnly: true,
        partitioned: false,
      });

      const plainCookie = cookies.find((c) => c.name === "plain_token");
      expect(plainCookie).toBeDefined();
      expect(plainCookie?.value).toBe(percentEncoded);
      expect(plainCookie?.meta).toMatchObject({
        decrypted: true,
        secure: false,
        httpOnly: true,
        path: "/secure",
        hostOnly: true,
        partitioned: false,
      });

      const partitionedCookie = cookies.find(
        (c) => c.name === "partition_cookie",
      );
      expect(partitionedCookie).toBeDefined();
      expect(partitionedCookie?.meta?.partitioned).toBe(true);

      const corruptCookie = cookies.find((c) => c.name === "corrupt_cookie");
      expect(corruptCookie).toBeDefined();
      expect(corruptCookie?.meta?.decrypted).toBe(false);
      expect(corruptCookie?.meta?.path).toBe("/failed");
    });

    it("preserves display-mode extraction without request metadata and isolates concurrent runs", async () => {
      const strategy = new TestChromiumStrategy([modernDbPath]);

      const [rawCookies, displayCookies] = await Promise.all([
        withRawCookieValues(async () =>
          strategy.queryCookies("%", "%", modernDbPath),
        ),
        strategy.queryCookies("%", "%", modernDbPath),
      ]);

      const rawToken = rawCookies.find((c) => c.name === "auth_token");
      const displayToken = displayCookies.find((c) => c.name === "auth_token");

      expect(rawToken?.value).toBe(rawAuthToken);
      expect(rawToken?.meta?.path).toBe("/api");
      expect(rawToken?.meta?.secure).toBe(true);

      // Linux preserves the decoded wire value; macOS retains legacy display cleanup.
      expect(displayToken?.value).toBe(
        platform === "linux"
          ? rawAuthToken
          : "12345678-1234-1234-1234-123456789abc",
      );
      expect(displayToken?.meta?.path).toBeUndefined();
      expect(displayToken?.meta?.secure).toBeUndefined();
      expect(displayToken?.meta?.hostOnly).toBeUndefined();
    });

    it("handles legacy Chromium schemas without top_frame_site_key gracefully", async () => {
      const strategy = new TestChromiumStrategy([legacyDbPath]);

      const cookies = await withRawCookieValues(async () =>
        strategy.queryCookies("%", "%", legacyDbPath),
      );

      expect(cookies).toHaveLength(1);
      expect(cookies[0]).toMatchObject({
        name: "legacy_token",
        value: "legacy_plain",
        meta: {
          file: legacyDbPath,
          browser: "Chrome",
          decrypted: true,
          secure: true,
          httpOnly: true,
          path: "/legacy",
          hostOnly: true,
          partitioned: false,
        },
      });
    });
  },
);

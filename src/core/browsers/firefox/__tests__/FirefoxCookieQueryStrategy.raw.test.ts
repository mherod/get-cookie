import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import Database from "better-sqlite3";
import fg from "fast-glob";

import { logger } from "@utils/logHelpers";
import * as platformUtils from "@utils/platformUtils";

import { withRawCookieValues } from "../../../cookies/CookieQueryContext";
import { BaseChromiumCookieQueryStrategy } from "../../chromium/BaseChromiumCookieQueryStrategy";
import * as fileSystem from "../../runtime/FileSystemAdapter";
import { SafariCookieQueryStrategy } from "../../safari/SafariCookieQueryStrategy";
import { createStrategy } from "../../StrategyFactory";
import { FirefoxCookieQueryStrategy } from "../FirefoxCookieQueryStrategy";

describe("FirefoxCookieQueryStrategy — raw values & metadata", () => {
  let tempDir: string;
  let schema15Dir: string;
  let schema16Dir: string;
  let schema15DbPath: string;
  let schema16DbPath: string;

  const rawAuthToken = "prefix-12345678-1234-1234-1234-123456789abc-suffix";
  const jwt =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP8p4w62I";
  const percentEncoded = "user%20token%3Dsecret%26scope%3Dadmin";

  const nowMs = Date.now();
  const nowSec = Math.floor(nowMs / 1000);

  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), "firefox-raw-test-"));
    schema15Dir = join(tempDir, "profile-schema15");
    schema16Dir = join(tempDir, "profile-schema16");
    mkdirSync(schema15Dir, { recursive: true });
    mkdirSync(schema16Dir, { recursive: true });

    schema15DbPath = join(schema15Dir, "cookies.sqlite");
    schema16DbPath = join(schema16Dir, "cookies.sqlite");

    // Containers config beside schema16 cookies.sqlite
    writeFileSync(
      join(schema16Dir, "containers.json"),
      JSON.stringify({
        version: 5,
        identities: [
          { userContextId: 1, name: "Personal" },
          { userContextId: 2, name: "Work" },
        ],
      }),
      "utf8",
    );

    // 1. Setup Schema 15 database (user_version = 15, expiry in SECONDS)
    const db15 = new Database(schema15DbPath);
    db15.pragma("user_version = 15");
    db15.exec(`
      CREATE TABLE moz_cookies (
        id INTEGER PRIMARY KEY,
        originAttributes TEXT NOT NULL DEFAULT '',
        name TEXT,
        value TEXT,
        host TEXT,
        path TEXT,
        expiry INTEGER,
        lastAccessed INTEGER,
        creationTime INTEGER,
        isSecure INTEGER,
        isHttpOnly INTEGER,
        inBrowserElement INTEGER DEFAULT 0,
        sameSite INTEGER DEFAULT 0,
        rawSameSite INTEGER DEFAULT 0,
        schemeMap INTEGER DEFAULT 0
      );
    `);

    const insert15 = db15.prepare(`
      INSERT INTO moz_cookies (
        originAttributes, name, value, host, path,
        expiry, lastAccessed, creationTime, isSecure, isHttpOnly
      ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
    `);

    // Schema 15: Valid unexpired cookie (expiry in seconds)
    insert15.run(
      "",
      "auth_token",
      rawAuthToken,
      ".example.com",
      "/api",
      nowSec + 7200,
      1,
      1,
    );

    // Schema 15: Expired cookie (in seconds) - should be filtered out
    insert15.run(
      "",
      "expired_cookie",
      "old_val",
      "example.com",
      "/",
      nowSec - 3600,
      0,
      0,
    );

    // Schema 15: Session cookie (expiry = 0) - should be filtered out
    insert15.run("", "session_cookie", "sess_val", "example.com", "/", 0, 0, 0);

    db15.close();

    // 2. Setup Schema 16 database (user_version = 16, expiry in MILLISECONDS)
    const db16 = new Database(schema16DbPath);
    db16.pragma("user_version = 16");
    db16.exec(`
      CREATE TABLE moz_cookies (
        id INTEGER PRIMARY KEY,
        originAttributes TEXT NOT NULL DEFAULT '',
        name TEXT,
        value TEXT,
        host TEXT,
        path TEXT,
        expiry INTEGER,
        lastAccessed INTEGER,
        creationTime INTEGER,
        isSecure INTEGER,
        isHttpOnly INTEGER,
        inBrowserElement INTEGER DEFAULT 0,
        sameSite INTEGER DEFAULT 0,
        rawSameSite INTEGER DEFAULT 0,
        schemeMap INTEGER DEFAULT 0
      );
    `);

    const insert16 = db16.prepare(`
      INSERT INTO moz_cookies (
        originAttributes, name, value, host, path,
        expiry, lastAccessed, creationTime, isSecure, isHttpOnly
      ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
    `);

    // Schema 16: Future cookie with userContextId=2 (Work container)
    insert16.run(
      "^userContextId=2",
      "jwt_work",
      jwt,
      "example.com",
      "/work",
      nowMs + 7200000,
      1,
      0,
    );

    // Schema 16: Future cookie with no container
    insert16.run(
      "",
      "default_token",
      percentEncoded,
      "example.com",
      "/",
      nowMs + 7200000,
      0,
      1,
    );

    // Schema 16: Partitioned cookie via partitionKey
    insert16.run(
      "^partitionKey=(https,example.com)&userContextId=2",
      "part_key_cookie",
      "partition_val",
      ".example.com",
      "/part",
      nowMs + 7200000,
      1,
      1,
    );

    // Schema 16: Partitioned cookie via firstPartyDomain
    insert16.run(
      "^firstPartyDomain=example.com",
      "fpd_cookie",
      "fpd_val",
      "example.com",
      "/fpd",
      nowMs + 7200000,
      0,
      0,
    );

    // Schema 16: Expired cookie (in ms) - should be filtered out
    insert16.run(
      "",
      "expired_ms_cookie",
      "expired",
      "example.com",
      "/",
      nowMs - 3600000,
      0,
      0,
    );

    db16.close();
  });

  afterAll(() => {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("converts schema < 16 seconds expiry and filters expired rows in raw mode", async () => {
    const strategy = new FirefoxCookieQueryStrategy();

    const cookies = await withRawCookieValues(async () =>
      strategy.queryCookies("%", "%", schema15DbPath),
    );

    expect(cookies).toHaveLength(1);
    const [cookie] = cookies;
    expect(cookie?.name).toBe("auth_token");
    expect(cookie?.value).toBe(rawAuthToken);
    expect(cookie?.domain).toBe(".example.com");
    const expiry = cookie?.expiry;
    expect(expiry).toBeInstanceOf(Date);
    if (!(expiry instanceof Date)) {
      throw new Error("Expected Firefox cookie expiry to be a Date");
    }
    // Expiry converted from seconds to a future Date.
    expect(expiry.getTime()).toBeGreaterThan(nowMs);
    expect(cookie?.meta).toMatchObject({
      file: schema15DbPath,
      browser: "Firefox",
      decrypted: false,
      secure: true,
      httpOnly: true,
      path: "/api",
      hostOnly: false,
      partitioned: false,
    });
    expect(cookie?.meta?.containerId).toBeUndefined();
  });

  it("converts schema >= 16 milliseconds expiry, handles containers and partitions", async () => {
    const strategy = new FirefoxCookieQueryStrategy();

    const cookies = await withRawCookieValues(async () =>
      strategy.queryCookies("%", "%", schema16DbPath),
    );

    // Should include jwt_work, default_token, part_key_cookie, fpd_cookie (and exclude expired_ms_cookie)
    expect(cookies).toHaveLength(4);

    const workCookie = cookies.find((c) => c.name === "jwt_work");
    expect(workCookie).toBeDefined();
    expect(workCookie?.value).toBe(jwt);
    expect(workCookie?.meta).toMatchObject({
      path: "/work",
      secure: true,
      httpOnly: false,
      hostOnly: true,
      partitioned: false,
      containerId: 2,
    });

    const defaultCookie = cookies.find((c) => c.name === "default_token");
    expect(defaultCookie).toBeDefined();
    expect(defaultCookie?.value).toBe(percentEncoded);
    expect(defaultCookie?.meta).toMatchObject({
      path: "/",
      secure: false,
      httpOnly: true,
      hostOnly: true,
      partitioned: false,
    });
    expect(defaultCookie?.meta?.containerId).toBeUndefined();

    const partCookie = cookies.find((c) => c.name === "part_key_cookie");
    expect(partCookie).toBeDefined();
    expect(partCookie?.meta).toMatchObject({
      path: "/part",
      partitioned: true,
      containerId: 2,
    });

    const fpdCookie = cookies.find((c) => c.name === "fpd_cookie");
    expect(fpdCookie).toBeDefined();
    expect(fpdCookie?.meta).toMatchObject({
      path: "/fpd",
      partitioned: true,
    });
  });

  it("filters cookies by container option (numeric, 'none', and named from containers.json)", async () => {
    // 1. Filter by numeric container ID (userContextId = 2)
    const workStrategy = new FirefoxCookieQueryStrategy(undefined, 2);
    const workCookies = await withRawCookieValues(async () =>
      workStrategy.queryCookies("%", "%", schema16DbPath),
    );
    expect(workCookies.every((c) => c.meta?.containerId === 2)).toBe(true);
    expect(workCookies.some((c) => c.name === "jwt_work")).toBe(true);
    expect(workCookies.some((c) => c.name === "default_token")).toBe(false);

    // 2. Filter by 'none' (default container without userContextId)
    const noneStrategy = new FirefoxCookieQueryStrategy(undefined, "none");
    const noneCookies = await withRawCookieValues(async () =>
      noneStrategy.queryCookies("%", "%", schema16DbPath),
    );
    expect(noneCookies.every((c) => c.meta?.containerId === undefined)).toBe(
      true,
    );
    expect(noneCookies.some((c) => c.name === "default_token")).toBe(true);
    expect(noneCookies.some((c) => c.name === "jwt_work")).toBe(false);

    // 3. Filter by named container ('work' resolves to userContextId = 2 via containers.json)
    const namedStrategy = new FirefoxCookieQueryStrategy(undefined, "work");
    const namedCookies = await withRawCookieValues(async () =>
      namedStrategy.queryCookies("%", "%", schema16DbPath),
    );
    expect(namedCookies.every((c) => c.meta?.containerId === 2)).toBe(true);
    expect(namedCookies.some((c) => c.name === "jwt_work")).toBe(true);
  });

  it("preserves display-mode compatibility and isolates concurrent raw and display calls", async () => {
    const strategy = new FirefoxCookieQueryStrategy();

    const [rawCookies, displayCookies] = await Promise.all([
      withRawCookieValues(async () =>
        strategy.queryCookies("%", "%", schema16DbPath),
      ),
      strategy.queryCookies("%", "%", schema16DbPath),
    ]);

    const rawWork = rawCookies.find((c) => c.name === "jwt_work");
    const displayWork = displayCookies.find((c) => c.name === "jwt_work");

    expect(rawWork?.value).toBe(jwt);
    expect(rawWork?.meta?.path).toBe("/work");
    expect(rawWork?.meta?.secure).toBe(true);
    expect(rawWork?.meta?.containerId).toBe(2);

    expect(displayWork?.value).toBe(jwt);
    // Display mode does not include request metadata
    expect(displayWork?.meta?.path).toBeUndefined();
    expect(displayWork?.meta?.secure).toBeUndefined();
    expect(displayWork?.meta?.hostOnly).toBeUndefined();
    expect(displayWork?.meta?.partitioned).toBeUndefined();
    // containerId is retained for display purposes
    expect(displayWork?.meta?.containerId).toBe(2);
  });

  const invalidContainerConfigs = [
    { label: "missing", content: undefined },
    { label: "unknown", content: JSON.stringify({ identities: [] }) },
    { label: "malformed", content: "{invalid" },
  ];

  const forConfig = describe.each(invalidContainerConfigs);
  forConfig("$label container config", ({ content }) => {
    const profileOrders = [false, true];
    const forOrder = it.each(profileOrders);
    forOrder("keeps cookies (valid first: %s)", async (validFirst) => {
      const configPath = join(schema15Dir, "containers.json");
      if (content !== undefined) {
        writeFileSync(configPath, content, "utf8");
      }
      const paths = validFirst
        ? [schema16DbPath, schema15DbPath]
        : [schema15DbPath, schema16DbPath];
      const platform = jest
        .spyOn(platformUtils, "getPlatform")
        .mockReturnValue("darwin");
      const fileExists = fileSystem.fileExists;
      const exists = jest
        .spyOn(fileSystem, "fileExists")
        .mockImplementation(
          (path) => path.endsWith("Firefox") || fileExists(path),
        );
      const glob = jest.spyOn(fg, "sync").mockReturnValue(paths);
      jest.mocked(logger.debug).mockClear();
      try {
        const strategy = new FirefoxCookieQueryStrategy(undefined, "work");
        const cookies = await withRawCookieValues(async () =>
          strategy.queryCookies("%", "%"),
        );
        expect(cookies.map((cookie) => cookie.name).sort()).toEqual([
          "jwt_work",
          "part_key_cookie",
        ]);
        expect(logger.debug).toHaveBeenCalledWith(
          "Skipping Firefox profile: query configuration failed",
          expect.objectContaining({
            file: schema15DbPath,
            container: "work",
            error: "Unknown Firefox container: 'work'",
          }),
        );
      } finally {
        platform.mockRestore();
        exists.mockRestore();
        glob.mockRestore();
        rmSync(configPath, { force: true });
      }
    });
  });

  const compositeContainers = [2, "work", "none"];
  const forCompositeContainer = it.each(compositeContainers);
  forCompositeContainer("filters composite cookies (%s)", async (container) => {
    const chromium = jest
      .spyOn(BaseChromiumCookieQueryStrategy.prototype, "queryCookies")
      .mockResolvedValue([]);
    const safari = jest
      .spyOn(SafariCookieQueryStrategy.prototype, "queryCookies")
      .mockResolvedValue([]);
    try {
      const strategy = createStrategy({ container });
      const cookies = await withRawCookieValues(async () =>
        strategy.queryCookies("%", "%", schema16DbPath),
      );
      expect(cookies.map((cookie) => cookie.name).sort()).toEqual(
        container === "none"
          ? ["default_token", "fpd_cookie"]
          : ["jwt_work", "part_key_cookie"],
      );
    } finally {
      chromium.mockRestore();
      safari.mockRestore();
    }
  });
});

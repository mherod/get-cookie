/**
 * Tests for EnhancedCookieQueryService
 */

import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from "@jest/globals";

import {
  EnhancedCookieQueryService,
  type EnhancedQueryOptions,
} from "../EnhancedCookieQueryService";
import {
  DatabaseConnectionManager,
  resetGlobalConnectionManager,
} from "../DatabaseConnectionManager";
import type { SqliteDatabase } from "../adapters/DatabaseAdapter";

// Mock the adapter factory so no real SQLite files are needed
jest.mock("../adapters/DatabaseAdapter");

// Mock node:fs for file discovery tests
jest.mock("node:fs", () => ({
  existsSync: jest.fn().mockReturnValue(false),
  readdirSync: jest.fn().mockReturnValue([]),
}));

// Mock getPlatform to return "darwin" so path lookups are deterministic across CI
jest.mock("@utils/platformUtils", () => {
  const actual = jest.requireActual<typeof import("@utils/platformUtils")>(
    "@utils/platformUtils",
  );
  return { ...actual, getPlatform: jest.fn().mockReturnValue("darwin") };
});

describe("EnhancedCookieQueryService", () => {
  let service: EnhancedCookieQueryService;
  let mockDb: jest.Mocked<SqliteDatabase>;
  let mockStmt: { all: jest.Mock; get: jest.Mock; run: jest.Mock };
  let manager: DatabaseConnectionManager;
  let mockExistsSync: jest.Mock;
  let mockReaddirSync: jest.Mock;

  beforeEach(() => {
    mockStmt = {
      all: jest.fn().mockReturnValue([]),
      get: jest.fn().mockReturnValue(undefined),
      run: jest.fn().mockReturnValue({ changes: 0 }),
    };

    mockDb = {
      prepare: jest.fn().mockReturnValue(mockStmt),
      close: jest.fn(),
      pragma: jest.fn(),
      readonly: true,
    } as unknown as jest.Mocked<SqliteDatabase>;

    const adapterModule = require("../adapters/DatabaseAdapter");
    (adapterModule.createSqliteDatabase as jest.Mock).mockReturnValue(mockDb);

    const fs = require("node:fs");
    mockExistsSync = fs.existsSync as jest.Mock;
    mockReaddirSync = fs.readdirSync as jest.Mock;
    mockExistsSync.mockReturnValue(false);
    mockReaddirSync.mockReturnValue([]);

    manager = new DatabaseConnectionManager({
      maxConnections: 2,
      idleTimeout: 5000,
      enableMonitoring: false,
      retryAttempts: 1,
    });

    service = new EnhancedCookieQueryService(manager);
  });

  afterEach(() => {
    service.shutdown();
    resetGlobalConnectionManager();
    jest.restoreAllMocks();
  });

  describe("queryCookies without filepath", () => {
    it("returns empty data when no filepath is provided", async () => {
      const options: EnhancedQueryOptions = {
        browser: "firefox",
        name: "%",
        domain: "%",
      };

      const result = await service.queryCookies(options);
      expect(result.data).toEqual([]);
      expect(result.cached).toBe(false);
    });

    it("returns empty data for chrome when no filepath is provided", async () => {
      const options: EnhancedQueryOptions = {
        browser: "chrome",
        name: "session",
        domain: "example.com",
      };

      const result = await service.queryCookies(options);
      expect(result.data).toEqual([]);
    });

    it("returns empty data with no error when no files are discovered", async () => {
      const options: EnhancedQueryOptions = {
        browser: "edge",
        name: "%",
        domain: "%",
        includeMetrics: true,
      };

      const result = await service.queryCookies(options);
      expect(result.data).toEqual([]);
      // No error — discoverBrowserFiles returns [] gracefully
      expect(result.cached).toBe(false);
    });
  });

  describe("queryCookies with filepath", () => {
    it("returns empty data when no rows match", async () => {
      const options: EnhancedQueryOptions = {
        browser: "firefox",
        name: "test",
        domain: "example.com",
        filepath: "/fake/path/cookies.sqlite",
      };

      // mockStmt.all already returns []
      const result = await service.queryCookies(options);

      expect(result.data).toEqual([]);
      expect(result.cached).toBe(false);
    });

    it("does not throw when filepath is provided even if db is empty", async () => {
      const options: EnhancedQueryOptions = {
        browser: "chrome",
        name: "%",
        domain: "%",
        filepath: "/fake/path/Cookies",
      };

      await expect(service.queryCookies(options)).resolves.toHaveProperty(
        "data",
      );
    });
  });

  describe("discoverBrowserFiles via queryCookies", () => {
    it("discovers Chromium cookie files from Default profile", async () => {
      mockExistsSync.mockImplementation((...args: unknown[]) => {
        const p = String(args[0]);
        if (p.endsWith("/Default/Cookies")) {
          return true;
        }
        // Data dir must exist
        if (
          p.includes("Chrome") &&
          !p.includes("Default") &&
          !p.includes("Profile")
        ) {
          return true;
        }
        return false;
      });

      const options: EnhancedQueryOptions = {
        browser: "chrome",
        name: "%",
        domain: "%",
      };

      await service.queryCookies(options);
      // Should have attempted to query the discovered file
      expect(mockDb.prepare).toHaveBeenCalled();
    });

    it("discovers Firefox cookie files from profile directories", async () => {
      mockExistsSync.mockImplementation((...args: unknown[]) => {
        const p = String(args[0]);
        if (p.includes("Firefox") || p.includes("firefox")) {
          return true;
        }
        if (p.endsWith("abc123.default/cookies.sqlite")) {
          return true;
        }
        return false;
      });
      mockReaddirSync.mockReturnValue([
        "abc123.default",
        "profiles.ini",
        "xyz789.default-release",
      ]);

      const options: EnhancedQueryOptions = {
        browser: "firefox",
        name: "%",
        domain: "%",
      };

      await service.queryCookies(options);
      // Should have found at least the abc123.default profile
      expect(mockExistsSync).toHaveBeenCalledWith(
        expect.stringContaining("cookies.sqlite"),
      );
    });

    it("returns empty array for unsupported browser with no data dir", async () => {
      const options: EnhancedQueryOptions = {
        browser: "brave",
        name: "%",
        domain: "%",
      };

      const result = await service.queryCookies(options);
      expect(result.data).toEqual([]);
    });

    it("returns empty array when Firefox profiles dir does not exist", async () => {
      mockExistsSync.mockReturnValue(false);

      const options: EnhancedQueryOptions = {
        browser: "firefox",
        name: "%",
        domain: "%",
      };

      const result = await service.queryCookies(options);
      expect(result.data).toEqual([]);
    });

    it("returns empty array when Chromium data dir exists but no profiles found", async () => {
      mockExistsSync.mockImplementation((...args: unknown[]) => {
        const p = String(args[0]);
        // Data dir exists but no profile Cookies files
        if (
          p.includes("Chrome") &&
          !p.includes("Default") &&
          !p.includes("Profile")
        ) {
          return true;
        }
        return false;
      });

      const options: EnhancedQueryOptions = {
        browser: "chrome",
        name: "%",
        domain: "%",
      };

      const result = await service.queryCookies(options);
      expect(result.data).toEqual([]);
    });
  });
});

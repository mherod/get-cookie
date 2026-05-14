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
}));

// Mock fast-glob for file discovery tests (replaces readdirSync-based iteration)
jest.mock("fast-glob", () => ({
  sync: jest.fn().mockReturnValue([]),
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
  let mockFgSync: jest.Mock;

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
    mockExistsSync.mockReturnValue(false);

    const fg = require("fast-glob");
    mockFgSync = fg.sync as jest.Mock;
    mockFgSync.mockReturnValue([]);

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
      // Data dir must exist for the guard check
      mockExistsSync.mockImplementation((...args: unknown[]) => {
        const p = String(args[0]).replace(/\\/g, "/");
        return (
          p.includes("Chrome") &&
          !p.includes("Default") &&
          !p.includes("Profile")
        );
      });
      // fg.sync returns the discovered cookie files
      mockFgSync.mockReturnValue(["/fake/Chrome/Default/Cookies"]);

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
      // Profiles dir must exist for the guard check
      mockExistsSync.mockImplementation((...args: unknown[]) => {
        const p = String(args[0]).replace(/\\/g, "/");
        return p.includes("Firefox") || p.includes("firefox");
      });
      // fg.sync returns the discovered cookie files
      mockFgSync.mockReturnValue([
        "/fake/Firefox/Profiles/abc123.default/cookies.sqlite",
      ]);

      const options: EnhancedQueryOptions = {
        browser: "firefox",
        name: "%",
        domain: "%",
      };

      await service.queryCookies(options);
      // Should have attempted to query the discovered file
      expect(mockDb.prepare).toHaveBeenCalled();
    });

    it("discovers Linux Firefox cookies from the traditional ~/.mozilla/firefox path", async () => {
      const { getPlatform } = jest.requireMock("@utils/platformUtils") as {
        getPlatform: jest.Mock;
      };
      getPlatform.mockReturnValueOnce("linux");
      // Only the traditional dir exists; the XDG dir is absent.
      mockExistsSync.mockImplementation((...args: unknown[]) => {
        const p = String(args[0]).replace(/\\/g, "/");
        return p.endsWith("/.mozilla/firefox");
      });
      mockFgSync.mockReturnValue([
        "/home/user/.mozilla/firefox/abc.default/cookies.sqlite",
      ]);

      await service.queryCookies({
        browser: "firefox",
        name: "%",
        domain: "%",
      });

      expect(mockDb.prepare).toHaveBeenCalled();
      expect(mockFgSync).toHaveBeenCalledWith(
        ["*default*/cookies.sqlite"],
        expect.objectContaining({
          cwd: expect.stringMatching(/\.mozilla[/\\]firefox$/),
        }),
      );
    });

    it("discovers Linux Firefox cookies from the XDG ~/.config/mozilla/firefox path when the traditional path is absent", async () => {
      const { getPlatform } = jest.requireMock("@utils/platformUtils") as {
        getPlatform: jest.Mock;
      };
      getPlatform.mockReturnValueOnce("linux");
      // Traditional dir absent; XDG dir is the only one present.
      mockExistsSync.mockImplementation((...args: unknown[]) => {
        const p = String(args[0]).replace(/\\/g, "/");
        return p.endsWith("/.config/mozilla/firefox");
      });
      mockFgSync.mockReturnValue([
        "/home/user/.config/mozilla/firefox/xyz.default/cookies.sqlite",
      ]);

      await service.queryCookies({
        browser: "firefox",
        name: "%",
        domain: "%",
      });

      expect(mockDb.prepare).toHaveBeenCalled();
      expect(mockFgSync).toHaveBeenCalledWith(
        ["*default*/cookies.sqlite"],
        expect.objectContaining({
          cwd: expect.stringMatching(/\.config[/\\]mozilla[/\\]firefox$/),
        }),
      );
    });

    it("returns empty data on Linux when neither Firefox profile root exists", async () => {
      const { getPlatform } = jest.requireMock("@utils/platformUtils") as {
        getPlatform: jest.Mock;
      };
      getPlatform.mockReturnValueOnce("linux");
      mockExistsSync.mockReturnValue(false);

      const result = await service.queryCookies({
        browser: "firefox",
        name: "%",
        domain: "%",
      });

      expect(result.data).toEqual([]);
      expect(mockDb.prepare).not.toHaveBeenCalled();
    });

    it("discovers Brave cookie files from Default profile", async () => {
      mockExistsSync.mockImplementation((...args: unknown[]) => {
        const p = String(args[0]).replace(/\\/g, "/");
        return (
          p.includes("Brave") &&
          !p.includes("Default") &&
          !p.includes("Profile")
        );
      });
      mockFgSync.mockReturnValue(["/fake/Brave/Default/Cookies"]);

      const options: EnhancedQueryOptions = {
        browser: "brave",
        name: "%",
        domain: "%",
      };

      await service.queryCookies(options);
      expect(mockDb.prepare).toHaveBeenCalled();
    });

    it("discovers Arc cookie files from Default profile", async () => {
      mockExistsSync.mockImplementation((...args: unknown[]) => {
        const p = String(args[0]).replace(/\\/g, "/");
        return (
          p.includes("Arc") && !p.includes("Default") && !p.includes("Profile")
        );
      });
      mockFgSync.mockReturnValue(["/fake/Arc/Default/Cookies"]);

      const options: EnhancedQueryOptions = {
        browser: "arc",
        name: "%",
        domain: "%",
      };

      await service.queryCookies(options);
      expect(mockDb.prepare).toHaveBeenCalled();
    });

    it("returns empty array when Brave data dir does not exist", async () => {
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
        const p = String(args[0]).replace(/\\/g, "/");
        return (
          p.includes("Chrome") &&
          !p.includes("Default") &&
          !p.includes("Profile")
        );
      });
      // fg.sync returns empty — no profile directories found
      mockFgSync.mockReturnValue([]);

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

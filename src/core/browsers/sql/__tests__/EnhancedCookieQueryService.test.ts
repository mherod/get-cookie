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

describe("EnhancedCookieQueryService", () => {
  let service: EnhancedCookieQueryService;
  let mockDb: jest.Mocked<SqliteDatabase>;
  let mockStmt: { all: jest.Mock; get: jest.Mock; run: jest.Mock };
  let manager: DatabaseConnectionManager;

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

    it("includes error info in metrics when includeMetrics is true and no filepath", async () => {
      const options: EnhancedQueryOptions = {
        browser: "edge",
        name: "%",
        domain: "%",
        includeMetrics: true,
      };

      const result = await service.queryCookies(options);
      expect(result.data).toEqual([]);
      expect(result.metrics?.success).toBe(false);
      expect(result.metrics?.error).toMatch(
        /Auto-discovery.*not yet implemented/,
      );
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
});

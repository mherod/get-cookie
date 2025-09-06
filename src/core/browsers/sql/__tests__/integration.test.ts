/**
 * Integration tests for SQL utilities with browser strategies
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import BetterSqlite3, { type Database } from "better-sqlite3";
import {
  CookieQueryBuilder,
  createQueryBuilder,
  isSqlBrowser,
  type SqlBrowserType,
} from "../CookieQueryBuilder";
import {
  DatabaseConnectionManager,
  getGlobalConnectionManager,
  resetGlobalConnectionManager,
} from "../DatabaseConnectionManager";
import {
  QueryMonitor,
  getGlobalQueryMonitor,
  resetGlobalQueryMonitor,
} from "../QueryMonitor";
// QuerySqliteThenTransform has been deprecated and inlined

// Mock better-sqlite3
jest.mock("better-sqlite3");

describe("SQL Integration Tests", () => {
  let tempDir: string;
  let testDbPath: string;
  let mockDb: jest.Mocked<Database>;
  let mockStmt: {
    all: jest.Mock;
    get: jest.Mock;
    run: jest.Mock;
  };

  beforeEach(() => {
    // Reset global instances
    resetGlobalConnectionManager();
    resetGlobalQueryMonitor();

    // Create temp directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sql-integration-"));
    testDbPath = path.join(tempDir, "cookies.db");

    // Create mock database
    mockStmt = {
      all: jest.fn().mockReturnValue([
        {
          name: "session",
          encrypted_value: Buffer.from("encrypted"),
          host_key: ".example.com",
          expires_utc: 13350000000000000,
        },
      ]),
      get: jest.fn().mockReturnValue({ value: "20" }), // Chrome version
      run: jest.fn(),
    };

    mockDb = {
      prepare: jest.fn().mockReturnValue(mockStmt),
      close: jest.fn(),
      exec: jest.fn(),
      pragma: jest.fn(),
      backup: jest.fn(),
      serialize: jest.fn(),
      function: jest.fn(),
      aggregate: jest.fn(),
      loadExtension: jest.fn(),
      table: jest.fn(),
      transaction: jest.fn(),
      readonly: true,
      name: testDbPath,
      open: true,
      inTransaction: false,
      memory: false,
    } as unknown as jest.Mocked<Database>;

    (
      BetterSqlite3 as unknown as jest.MockedFunction<typeof BetterSqlite3>
    ).mockReturnValue(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Reset global instances to cleanup intervals and connections
    resetGlobalConnectionManager();
    resetGlobalQueryMonitor();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  afterAll(() => {
    // Final cleanup to ensure no hanging processes
    resetGlobalConnectionManager();
    resetGlobalQueryMonitor();
  });

  describe("Query Builder Integration", () => {
    it("should generate correct queries for Chrome", () => {
      const builder = new CookieQueryBuilder("chrome");
      const query = builder.buildSelectQuery({
        name: "session",
        domain: "example.com",
        browser: "chrome",
      });

      expect(query.sql).toContain("SELECT");
      expect(query.sql).toContain("FROM cookies");
      expect(query.sql).toContain("encrypted_value");
      expect(query.params).toEqual([
        "session",
        "example.com",
        ".example.com",
        "%.example.com",
      ]);
    });

    it("should generate correct queries for Firefox", () => {
      const builder = new CookieQueryBuilder("firefox");
      const query = builder.buildSelectQuery({
        name: "session",
        domain: "example.com",
        browser: "firefox",
      });

      expect(query.sql).toContain("FROM moz_cookies");
      expect(query.sql).toContain("value AS value");
      // Firefox also includes the expiry timestamp parameter
      expect(query.params).toEqual([
        "session",
        "example.com",
        ".example.com",
        "%.example.com",
        expect.any(Number),
      ]);
    });

    it("should validate browser types", () => {
      const browsers: SqlBrowserType[] = [
        "chrome",
        "firefox",
        "edge",
        "opera",
        "brave",
        "arc",
        "chromium",
      ];

      browsers.forEach((browser) => {
        expect(isSqlBrowser(browser)).toBe(true);
        expect(() => createQueryBuilder(browser)).not.toThrow();
      });

      expect(isSqlBrowser("safari")).toBe(false);
    });
  });

  describe("Connection Manager Integration", () => {
    it("should work with query builder", async () => {
      const manager = getGlobalConnectionManager();
      const builder = new CookieQueryBuilder("chrome");
      const queryConfig = builder.buildSelectQuery({
        name: "session",
        domain: "example.com",
        browser: "chrome",
      });

      const result = await manager.executeQuery(
        testDbPath,
        (db) => {
          const stmt = db.prepare(queryConfig.sql);
          return stmt.all(...queryConfig.params);
        },
        queryConfig.description,
      );

      expect(result).toHaveLength(1);
      expect((result as unknown as Array<{ name: string }>)[0].name).toBe(
        "session",
      );
    });

    it("should handle connection pooling", async () => {
      const manager = new DatabaseConnectionManager({
        maxConnections: 2,
      });

      try {
        // Create multiple connections
        const conn1 = await manager.getConnection("db1.db");
        const _conn2 = await manager.getConnection("db2.db");

        manager.releaseConnection("db1.db");

        // This should reuse conn1
        const conn3 = await manager.getConnection("db1.db");

        expect(conn3).toBe(conn1);
        expect(BetterSqlite3).toHaveBeenCalledTimes(2);
      } finally {
        // Clean up the manager to stop its timers
        manager.closeAll();
      }
    });

    it("should track metrics", async () => {
      const manager = getGlobalConnectionManager({
        enableMonitoring: true,
      });

      await manager.executeQuery(
        testDbPath,
        (db) => {
          const stmt = db.prepare("SELECT * FROM cookies");
          return stmt.all();
        },
        "Test query",
      );

      const stats = manager.getStatistics();
      expect(stats.totalQueries).toBe(1);
      expect(stats.totalConnections).toBe(1);
    });
  });

  describe("Query Monitor Integration", () => {
    it("should monitor queries from connection manager", async () => {
      const manager = getGlobalConnectionManager();
      const monitor = getGlobalQueryMonitor();

      await manager.executeQuery(
        testDbPath,
        (db) => {
          return monitor.executeQuery(
            db,
            "SELECT * FROM cookies",
            [],
            testDbPath,
          );
        },
        "Monitored query",
      );

      const stats = monitor.getStatistics();
      expect(stats.totalQueries).toBe(1);

      const history = monitor.getHistory();
      expect(history[0].sql).toBe("SELECT * FROM cookies");
    });

    it("should track slow queries", async () => {
      const monitor = new QueryMonitor({
        slowQueryThreshold: 10,
      });

      // Mock slow query
      mockStmt.all.mockImplementation(() => {
        const start = Date.now();
        while (Date.now() - start < 20) {
          // Simulate slow query
        }
        return [];
      });

      const manager = getGlobalConnectionManager();
      await manager.executeQuery(
        testDbPath,
        (db) =>
          monitor.executeQuery(db, "SELECT * FROM large_table", [], testDbPath),
        "Slow query",
      );

      const stats = monitor.getStatistics();
      expect(stats.slowQueries).toBe(1);
    });
  });

  describe("Direct SQL Utilities Usage (replaced QuerySqliteThenTransform)", () => {
    it("should use connection manager and monitor directly", async () => {
      const manager = getGlobalConnectionManager();
      const monitor = getGlobalQueryMonitor();

      const result = await manager.executeQuery(
        testDbPath,
        (db) => {
          return monitor.executeQuery(
            db,
            "SELECT * FROM cookies",
            [],
            testDbPath,
          );
        },
        "SELECT * FROM cookies",
      );

      expect(result).toHaveLength(1);
      expect(mockDb.prepare).toHaveBeenCalledWith("SELECT * FROM cookies");
    });

    it("should apply transformations with new utilities", async () => {
      const manager = getGlobalConnectionManager();
      const monitor = getGlobalQueryMonitor();

      const result = await manager.executeQuery(
        testDbPath,
        (db) => {
          const rows = monitor.executeQuery(
            db,
            "SELECT * FROM cookies",
            [],
            testDbPath,
          );
          return rows.map((row: unknown) => ({
            ...(row as Record<string, unknown>),
            transformed: true,
          }));
        },
        "SELECT * FROM cookies",
      );

      expect(result[0]).toHaveProperty("transformed", true);
    });

    it("should apply filters with new utilities", async () => {
      mockStmt.all.mockReturnValue([
        { name: "keep", value: "1" },
        { name: "filter", value: "2" },
      ]);

      const manager = getGlobalConnectionManager();
      const monitor = getGlobalQueryMonitor();

      const result = await manager.executeQuery(
        testDbPath,
        (db) => {
          const rows = monitor.executeQuery(
            db,
            "SELECT * FROM cookies",
            [],
            testDbPath,
          );
          return rows.filter(
            (row: unknown) => (row as { name: string }).name === "keep",
          );
        },
        "SELECT * FROM cookies",
      );

      expect(result).toHaveLength(1);
      expect((result as unknown as Array<{ name: string }>)[0].name).toBe(
        "keep",
      );
    });
  });

  describe("Browser Strategy Integration", () => {
    it("should work with Chrome cookie queries", async () => {
      const builder = new CookieQueryBuilder("chrome");
      const manager = getGlobalConnectionManager();

      // Simulate Chrome cookie query
      const queryConfig = builder.buildSelectQuery({
        name: "%", // Wildcard
        domain: "github.com",
        browser: "chrome",
      });

      const result = await manager.executeQuery(
        testDbPath,
        (db) => {
          const stmt = db.prepare(queryConfig.sql);
          return stmt.all(...queryConfig.params);
        },
        "Chrome wildcard query",
      );

      expect(mockDb.prepare).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("should work with Firefox cookie queries", async () => {
      const builder = new CookieQueryBuilder("firefox");
      const manager = getGlobalConnectionManager();

      // Mock Firefox response
      mockStmt.all.mockReturnValue([
        {
          name: "session",
          value: "abc123",
          domain: ".mozilla.org",
          expiry: Math.floor(Date.now() / 1000) + 3600,
        },
      ]);

      const queryConfig = builder.buildSelectQuery({
        name: "session",
        domain: "mozilla.org",
        browser: "firefox",
      });

      const result = await manager.executeQuery(
        testDbPath,
        (db) => {
          const stmt = db.prepare(queryConfig.sql);
          return stmt.all(...queryConfig.params);
        },
        "Firefox query",
      );

      expect(result).toHaveLength(1);
      expect((result as unknown as Array<{ name: string }>)[0].name).toBe(
        "session",
      );
    });

    it("should handle meta version queries for Chrome", async () => {
      const builder = new CookieQueryBuilder("chrome");
      const manager = getGlobalConnectionManager();

      const metaQuery = builder.buildMetaQuery("version");

      const result = await manager.executeQuery(
        testDbPath,
        (db) => {
          const stmt = db.prepare(metaQuery.sql);
          return stmt.get(...metaQuery.params);
        },
        "Meta version query",
      );

      expect(result).toEqual({ value: "20" });
    });
  });

  describe("Performance and Monitoring", () => {
    it("should track performance across all layers", async () => {
      const manager = getGlobalConnectionManager({
        enableMonitoring: true,
      });
      const monitor = getGlobalQueryMonitor();
      const builder = new CookieQueryBuilder("chrome");

      // Execute multiple queries
      for (let i = 0; i < 5; i++) {
        const queryConfig = builder.buildSelectQuery({
          name: `cookie${i}`,
          domain: "example.com",
          browser: "chrome",
        });

        await manager.executeQuery(
          testDbPath,
          (db) =>
            monitor.executeQuery(
              db,
              queryConfig.sql,
              queryConfig.params,
              testDbPath,
            ),
          queryConfig.description,
        );
      }

      const managerStats = manager.getStatistics();
      expect(managerStats.totalQueries).toBe(5);

      const monitorStats = monitor.getStatistics();
      expect(monitorStats.totalQueries).toBe(5);
    });

    it("should handle concurrent queries", async () => {
      const manager = new DatabaseConnectionManager({
        maxConnections: 3,
      });

      try {
        const queries = Array.from({ length: 5 }, (_, i) =>
          manager.executeQuery(
            `db${i}.db`,
            (db) => {
              const stmt = db.prepare("SELECT ?");
              return stmt.get(i);
            },
            `Query ${i}`,
          ),
        );

        const results = await Promise.all(queries);
        expect(results).toHaveLength(5);
      } finally {
        // Clean up the manager to stop its timers
        manager.closeAll();
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors gracefully", async () => {
      const manager = getGlobalConnectionManager();

      mockStmt.all.mockImplementation(() => {
        throw new Error("Database error");
      });

      await expect(
        manager.executeQuery(
          testDbPath,
          (db) => {
            const stmt = db.prepare("SELECT * FROM invalid");
            return stmt.all();
          },
          "Error query",
        ),
      ).rejects.toThrow("Database error");

      const stats = manager.getStatistics();
      // Query should still be tracked even if it failed
      expect(stats.totalQueries).toBe(1);
    });

    it("should handle connection failures", async () => {
      (
        BetterSqlite3 as unknown as jest.MockedFunction<typeof BetterSqlite3>
      ).mockImplementation((() => {
        throw new Error("Cannot open database");
      }) as unknown as typeof BetterSqlite3);

      const manager = new DatabaseConnectionManager({
        retryAttempts: 1,
      });

      try {
        await expect(manager.getConnection("invalid.db")).rejects.toThrow(
          "Cannot open database",
        );
      } finally {
        // Clean up the manager to stop its timers
        manager.closeAll();
      }
    });
  });
});

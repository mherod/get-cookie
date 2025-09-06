/**
 * Tests for DatabaseConnectionManager
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
import BetterSqlite3, { type Database } from "better-sqlite3";

import {
  DatabaseConnectionManager,
  getGlobalConnectionManager,
  resetGlobalConnectionManager,
  type PoolConfig,
} from "../DatabaseConnectionManager";

// Mock better-sqlite3
jest.mock("better-sqlite3");

describe("DatabaseConnectionManager", () => {
  let manager: DatabaseConnectionManager;
  let mockDb: jest.Mocked<Database>;
  let mockStmt: {
    all: jest.Mock;
    get: jest.Mock;
    run: jest.Mock;
  };
  let tempDir: string;
  let testDbPath: string;

  beforeEach(() => {
    // Create a temporary directory for test databases
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "test-db-"));
    testDbPath = path.join(tempDir, "test.db");

    // Create a mock database
    mockStmt = {
      all: jest.fn().mockReturnValue([{ id: 1, name: "test" }]),
      get: jest.fn().mockReturnValue({ id: 1, name: "test" }),
      run: jest.fn().mockReturnValue({ changes: 1 }),
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

    // Create manager with test config
    manager = new DatabaseConnectionManager({
      maxConnections: 3,
      connectionTimeout: 1000,
      idleTimeout: 5000,
      enableMonitoring: true,
      retryAttempts: 2,
      retryDelay: 50,
    });
  });

  afterEach(() => {
    // Clean up
    manager.closeAll();
    // Reset global manager to ensure clean state between tests
    resetGlobalConnectionManager();
    jest.clearAllMocks();

    // Remove temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  afterAll(() => {
    // Final cleanup to ensure no hanging timers
    resetGlobalConnectionManager();
  });

  describe("Connection Management", () => {
    it("should create a new connection", async () => {
      const connection = await manager.getConnection(testDbPath);

      expect(connection).toBe(mockDb);
      expect(BetterSqlite3).toHaveBeenCalledWith(testDbPath, {
        readonly: true,
        fileMustExist: true,
        // No timeout set here anymore - it's applied per query
      });
    });

    it("should reuse existing connections", async () => {
      const conn1 = await manager.getConnection(testDbPath);
      manager.releaseConnection(testDbPath);
      const conn2 = await manager.getConnection(testDbPath);

      expect(conn1).toBe(conn2);
      expect(BetterSqlite3).toHaveBeenCalledTimes(1);
    });

    it("should respect max connections limit", async () => {
      // Get max connections
      const paths = ["db1.db", "db2.db", "db3.db"];
      const connections = await Promise.all(
        paths.map(async (p) => manager.getConnection(p)),
      );

      expect(connections).toHaveLength(3);
      expect(BetterSqlite3).toHaveBeenCalledTimes(3);

      // Getting another should evict LRU
      await manager.getConnection("db4.db");
      expect(BetterSqlite3).toHaveBeenCalledTimes(4);
    });

    it("should handle connection errors with retry", async () => {
      let attempt = 0;
      (
        BetterSqlite3 as unknown as jest.MockedFunction<typeof BetterSqlite3>
      ).mockImplementation((() => {
        attempt++;
        if (attempt === 1) {
          throw new Error("database is locked");
        }
        return mockDb;
      }) as unknown as typeof BetterSqlite3);

      const connection = await manager.getConnection(testDbPath);

      expect(connection).toBe(mockDb);
      expect(BetterSqlite3).toHaveBeenCalledTimes(2);
    });

    it("should fail after max retry attempts", async () => {
      (
        BetterSqlite3 as unknown as jest.MockedFunction<typeof BetterSqlite3>
      ).mockImplementation((() => {
        throw new Error("database is locked");
      }) as unknown as typeof BetterSqlite3);

      await expect(manager.getConnection(testDbPath)).rejects.toThrow(
        "database is locked",
      );

      expect(BetterSqlite3).toHaveBeenCalledTimes(2); // 2 retry attempts
    });

    it("should close connections", () => {
      manager.closeConnection(testDbPath);

      // Should not throw even if connection doesn't exist
      expect(() => manager.closeConnection("nonexistent.db")).not.toThrow();
    });

    it("should close all connections", async () => {
      await manager.getConnection("db1.db");
      await manager.getConnection("db2.db");

      manager.closeAll();

      expect(mockDb.close).toHaveBeenCalledTimes(2);
    });
  });

  describe("Query Execution", () => {
    it("should execute queries successfully", async () => {
      const result = await manager.executeQuery(
        testDbPath,
        (db) => {
          const stmt = db.prepare("SELECT * FROM test");
          return stmt.all();
        },
        "Test query",
      );

      expect(result).toEqual([{ id: 1, name: "test" }]);
      expect(mockDb.prepare).toHaveBeenCalledWith("SELECT * FROM test");
      expect(mockStmt.all).toHaveBeenCalled();
    });

    it("should handle query errors", async () => {
      mockStmt.all.mockImplementation(() => {
        throw new Error("Query failed");
      });

      await expect(
        manager.executeQuery(
          testDbPath,
          (db) => {
            const stmt = db.prepare("SELECT * FROM test");
            return stmt.all();
          },
          "Test query",
        ),
      ).rejects.toThrow("Query failed");
    });

    it("should track query metrics", async () => {
      await manager.executeQuery(
        testDbPath,
        (db) => {
          const stmt = db.prepare("SELECT * FROM test");
          return stmt.all();
        },
        "Test query",
      );

      const stats = manager.getStatistics();
      expect(stats.totalQueries).toBe(1);
      expect(stats.averageQueryTime).toBeGreaterThanOrEqual(0);
    });

    it("should release connection after query", async () => {
      await manager.executeQuery(
        testDbPath,
        (db) => {
          const stmt = db.prepare("SELECT * FROM test");
          return stmt.all();
        },
        "Test query",
      );

      // Connection should be released and reusable
      const conn = await manager.getConnection(testDbPath);
      expect(conn).toBe(mockDb);
      expect(BetterSqlite3).toHaveBeenCalledTimes(1); // Same connection reused
    });
  });

  describe("Statistics and Monitoring", () => {
    it("should track connection statistics", async () => {
      await manager.getConnection("db1.db");
      await manager.getConnection("db2.db");
      manager.releaseConnection("db1.db");

      const stats = manager.getStatistics();

      expect(stats.totalConnections).toBe(2);
      expect(stats.activeConnections).toBe(1);
      expect(stats.idleConnections).toBe(1);
    });

    it("should track query metrics", async () => {
      await manager.executeQuery(testDbPath, (_db) => [1, 2, 3], "Test query");

      const metrics = manager.getQueryMetrics(10);

      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toMatchObject({
        query: "Test query",
        rowCount: 3,
        filepath: testDbPath,
        success: true,
      });
    });

    it("should emit events", async () => {
      const connectionCreated = jest.fn();
      const queryExecuted = jest.fn();

      manager.on("connection:created", connectionCreated);
      manager.on("query:executed", queryExecuted);

      await manager.getConnection(testDbPath);
      await manager.executeQuery(testDbPath, (_db) => [], "Test query");

      expect(connectionCreated).toHaveBeenCalledWith(
        expect.objectContaining({
          filepath: testDbPath,
        }),
      );

      expect(queryExecuted).toHaveBeenCalledWith(
        expect.objectContaining({
          query: "Test query",
          success: true,
        }),
      );
    });

    it("should clear metrics", async () => {
      await manager.executeQuery(testDbPath, (_db) => [], "Test query");

      manager.clearMetrics();

      const metrics = manager.getQueryMetrics();
      expect(metrics).toHaveLength(0);
    });
  });

  describe("Connection Pooling", () => {
    it("should evict least recently used connection", async () => {
      // Fill the pool
      await manager.getConnection("db1.db");
      manager.releaseConnection("db1.db");

      await new Promise((resolve) => setTimeout(resolve, 10));

      await manager.getConnection("db2.db");
      manager.releaseConnection("db2.db");

      await new Promise((resolve) => setTimeout(resolve, 10));

      await manager.getConnection("db3.db");
      manager.releaseConnection("db3.db");

      // This should evict db1.db (LRU)
      await manager.getConnection("db4.db");

      expect(mockDb.close).toHaveBeenCalled();
    });

    it("should handle connection reuse tracking", async () => {
      await manager.getConnection(testDbPath);
      manager.releaseConnection(testDbPath);
      await manager.getConnection(testDbPath);

      const stats = manager.getStatistics();
      expect(stats.connectionReuse).toBe(1);
    });
  });

  describe("Global Manager", () => {
    beforeEach(() => {
      resetGlobalConnectionManager();
    });

    it("should create global manager singleton", () => {
      const manager1 = getGlobalConnectionManager();
      const manager2 = getGlobalConnectionManager();

      expect(manager1).toBe(manager2);
    });

    it("should accept config for global manager", () => {
      const config: PoolConfig = {
        maxConnections: 5,
        enableMonitoring: false,
      };

      const manager = getGlobalConnectionManager(config);
      expect(manager).toBeInstanceOf(DatabaseConnectionManager);
    });

    it("should reset global manager", () => {
      const manager1 = getGlobalConnectionManager();
      resetGlobalConnectionManager();
      const manager2 = getGlobalConnectionManager();

      expect(manager1).not.toBe(manager2);
    });
  });

  describe("Error Handling", () => {
    it("should handle non-lock database errors", async () => {
      (
        BetterSqlite3 as unknown as jest.MockedFunction<typeof BetterSqlite3>
      ).mockImplementation((() => {
        throw new Error("File not found");
      }) as unknown as typeof BetterSqlite3);

      await expect(manager.getConnection(testDbPath)).rejects.toThrow(
        "File not found",
      );

      expect(BetterSqlite3).toHaveBeenCalledTimes(1); // No retry for non-lock errors
    });

    it("should handle query function errors", async () => {
      await expect(
        manager.executeQuery(
          testDbPath,
          () => {
            throw new Error("Custom error");
          },
          "Test query",
        ),
      ).rejects.toThrow("Custom error");

      const metrics = manager.getQueryMetrics();
      expect(metrics[0]).toMatchObject({
        success: false,
        error: "Custom error",
      });
    });

    it("should handle database close errors gracefully", async () => {
      mockDb.close.mockImplementation(() => {
        throw new Error("Close failed");
      });

      await manager.getConnection(testDbPath);

      // Should not throw
      expect(() => manager.closeConnection(testDbPath)).not.toThrow();
    });
  });

  describe("Performance", () => {
    it("should track slow queries", async () => {
      // Mock a slow query
      const slowQuery = jest.fn().mockImplementation(() => {
        const start = Date.now();
        while (Date.now() - start < 150) {
          // Busy wait to simulate slow query
        }
        return [];
      });

      await manager.executeQuery(testDbPath, slowQuery, "Slow query");

      const stats = manager.getStatistics();
      expect(stats.averageQueryTime).toBeGreaterThan(100);
    });

    it("should limit metrics history", async () => {
      // Execute many queries
      for (let i = 0; i < 1100; i++) {
        await manager.executeQuery(testDbPath, (_db) => [], `Query ${i}`);
      }

      const metrics = manager.getQueryMetrics(2000);
      expect(metrics.length).toBeLessThanOrEqual(1000);
    });
  });
});

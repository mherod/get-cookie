/**
 * Tests for QueryMonitor
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import type { Database, Statement } from "better-sqlite3";
import {
  QueryMonitor,
  MonitoredStatement,
  getGlobalQueryMonitor,
  resetGlobalQueryMonitor,
  type MonitoringOptions,
} from "../QueryMonitor";

describe("QueryMonitor", () => {
  let monitor: QueryMonitor;
  let mockDb: jest.Mocked<Database>;
  let mockStmt: jest.Mocked<Statement>;

  beforeEach(() => {
    // Create mock statement
    mockStmt = {
      all: jest.fn().mockReturnValue([
        { id: 1, name: "test1" },
        { id: 2, name: "test2" },
      ]),
      get: jest.fn().mockReturnValue({ id: 1, name: "test1" }),
      run: jest.fn().mockReturnValue({ changes: 1, lastInsertRowid: 1 }),
      iterate: jest.fn(),
      pluck: jest.fn().mockReturnThis(),
      expand: jest.fn().mockReturnThis(),
      raw: jest.fn().mockReturnThis(),
      columns: jest.fn().mockReturnValue([]),
      safeIntegers: jest.fn().mockReturnThis(),
    } as unknown as jest.Mocked<Statement>;

    // Create mock database
    mockDb = {
      prepare: jest.fn().mockReturnValue(mockStmt),
      exec: jest.fn(),
      close: jest.fn(),
      pragma: jest.fn(),
      backup: jest.fn(),
      serialize: jest.fn(),
      function: jest.fn(),
      aggregate: jest.fn(),
      loadExtension: jest.fn(),
      table: jest.fn(),
      transaction: jest.fn(),
      readonly: true,
      name: "test.db",
      open: true,
      inTransaction: false,
      memory: false,
    } as unknown as jest.Mocked<Database>;

    // Create monitor with default options
    monitor = new QueryMonitor({
      slowQueryThreshold: 100,
      verbose: false,
      trackHistory: true,
      maxHistorySize: 10,
    });
  });

  describe("Query Execution", () => {
    it("should execute query and return results", () => {
      const result = monitor.executeQuery(
        mockDb,
        "SELECT * FROM users",
        [],
        "test.db",
      );

      expect(result).toEqual([
        { id: 1, name: "test1" },
        { id: 2, name: "test2" },
      ]);
      expect(mockDb.prepare).toHaveBeenCalledWith("SELECT * FROM users");
      expect(mockStmt.all).toHaveBeenCalled();
    });

    it("should execute query with parameters", () => {
      const params = ["value1", 123];
      monitor.executeQuery(
        mockDb,
        "SELECT * FROM users WHERE name = ? AND id = ?",
        params,
        "test.db",
      );

      expect(mockStmt.all).toHaveBeenCalledWith(...params);
    });

    it("should track query metrics", () => {
      monitor.executeQuery(mockDb, "SELECT * FROM users", [], "test.db");

      const stats = monitor.getStatistics();
      expect(stats.totalQueries).toBe(1);
      expect(stats.errors).toBe(0);
      expect(stats.historySize).toBe(1);
    });

    it("should handle query errors", () => {
      mockStmt.all.mockImplementation(() => {
        throw new Error("Query failed");
      });

      expect(() =>
        monitor.executeQuery(mockDb, "SELECT * FROM invalid", [], "test.db"),
      ).toThrow("Query failed");

      const stats = monitor.getStatistics();
      expect(stats.totalQueries).toBe(1);
      expect(stats.errors).toBe(1);
      expect(stats.errorRate).toBeCloseTo(1.0);
    });

    it("should track slow queries", () => {
      // Mock a slow query
      const originalAll = mockStmt.all;
      mockStmt.all.mockImplementation((...args) => {
        const start = Date.now();
        while (Date.now() - start < 150) {
          // Simulate slow query
        }
        return originalAll(...args);
      });

      monitor.executeQuery(mockDb, "SELECT * FROM large_table", [], "test.db");

      const stats = monitor.getStatistics();
      expect(stats.slowQueries).toBe(1);
      expect(stats.slowQueryRate).toBeCloseTo(1.0);
      expect(stats.averageDuration).toBeGreaterThan(100);
    });
  });

  describe("executeGet", () => {
    it("should execute get query", () => {
      const result = monitor.executeGet(
        mockDb,
        "SELECT * FROM users WHERE id = ?",
        [1],
        "test.db",
      );

      expect(result).toEqual({ id: 1, name: "test1" });
      expect(mockStmt.get).toHaveBeenCalledWith(1);
    });

    it("should handle no results", () => {
      mockStmt.get.mockReturnValue(undefined);

      const result = monitor.executeGet(
        mockDb,
        "SELECT * FROM users WHERE id = ?",
        [999],
        "test.db",
      );

      expect(result).toBeUndefined();

      const history = monitor.getHistory(1);
      expect(history[0].rowCount).toBe(0);
    });
  });

  describe("MonitoredStatement", () => {
    it("should create monitored statement wrapper", () => {
      const stmt = monitor.prepareStatement(
        mockDb,
        "SELECT * FROM users",
        "test.db",
      );

      expect(stmt).toBeInstanceOf(MonitoredStatement);
      expect(mockDb.prepare).toHaveBeenCalledWith("SELECT * FROM users");
    });

    it("should execute all through wrapper", () => {
      const stmt = monitor.prepareStatement(
        mockDb,
        "SELECT * FROM users",
        "test.db",
      );

      const result = stmt.all(1, "test");

      expect(result).toEqual([
        { id: 1, name: "test1" },
        { id: 2, name: "test2" },
      ]);
    });

    it("should execute get through wrapper", () => {
      const stmt = monitor.prepareStatement(
        mockDb,
        "SELECT * FROM users WHERE id = ?",
        "test.db",
      );

      const result = stmt.get(1);

      expect(result).toEqual({ id: 1, name: "test1" });
    });

    it("should provide access to underlying statement", () => {
      const stmt = monitor.prepareStatement(
        mockDb,
        "SELECT * FROM users",
        "test.db",
      );

      expect(stmt.getStatement()).toBe(mockStmt);
    });
  });

  describe("Query History", () => {
    it("should track query history", () => {
      monitor.executeQuery(mockDb, "SELECT 1", [], "test.db");
      monitor.executeQuery(mockDb, "SELECT 2", [], "test.db");

      const history = monitor.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0].sql).toBe("SELECT 1");
      expect(history[1].sql).toBe("SELECT 2");
    });

    it("should limit history size", () => {
      // Execute more queries than max history size
      for (let i = 0; i < 15; i++) {
        monitor.executeQuery(mockDb, `SELECT ${i}`, [], "test.db");
      }

      const history = monitor.getHistory();
      expect(history).toHaveLength(10); // maxHistorySize is 10
      expect(history[0].sql).toBe("SELECT 5"); // First 5 should be trimmed
    });

    it("should get limited history", () => {
      for (let i = 0; i < 5; i++) {
        monitor.executeQuery(mockDb, `SELECT ${i}`, [], "test.db");
      }

      const history = monitor.getHistory(2);
      expect(history).toHaveLength(2);
      expect(history[0].sql).toBe("SELECT 3");
      expect(history[1].sql).toBe("SELECT 4");
    });

    it("should clear history", () => {
      monitor.executeQuery(mockDb, "SELECT 1", [], "test.db");
      monitor.executeQuery(mockDb, "SELECT 2", [], "test.db");

      monitor.clearHistory();

      const history = monitor.getHistory();
      expect(history).toHaveLength(0);
    });

    it("should not track history when disabled", () => {
      const noHistoryMonitor = new QueryMonitor({
        trackHistory: false,
      });

      noHistoryMonitor.executeQuery(mockDb, "SELECT 1", [], "test.db");

      const history = noHistoryMonitor.getHistory();
      expect(history).toHaveLength(0);
    });
  });

  describe("Statistics", () => {
    it("should calculate average duration", () => {
      // Mock queries with different durations
      const durations = [50, 100, 150];
      let queryIndex = 0;

      mockStmt.all.mockImplementation(() => {
        const duration = durations[queryIndex++] || 0;
        const start = Date.now();
        while (Date.now() - start < duration) {
          // Simulate query duration
        }
        return [];
      });

      monitor.executeQuery(mockDb, "SELECT 1", [], "test.db");
      monitor.executeQuery(mockDb, "SELECT 2", [], "test.db");
      monitor.executeQuery(mockDb, "SELECT 3", [], "test.db");

      const stats = monitor.getStatistics();
      expect(stats.totalQueries).toBe(3);
      expect(stats.averageDuration).toBeGreaterThan(0);
    });

    it("should calculate error rate", () => {
      mockStmt.all
        .mockReturnValueOnce([])
        .mockImplementationOnce(() => {
          throw new Error("Error 1");
        })
        .mockReturnValueOnce([])
        .mockImplementationOnce(() => {
          throw new Error("Error 2");
        });

      monitor.executeQuery(mockDb, "SELECT 1", [], "test.db");
      expect(() =>
        monitor.executeQuery(mockDb, "SELECT 2", [], "test.db"),
      ).toThrow();
      monitor.executeQuery(mockDb, "SELECT 3", [], "test.db");
      expect(() =>
        monitor.executeQuery(mockDb, "SELECT 4", [], "test.db"),
      ).toThrow();

      const stats = monitor.getStatistics();
      expect(stats.totalQueries).toBe(4);
      expect(stats.errors).toBe(2);
      expect(stats.errorRate).toBeCloseTo(0.5);
    });

    it("should reset all statistics", () => {
      monitor.executeQuery(mockDb, "SELECT 1", [], "test.db");
      monitor.executeQuery(mockDb, "SELECT 2", [], "test.db");

      monitor.reset();

      const stats = monitor.getStatistics();
      expect(stats.totalQueries).toBe(0);
      expect(stats.errors).toBe(0);
      expect(stats.slowQueries).toBe(0);
      expect(stats.historySize).toBe(0);
    });
  });

  describe("Configuration", () => {
    it("should use custom slow query threshold", () => {
      const customMonitor = new QueryMonitor({
        slowQueryThreshold: 10,
      });

      // Mock a query that takes 20ms
      mockStmt.all.mockImplementation(() => {
        const start = Date.now();
        while (Date.now() - start < 20) {
          // Simulate query duration
        }
        return [];
      });

      customMonitor.executeQuery(mockDb, "SELECT 1", [], "test.db");

      const stats = customMonitor.getStatistics();
      expect(stats.slowQueries).toBe(1);
    });

    it("should use custom max history size", () => {
      const customMonitor = new QueryMonitor({
        maxHistorySize: 3,
      });

      for (let i = 0; i < 5; i++) {
        customMonitor.executeQuery(mockDb, `SELECT ${i}`, [], "test.db");
      }

      const history = customMonitor.getHistory();
      expect(history).toHaveLength(3);
    });
  });

  describe("Global Monitor", () => {
    beforeEach(() => {
      resetGlobalQueryMonitor();
    });

    it("should create global monitor singleton", () => {
      const monitor1 = getGlobalQueryMonitor();
      const monitor2 = getGlobalQueryMonitor();

      expect(monitor1).toBe(monitor2);
      expect(monitor1).toBeInstanceOf(QueryMonitor);
    });

    it("should accept options for global monitor", () => {
      const options: MonitoringOptions = {
        slowQueryThreshold: 50,
        verbose: true,
      };

      const globalMonitor = getGlobalQueryMonitor(options);
      expect(globalMonitor).toBeInstanceOf(QueryMonitor);
    });

    it("should reset global monitor", () => {
      const monitor1 = getGlobalQueryMonitor();
      monitor1.executeQuery(mockDb, "SELECT 1", [], "test.db");

      resetGlobalQueryMonitor();

      const monitor2 = getGlobalQueryMonitor();
      expect(monitor1).not.toBe(monitor2);

      const stats = monitor2.getStatistics();
      expect(stats.totalQueries).toBe(0);
    });
  });

  describe("Query Execution Details", () => {
    it("should record complete execution details", () => {
      const startTime = Date.now();
      monitor.executeQuery(
        mockDb,
        "SELECT * FROM users",
        ["param1"],
        "test.db",
      );

      const history = monitor.getHistory(1);
      const execution = history[0];

      expect(execution).toMatchObject({
        sql: "SELECT * FROM users",
        params: ["param1"],
        filepath: "test.db",
        rowCount: 2,
      });
      expect(execution.startTime).toBeGreaterThanOrEqual(startTime);
      expect(execution.endTime).toBeGreaterThan(execution.startTime);
      expect(execution.duration).toBeGreaterThanOrEqual(0);
    });

    it("should record error details", () => {
      const error = new Error("Test error");
      mockStmt.all.mockImplementation(() => {
        throw error;
      });

      try {
        monitor.executeQuery(mockDb, "SELECT * FROM invalid", [], "test.db");
      } catch {
        // Expected to throw
      }

      const history = monitor.getHistory(1);
      const execution = history[0];

      expect(execution.error).toBe(error);
      expect(execution.duration).toBeGreaterThanOrEqual(0);
    });
  });
});

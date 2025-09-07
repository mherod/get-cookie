/**
 * Real database benchmark tests for batchGetCookies
 * Uses actual SQLite databases to measure performance improvements
 */

import { join } from "node:path";
import { rmSync, existsSync } from "node:fs";
import type { CookieSpec } from "../../../types/schemas";
import {
  getGlobalConnectionManager,
  resetGlobalConnectionManager,
} from "../../browsers/sql/DatabaseConnectionManager";
import { CookieQueryBuilder } from "../../browsers/sql/CookieQueryBuilder";
import { createTestDatabases } from "./fixtures/createTestDatabase";
import BetterSqlite3 from "better-sqlite3";

// Performance metrics interface
interface BenchmarkResult {
  name: string;
  individualTime: number;
  batchTime: number;
  improvement: number;
  individualQueries: number;
  batchQueries: number;
}

describe("Real Database Performance Benchmarks", () => {
  let testDbPath: string;
  let chromePath: string;

  beforeAll(() => {
    // Create test databases
    const testDir = join(__dirname, "fixtures", "test-databases");

    // Clean up any existing test databases
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }

    const paths = createTestDatabases(testDir);
    chromePath = paths.chromePath;
    testDbPath = chromePath;
  });

  afterAll(() => {
    // Clean up
    resetGlobalConnectionManager();

    // Remove test databases
    const testDir = join(__dirname, "fixtures", "test-databases");
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    // Reset connection manager for each test
    resetGlobalConnectionManager();
  });

  describe("Query Performance Comparison", () => {
    it("should demonstrate performance improvement with small batches (10 specs)", async () => {
      const specs: CookieSpec[] = [
        { name: "session_id_0", domain: ".example.com" },
        { name: "auth_token_0", domain: ".example.com" },
        { name: "user_id_0", domain: ".api.example.com" },
        { name: "csrf_token_0", domain: ".auth.example.com" },
        { name: "preferences_0", domain: ".cdn.example.com" },
        { name: "analytics_id_0", domain: ".app.example.com" },
        { name: "tracking_id_0", domain: ".test.com" },
        { name: "refresh_token_0", domain: ".demo.com" },
        { name: "device_id_0", domain: ".localhost" },
        { name: "language_0", domain: ".github.com" },
      ];

      const result = await runBenchmark(
        "Small batch (10 specs)",
        specs,
        testDbPath,
      );

      console.log(`\n${result.name}:`);
      console.log(
        `  Individual queries: ${result.individualTime.toFixed(2)}ms (${result.individualQueries} queries)`,
      );
      console.log(
        `  Batch query: ${result.batchTime.toFixed(2)}ms (${result.batchQueries} queries)`,
      );
      console.log(`  Improvement: ${result.improvement.toFixed(1)}x faster`);

      // Small batches may not always show improvement due to overhead
      // We allow up to 1.5x slower for small batches
      expect(result.batchTime).toBeLessThan(result.individualTime * 1.5);
    });

    it("should demonstrate performance improvement with medium batches (50 specs)", async () => {
      const specs: CookieSpec[] = [];

      // Generate 50 specs across different domains
      for (let i = 0; i < 50; i++) {
        const domains = [
          ".example.com",
          ".api.example.com",
          ".test.com",
          ".demo.com",
          ".localhost",
        ];
        const names = [
          "session_id",
          "auth_token",
          "user_id",
          "csrf_token",
          "preferences",
        ];

        specs.push({
          name: `${names[i % names.length]}_${Math.floor(i / names.length)}`,
          domain: domains[i % domains.length] ?? ".example.com",
        });
      }

      const result = await runBenchmark(
        "Medium batch (50 specs)",
        specs,
        testDbPath,
      );

      console.log(`\n${result.name}:`);
      console.log(
        `  Individual queries: ${result.individualTime.toFixed(2)}ms (${result.individualQueries} queries)`,
      );
      console.log(
        `  Batch query: ${result.batchTime.toFixed(2)}ms (${result.batchQueries} queries)`,
      );
      console.log(`  Improvement: ${result.improvement.toFixed(1)}x faster`);

      expect(result.batchTime).toBeLessThan(result.individualTime);
      expect(result.improvement).toBeGreaterThan(1.5); // At least 1.5x faster
    });

    it("should demonstrate significant improvement with large batches (100 specs)", async () => {
      const specs: CookieSpec[] = [];

      // Generate 100 specs
      for (let i = 0; i < 100; i++) {
        const domainIndex = i % 10;
        const nameIndex = i % 15;

        specs.push({
          name: `${
            [
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
            ][nameIndex]
          }_${Math.floor(i / 15)}`,
          domain:
            [
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
            ][domainIndex] ?? ".example.com",
        });
      }

      const result = await runBenchmark(
        "Large batch (100 specs)",
        specs,
        testDbPath,
      );

      console.log(`\n${result.name}:`);
      console.log(
        `  Individual queries: ${result.individualTime.toFixed(2)}ms (${result.individualQueries} queries)`,
      );
      console.log(
        `  Batch query: ${result.batchTime.toFixed(2)}ms (${result.batchQueries} queries)`,
      );
      console.log(`  Improvement: ${result.improvement.toFixed(1)}x faster`);

      expect(result.batchTime).toBeLessThan(result.individualTime);
      expect(result.improvement).toBeGreaterThan(2); // At least 2x faster for large batches
    });
  });

  describe("Connection Pooling Impact", () => {
    it("should show connection reuse benefits", async () => {
      const connectionManager = getGlobalConnectionManager();
      const specs: CookieSpec[] = Array.from({ length: 20 }, (_, i) => ({
        name: `session_id_${i}`,
        domain: ".example.com",
      }));

      // Warm up connection pool
      await executeIndividualQueries(specs.slice(0, 5), testDbPath);

      // Get statistics after warmup
      const warmupStats = connectionManager.getStatistics();

      // Execute more queries
      await executeIndividualQueries(specs.slice(5), testDbPath);

      const finalStats = connectionManager.getStatistics();

      console.log("\nConnection pooling statistics:");
      console.log(`  Total connections: ${finalStats.totalConnections}`);
      console.log(`  Connection reuses: ${finalStats.connectionReuse}`);
      console.log(
        `  Cache hit rate: ${(finalStats.cacheHitRate * 100).toFixed(1)}%`,
      );
      console.log(
        `  Average query time: ${finalStats.averageQueryTime.toFixed(2)}ms`,
      );

      // Connection should be reused
      expect(finalStats.connectionReuse).toBeGreaterThan(
        warmupStats.connectionReuse,
      );
      expect(finalStats.totalConnections).toBeLessThanOrEqual(5); // Should reuse connections
    });
  });

  describe("Query Complexity Analysis", () => {
    it("should compare single vs combined WHERE clauses", async () => {
      const db = new BetterSqlite3(testDbPath, { readonly: true });
      const queryBuilder = new CookieQueryBuilder("chrome");

      try {
        // Single spec query
        const singleSpec = {
          name: "session_id_0",
          domain: ".example.com",
          browser: "chrome" as const,
        };
        const singleQuery = queryBuilder.buildSelectQuery(singleSpec);

        // Batch query with 10 specs
        const batchSpecs = Array.from({ length: 10 }, (_, i) => ({
          name: `session_id_${i}`,
          domain: ".example.com",
          browser: "chrome" as const,
        }));
        const batchQuery = queryBuilder.buildBatchSelectQuery(batchSpecs);

        // Execute and time single queries
        const singleStart = performance.now();
        for (let i = 0; i < 10; i++) {
          const stmt = db.prepare(singleQuery.sql);
          stmt.all(...singleQuery.params);
        }
        const singleTime = performance.now() - singleStart;

        // Execute and time batch query
        const batchStart = performance.now();
        const batchStmt = db.prepare(batchQuery.sql);
        batchStmt.all(...batchQuery.params);
        const batchTime = performance.now() - batchStart;

        console.log("\nQuery complexity comparison:");
        console.log(`  10 individual queries: ${singleTime.toFixed(2)}ms`);
        console.log(`  1 batch query: ${batchTime.toFixed(2)}ms`);
        console.log(
          `  Improvement: ${(singleTime / batchTime).toFixed(1)}x faster`,
        );

        expect(batchTime).toBeLessThan(singleTime);
      } finally {
        db.close();
      }
    });
  });
});

/**
 * Helper function to run a benchmark comparison
 */
async function runBenchmark(
  name: string,
  specs: CookieSpec[],
  testDbPath: string,
): Promise<BenchmarkResult> {
  // Reset connection manager for fair comparison
  resetGlobalConnectionManager();

  // Measure individual queries
  const individualStart = performance.now();
  await executeIndividualQueries(specs, testDbPath);
  const individualTime = performance.now() - individualStart;

  // Reset connection manager
  resetGlobalConnectionManager();

  // Measure batch query
  const batchStart = performance.now();
  await executeBatchQuery(specs, testDbPath);
  const batchTime = performance.now() - batchStart;

  return {
    name,
    individualTime,
    batchTime,
    improvement: individualTime / batchTime,
    individualQueries: specs.length,
    batchQueries: 1,
  };
}

/**
 * Execute individual queries for each spec
 */
async function executeIndividualQueries(
  specs: CookieSpec[],
  testDbPath: string,
) {
  const connectionManager = getGlobalConnectionManager();
  const queryBuilder = new CookieQueryBuilder("chrome");
  const results = [];

  for (const spec of specs) {
    const query = queryBuilder.buildSelectQuery({
      name: spec.name,
      domain: spec.domain,
      browser: "chrome",
    });

    const cookies = await connectionManager.executeQuery(
      testDbPath,
      (db) => {
        const stmt = db.prepare(query.sql);
        return stmt.all(...query.params);
      },
      `Query for ${spec.name}`,
    );

    results.push(...cookies);
  }

  return results;
}

/**
 * Execute a single batch query for all specs
 */
async function executeBatchQuery(specs: CookieSpec[], testDbPath: string) {
  const connectionManager = getGlobalConnectionManager();
  const queryBuilder = new CookieQueryBuilder("chrome");

  const batchQuery = queryBuilder.buildBatchSelectQuery(
    specs.map((spec) => ({
      name: spec.name,
      domain: spec.domain,
      browser: "chrome" as const,
    })),
  );

  return connectionManager.executeQuery(
    testDbPath,
    (db) => {
      const stmt = db.prepare(batchQuery.sql);
      return stmt.all(...batchQuery.params);
    },
    `Batch query for ${specs.length} specs`,
  );
}

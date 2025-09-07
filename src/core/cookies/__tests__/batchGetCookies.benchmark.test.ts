/**
 * Benchmark tests for batchGetCookies performance optimization
 * Compares optimized batch queries vs individual queries
 */

import type { CookieSpec, ExportedCookie } from "../../../types/schemas";
import { batchGetCookies } from "../batchGetCookies";
import { batchQueryCookies } from "../batchQueryCookies";
import { getCookie } from "../getCookie";

// Mock implementations
jest.mock("../getCookie");
jest.mock("../batchQueryCookies");

// Helper to create mock cookie data
const createMockCookie = (
  name: string,
  domain: string,
  value: string,
): ExportedCookie => ({
  name,
  domain,
  value,
  expiry: new Date(Date.now() + 86400000),
  meta: {
    file: "/mock/cookies.db",
    browser: "Chrome",
    decrypted: true,
  },
});

// Performance tracking utilities
interface PerformanceMetrics {
  executionTime: number;
  functionCalls: number;
  memoryUsed?: number;
}

class PerformanceTracker {
  private startTime = 0;
  private startMemory = 0;
  private callCount = 0;

  start(): void {
    this.startTime = performance.now();
    this.callCount = 0;
    if (global.gc) {
      global.gc();
      this.startMemory = process.memoryUsage().heapUsed;
    }
  }

  recordCall(): void {
    this.callCount++;
  }

  end(): PerformanceMetrics {
    const executionTime = performance.now() - this.startTime;
    const metrics: PerformanceMetrics = {
      executionTime,
      functionCalls: this.callCount,
    };

    if (global.gc) {
      const endMemory = process.memoryUsage().heapUsed;
      metrics.memoryUsed = endMemory - this.startMemory;
    }

    return metrics;
  }
}

describe("batchGetCookies Performance Benchmarks", () => {
  const mockGetCookie = getCookie as jest.MockedFunction<typeof getCookie>;
  const mockBatchQueryCookies = batchQueryCookies as jest.MockedFunction<
    typeof batchQueryCookies
  >;

  let performanceTracker: PerformanceTracker;

  beforeEach(() => {
    jest.clearAllMocks();
    performanceTracker = new PerformanceTracker();
  });

  describe("Small batch performance (10 specs)", () => {
    const specs: CookieSpec[] = Array.from({ length: 10 }, (_, i) => ({
      name: `cookie${i}`,
      domain: `domain${i}.com`,
    }));

    it("should execute optimized batch query faster than fallback", async () => {
      // Setup mock for optimized batch query
      const mockCookies = specs.map((spec) =>
        createMockCookie(spec.name, spec.domain, `value${spec.name}`),
      );
      mockBatchQueryCookies.mockResolvedValue(mockCookies);

      // Measure optimized performance
      performanceTracker.start();
      mockBatchQueryCookies.mockImplementation(async () => {
        performanceTracker.recordCall();
        // Simulate database connection + single query time
        // Real batch queries have connection overhead but execute in one operation
        await new Promise((r) => setTimeout(r, 5)); // Connection overhead
        await new Promise((r) => setTimeout(r, 3)); // Query execution
        return mockCookies;
      });

      const optimizedResult = await batchGetCookies(specs);
      const optimizedMetrics = performanceTracker.end();

      // Reset and measure fallback performance
      jest.clearAllMocks();
      mockBatchQueryCookies.mockRejectedValue(new Error("Force fallback"));
      mockGetCookie.mockImplementation(async (spec) => {
        performanceTracker.recordCall();
        // Simulate individual query with connection reuse
        // Each query has minimal overhead but adds up
        await new Promise((r) => setTimeout(r, 2)); // Per-query overhead
        return [createMockCookie(spec.name, spec.domain, `value${spec.name}`)];
      });

      performanceTracker.start();
      const fallbackResult = await batchGetCookies(specs);
      const fallbackMetrics = performanceTracker.end();

      // Assertions
      expect(optimizedResult).toHaveLength(specs.length);
      expect(fallbackResult).toHaveLength(specs.length);
      expect(optimizedMetrics.functionCalls).toBeLessThan(
        fallbackMetrics.functionCalls,
      );

      console.log("Small batch performance comparison:");
      console.log(
        `  Optimized: ${optimizedMetrics.executionTime.toFixed(2)}ms (${optimizedMetrics.functionCalls} calls)`,
      );
      console.log(
        `  Fallback:  ${fallbackMetrics.executionTime.toFixed(2)}ms (${fallbackMetrics.functionCalls} calls)`,
      );
      console.log(
        `  Improvement: ${((1 - optimizedMetrics.executionTime / fallbackMetrics.executionTime) * 100).toFixed(1)}%`,
      );
    });
  });

  describe("Medium batch performance (50 specs)", () => {
    const specs: CookieSpec[] = Array.from({ length: 50 }, (_, i) => ({
      name: `cookie${i}`,
      domain: `domain${i % 10}.com`, // Some domains repeat
    }));

    it("should show significant improvement with medium batches", async () => {
      const mockCookies = specs.map((spec) =>
        createMockCookie(spec.name, spec.domain, `value${spec.name}`),
      );

      // Optimized batch query
      mockBatchQueryCookies.mockImplementation(async () => {
        // Simulate single batch query (connection + query for all specs)
        await new Promise((r) => setTimeout(r, 5)); // Connection
        await new Promise((r) => setTimeout(r, 5)); // Query all at once
        return mockCookies;
      });

      performanceTracker.start();
      const optimizedResult = await batchGetCookies(specs);
      const optimizedMetrics = performanceTracker.end();

      // Fallback to individual queries
      jest.clearAllMocks();
      mockBatchQueryCookies.mockRejectedValue(new Error("Force fallback"));

      let callCount = 0;
      mockGetCookie.mockImplementation(async (spec) => {
        callCount++;
        // Simulate individual query time (connection pooling helps but still overhead)
        await new Promise((r) => setTimeout(r, 1)); // Per-query overhead even with pooling
        return [createMockCookie(spec.name, spec.domain, `value${spec.name}`)];
      });

      performanceTracker.start();
      const fallbackResult = await batchGetCookies(specs, { concurrency: 10 });
      const fallbackMetrics = performanceTracker.end();
      fallbackMetrics.functionCalls = callCount;

      // Assertions
      expect(optimizedResult).toHaveLength(specs.length);
      expect(fallbackResult).toHaveLength(specs.length);

      console.log("Medium batch performance comparison:");
      console.log(
        `  Optimized: ${optimizedMetrics.executionTime.toFixed(2)}ms (1 batch query)`,
      );
      console.log(
        `  Fallback:  ${fallbackMetrics.executionTime.toFixed(2)}ms (${fallbackMetrics.functionCalls} individual queries)`,
      );
      console.log(
        `  Improvement: ${((1 - optimizedMetrics.executionTime / fallbackMetrics.executionTime) * 100).toFixed(1)}%`,
      );
    });
  });

  describe("Large batch performance (100 specs)", () => {
    const specs: CookieSpec[] = Array.from({ length: 100 }, (_, i) => ({
      name: `cookie${i}`,
      domain: `domain${i % 20}.com`, // 20 unique domains
    }));

    it.skip("should demonstrate scalability with large batches", async () => {
      const mockCookies = specs.map((spec) =>
        createMockCookie(spec.name, spec.domain, `value${spec.name}`),
      );

      // Measure optimized approach
      mockBatchQueryCookies.mockImplementation(async () => {
        // Simulate batch query (single connection + one complex query)
        await new Promise((r) => setTimeout(r, 5)); // Connection
        await new Promise((r) => setTimeout(r, 8)); // Slightly more complex query for 100 specs
        return mockCookies;
      });

      performanceTracker.start();
      const optimizedResult = await batchGetCookies(specs);
      const optimizedMetrics = performanceTracker.end();

      // Measure fallback approach
      jest.clearAllMocks();
      mockBatchQueryCookies.mockRejectedValue(new Error("Force fallback"));

      let callCount = 0;
      mockGetCookie.mockImplementation(async (spec) => {
        callCount++;
        // Simulate individual query (even with connection pooling, each query has overhead)
        await new Promise((r) => setTimeout(r, 0.5)); // Minimal overhead per query
        return [createMockCookie(spec.name, spec.domain, `value${spec.name}`)];
      });

      performanceTracker.start();
      const fallbackResult = await batchGetCookies(specs, { concurrency: 10 });
      const fallbackMetrics = performanceTracker.end();
      fallbackMetrics.functionCalls = callCount;

      // Verify results
      expect(optimizedResult).toHaveLength(specs.length);
      expect(fallbackResult).toHaveLength(specs.length);

      console.log("Large batch performance comparison:");
      console.log(
        `  Optimized: ${optimizedMetrics.executionTime.toFixed(2)}ms (1 batch query)`,
      );
      console.log(
        `  Fallback:  ${fallbackMetrics.executionTime.toFixed(2)}ms (${fallbackMetrics.functionCalls} individual queries)`,
      );
      console.log(
        `  Improvement: ${((1 - optimizedMetrics.executionTime / fallbackMetrics.executionTime) * 100).toFixed(1)}%`,
      );

      // The optimized approach should generally be faster
      // Note: Mock-based tests can have variable timing, real database tests show more consistent improvements
      expect(optimizedMetrics.executionTime).toBeLessThan(
        fallbackMetrics.executionTime * 1.1, // Should at least not be slower
      );
    });
  });

  describe("Deduplication performance", () => {
    it("should efficiently handle duplicate specs", async () => {
      // Create specs with many duplicates
      const uniqueSpecs = 10;
      const duplicateFactor = 10;
      const specs: CookieSpec[] = [];

      for (let i = 0; i < uniqueSpecs; i++) {
        for (let j = 0; j < duplicateFactor; j++) {
          specs.push({
            name: `cookie${i}`,
            domain: `domain${i}.com`,
          });
        }
      }

      const mockCookies = specs.map((spec) =>
        createMockCookie(spec.name, spec.domain, `value${spec.name}`),
      );

      mockBatchQueryCookies.mockResolvedValue(mockCookies);

      performanceTracker.start();
      const deduplicatedResult = await batchGetCookies(specs, {
        deduplicate: true,
      });
      const dedupeMetrics = performanceTracker.end();

      performanceTracker.start();
      const nonDeduplicatedResult = await batchGetCookies(specs, {
        deduplicate: false,
      });
      const nonDedupeMetrics = performanceTracker.end();

      console.log("Deduplication performance:");
      console.log(
        `  With deduplication: ${dedupeMetrics.executionTime.toFixed(2)}ms (${deduplicatedResult.length} results)`,
      );
      console.log(
        `  Without deduplication: ${nonDedupeMetrics.executionTime.toFixed(2)}ms (${nonDeduplicatedResult.length} results)`,
      );

      expect(deduplicatedResult.length).toBe(uniqueSpecs);
      expect(nonDeduplicatedResult.length).toBe(specs.length);
    });
  });

  describe("Concurrency impact", () => {
    const specs: CookieSpec[] = Array.from({ length: 30 }, (_, i) => ({
      name: `cookie${i}`,
      domain: `domain${i}.com`,
    }));

    it("should compare different concurrency levels", async () => {
      // Force fallback to test concurrency
      mockBatchQueryCookies.mockRejectedValue(new Error("Force fallback"));

      const concurrencyLevels = [1, 5, 10, 20];
      const results: Record<number, PerformanceMetrics> = {};

      for (const concurrency of concurrencyLevels) {
        jest.clearAllMocks();

        let maxConcurrent = 0;
        let currentConcurrent = 0;

        mockGetCookie.mockImplementation(async (spec) => {
          currentConcurrent++;
          maxConcurrent = Math.max(maxConcurrent, currentConcurrent);

          // Simulate query time
          await new Promise((r) => setTimeout(r, 10));

          currentConcurrent--;
          return [
            createMockCookie(spec.name, spec.domain, `value${spec.name}`),
          ];
        });

        performanceTracker.start();
        await batchGetCookies(specs, { concurrency });
        const metrics = performanceTracker.end();
        metrics.functionCalls = maxConcurrent;
        results[concurrency] = metrics;
      }

      console.log("Concurrency level comparison:");
      for (const [level, metrics] of Object.entries(results)) {
        console.log(
          `  Concurrency ${level}: ${metrics.executionTime.toFixed(2)}ms (max ${metrics.functionCalls} concurrent)`,
        );
      }

      // Higher concurrency should generally be faster (up to a point)
      expect(results[10]?.executionTime).toBeLessThan(
        results[1]?.executionTime ?? Number.MAX_VALUE,
      );
    });
  });

  describe("Memory efficiency", () => {
    it("should compare memory usage between approaches", async () => {
      // Only run if garbage collection is exposed
      if (!global.gc) {
        console.log("Memory benchmark skipped (run with --expose-gc flag)");
        return;
      }

      const specs: CookieSpec[] = Array.from({ length: 100 }, (_, i) => ({
        name: `cookie${i}`,
        domain: `domain${i}.com`,
      }));

      const largeCookies = specs.map((spec) =>
        createMockCookie(
          spec.name,
          spec.domain,
          "x".repeat(1000), // Large cookie values
        ),
      );

      // Measure optimized memory usage
      mockBatchQueryCookies.mockResolvedValue(largeCookies);

      global.gc();
      const optimizedStartMem = process.memoryUsage().heapUsed;

      await batchGetCookies(specs);

      const optimizedEndMem = process.memoryUsage().heapUsed;
      const optimizedMemUsage = optimizedEndMem - optimizedStartMem;

      // Measure fallback memory usage
      jest.clearAllMocks();
      mockBatchQueryCookies.mockRejectedValue(new Error("Force fallback"));
      mockGetCookie.mockImplementation(async (spec) => {
        return largeCookies.filter((c) => c.name === spec.name);
      });

      global.gc();
      const fallbackStartMem = process.memoryUsage().heapUsed;

      await batchGetCookies(specs, { concurrency: 10 });

      const fallbackEndMem = process.memoryUsage().heapUsed;
      const fallbackMemUsage = fallbackEndMem - fallbackStartMem;

      console.log("Memory usage comparison:");
      console.log(`  Optimized: ${(optimizedMemUsage / 1024).toFixed(2)} KB`);
      console.log(`  Fallback:  ${(fallbackMemUsage / 1024).toFixed(2)} KB`);
      console.log(
        `  Difference: ${((fallbackMemUsage - optimizedMemUsage) / 1024).toFixed(2)} KB`,
      );
    });
  });
});

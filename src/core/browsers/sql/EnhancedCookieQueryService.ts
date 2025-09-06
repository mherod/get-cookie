/**
 * Enhanced cookie query service with improved DRY principles, security, and performance
 * Combines query building, connection management, and validation in a unified interface
 */

import type { Database } from "better-sqlite3";
import { createTaggedLogger, logError } from "@utils/logHelpers";
import type { ExportedCookie } from "../../../types/schemas";
import { chromeTimestampToDate } from "../../../utils/chromeDates";
import {
  CookieQueryBuilder,
  type CookieQueryOptions,
  type SqlBrowserType,
  CookieQueryBuilder as QueryValidator,
} from "./CookieQueryBuilder";
import {
  type DatabaseConnectionManager,
  getGlobalConnectionManager,
  type QueryMetrics,
} from "./DatabaseConnectionManager";

const logger = createTaggedLogger("EnhancedCookieQueryService");

/**
 * Enhanced query options with additional features
 */
export interface EnhancedQueryOptions extends CookieQueryOptions {
  /** Custom file path to query */
  filepath?: string;
  /** Enable query caching */
  enableCache?: boolean;
  /** Cache TTL in milliseconds */
  cacheTTL?: number;
  /** Force fresh query (bypass cache) */
  force?: boolean;
  /** Include performance metrics in response */
  includeMetrics?: boolean;
}

/**
 * Query result with optional metrics
 */
export interface QueryResult<T> {
  data: T[];
  metrics?: QueryMetrics;
  cached?: boolean;
}

/**
 * Cookie transformation options
 */
interface TransformOptions {
  browser: SqlBrowserType;
  filepath: string;
  decrypted?: boolean;
}

/**
 * Query cache entry
 */
interface CacheEntry<T> {
  data: T[];
  timestamp: number;
  key: string;
}

/**
 * Enhanced cookie query service
 */
export class EnhancedCookieQueryService {
  private readonly connectionManager: DatabaseConnectionManager;
  private readonly queryCache: Map<string, CacheEntry<unknown>>;
  private readonly queryBuilder: Map<SqlBrowserType, CookieQueryBuilder>;
  private readonly defaultCacheTTL = 5000; // 5 seconds

  constructor(connectionManager?: DatabaseConnectionManager) {
    this.connectionManager =
      connectionManager ||
      getGlobalConnectionManager({
        maxConnections: 10,
        idleTimeout: 60000,
        enableMonitoring: true,
        retryAttempts: 3,
      });

    this.queryCache = new Map();
    this.queryBuilder = new Map();

    // Start cache cleanup
    this.startCacheCleanup();
  }

  /**
   * Query cookies with enhanced features
   */
  async queryCookies(
    options: EnhancedQueryOptions,
  ): Promise<QueryResult<ExportedCookie>> {
    const startTime = Date.now();

    try {
      // Validate input
      this.validateOptions(options);

      // Check cache if enabled
      if (options.enableCache && !options.force) {
        const cached = this.getCachedResult<ExportedCookie>(options);
        if (cached) {
          logger.debug("Cache hit", {
            browser: options.browser,
            name: options.name,
            domain: options.domain,
          });

          return {
            data: cached,
            cached: true,
            metrics: options.includeMetrics
              ? {
                  query: this.getCacheKey(options),
                  duration: Date.now() - startTime,
                  rowCount: cached.length,
                  filepath: options.filepath || "cache",
                  timestamp: Date.now(),
                  success: true,
                }
              : undefined,
          };
        }
      }

      // Get or create query builder
      const builder = this.getQueryBuilder(options.browser);

      // Build SQL query
      const queryConfig = builder.buildSelectQuery(options);

      // Get filepath(s) to query
      const filepaths = await this.getFilepaths(options);

      if (filepaths.length === 0) {
        logger.warn("No cookie files found", { browser: options.browser });
        return { data: [], cached: false };
      }

      // Execute queries
      const results: ExportedCookie[] = [];
      const metrics: QueryMetrics[] = [];

      for (const filepath of filepaths) {
        const fileResults = await this.queryFile(
          filepath,
          queryConfig,
          options,
          builder,
        );

        results.push(...fileResults.data);

        if (fileResults.metrics) {
          metrics.push(fileResults.metrics);
        }
      }

      // Cache results if enabled
      if (options.enableCache) {
        this.cacheResult(options, results);
      }

      // Aggregate metrics
      const totalDuration = Date.now() - startTime;
      const aggregatedMetrics = options.includeMetrics
        ? {
            query: queryConfig.description || queryConfig.sql,
            duration: totalDuration,
            rowCount: results.length,
            filepath: filepaths.join(", "),
            timestamp: Date.now(),
            success: true,
          }
        : undefined;

      logger.info("Query completed", {
        browser: options.browser,
        filesQueried: filepaths.length,
        resultsFound: results.length,
        duration: totalDuration,
      });

      return {
        data: results,
        metrics: aggregatedMetrics,
        cached: false,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      logError("Cookie query failed", error, {
        browser: options.browser,
        name: options.name,
        domain: options.domain,
        duration,
      });

      if (options.includeMetrics) {
        return {
          data: [],
          metrics: {
            query: "Failed query",
            duration,
            rowCount: 0,
            filepath: options.filepath || "unknown",
            timestamp: Date.now(),
            success: false,
            error: (error as Error).message,
          },
          cached: false,
        };
      }

      throw error;
    }
  }

  /**
   * Query a single file
   */
  private async queryFile(
    filepath: string,
    queryConfig: { sql: string; params: unknown[] },
    options: EnhancedQueryOptions,
    _builder: CookieQueryBuilder,
  ): Promise<QueryResult<ExportedCookie>> {
    return this.connectionManager.executeQuery(
      filepath,
      (db: Database) => {
        const stmt = db.prepare(queryConfig.sql);
        const rows = stmt.all(...queryConfig.params) as Array<{
          name: string;
          domain: string;
          value: string | Buffer;
          encrypted_value?: Buffer;
          expiry: number;
          path?: string;
          is_secure?: number;
          is_httponly?: number;
        }>;

        // Transform rows to ExportedCookie format
        const cookies = rows.map((row) =>
          this.transformRow(row, {
            browser: options.browser,
            filepath,
            decrypted: false,
          }),
        );

        return {
          data: cookies,
        };
      },
      queryConfig.sql,
    );
  }

  /**
   * Transform database row to ExportedCookie
   */
  private transformRow(
    row: {
      name: string;
      domain: string;
      value: string | Buffer;
      encrypted_value?: Buffer;
      expiry: number;
      path?: string;
      is_secure?: number;
      is_httponly?: number;
    },
    options: TransformOptions,
  ): ExportedCookie {
    const { browser, filepath, decrypted } = options;

    // Handle browser-specific transformations
    let expiry: Date | "Infinity";

    if (browser === "firefox") {
      // Firefox uses Unix timestamp in seconds
      expiry = row.expiry > 0 ? new Date(row.expiry * 1000) : "Infinity";
    } else {
      // Chrome uses microseconds since 1601
      const chromeExpiry = chromeTimestampToDate(row.expiry);
      expiry = chromeExpiry !== undefined ? chromeExpiry : "Infinity";
    }

    return {
      name: row.name,
      value: row.value || row.encrypted_value?.toString("utf-8") || "",
      domain: row.domain,
      expiry,
      meta: {
        file: filepath,
        browser,
        decrypted: decrypted || false,
        path: row.path,
        secure: Boolean(row.is_secure),
        httpOnly: Boolean(row.is_httponly),
      },
    };
  }

  /**
   * Get filepaths to query based on browser
   */
  private async getFilepaths(options: EnhancedQueryOptions): Promise<string[]> {
    if (options.filepath) {
      return [options.filepath];
    }

    // Import browser-specific file discovery logic
    // This would be refactored from existing code
    return this.discoverBrowserFiles(options.browser);
  }

  /**
   * Discover browser-specific cookie files
   */
  private async discoverBrowserFiles(
    browser: SqlBrowserType,
  ): Promise<string[]> {
    // This would be refactored from existing browser strategies
    // For now, returning empty array as placeholder
    logger.debug("Discovering files for browser", { browser });

    // TODO: Integrate with existing file discovery logic
    return [];
  }

  /**
   * Validate query options
   */
  private validateOptions(options: EnhancedQueryOptions): void {
    // Use the static validator from CookieQueryBuilder
    QueryValidator.validateQueryParams(options);

    // Additional validation
    if (options.cacheTTL !== undefined) {
      if (options.cacheTTL <= 0 || options.cacheTTL > 3600000) {
        throw new Error("Cache TTL must be between 1ms and 1 hour");
      }
    }
  }

  /**
   * Get or create query builder for browser
   */
  private getQueryBuilder(browser: SqlBrowserType): CookieQueryBuilder {
    let builder = this.queryBuilder.get(browser);

    if (!builder) {
      builder = new CookieQueryBuilder(browser);
      this.queryBuilder.set(browser, builder);
    }

    return builder;
  }

  /**
   * Generate cache key for query
   */
  private getCacheKey(options: EnhancedQueryOptions): string {
    return `${options.browser}:${options.name}:${options.domain}:${options.exactDomain}:${options.includeExpired}`;
  }

  /**
   * Get cached result if available
   */
  private getCachedResult<T>(options: EnhancedQueryOptions): T[] | null {
    const key = this.getCacheKey(options);
    const entry = this.queryCache.get(key);

    if (!entry) {
      return null;
    }

    const ttl = options.cacheTTL || this.defaultCacheTTL;
    const age = Date.now() - entry.timestamp;

    if (age > ttl) {
      this.queryCache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Cache query result
   */
  private cacheResult<T>(options: EnhancedQueryOptions, data: T[]): void {
    const key = this.getCacheKey(options);

    this.queryCache.set(key, {
      data,
      timestamp: Date.now(),
      key,
    });
  }

  /**
   * Start cache cleanup timer
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const maxAge = 60000; // 1 minute

      for (const [key, entry] of this.queryCache) {
        if (now - entry.timestamp > maxAge) {
          this.queryCache.delete(key);
        }
      }
    }, 30000); // Clean every 30 seconds
  }

  /**
   * Get query statistics
   */
  getStatistics() {
    return {
      cacheSize: this.queryCache.size,
      ...this.connectionManager.getStatistics(),
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.queryCache.clear();
    logger.debug("Cache cleared");
  }

  /**
   * Shutdown service
   */
  shutdown(): void {
    this.clearCache();
    this.connectionManager.closeAll();
    logger.info("Service shutdown complete");
  }
}

/**
 * Create a preconfigured query service
 */
export function createCookieQueryService(config?: {
  enableCache?: boolean;
  cacheTTL?: number;
  maxConnections?: number;
}): EnhancedCookieQueryService {
  const connectionManager = getGlobalConnectionManager({
    maxConnections: config?.maxConnections || 10,
    enableMonitoring: true,
    retryAttempts: 3,
    idleTimeout: 60000,
  });

  return new EnhancedCookieQueryService(connectionManager);
}

/**
 * Batch query cookies from multiple browsers
 */
export async function batchQueryCookies(
  browsers: SqlBrowserType[],
  name: string,
  domain: string,
  options?: Partial<EnhancedQueryOptions>,
): Promise<Map<SqlBrowserType, ExportedCookie[]>> {
  const service = createCookieQueryService();
  const results = new Map<SqlBrowserType, ExportedCookie[]>();

  try {
    // Execute queries in parallel
    const promises = browsers.map(async (browser) => {
      try {
        const result = await service.queryCookies({
          browser,
          name,
          domain,
          ...options,
        });

        return { browser, cookies: result.data };
      } catch (error) {
        logger.warn(`Failed to query ${browser}`, { error });
        return { browser, cookies: [] };
      }
    });

    const allResults = await Promise.all(promises);

    for (const { browser, cookies } of allResults) {
      results.set(browser, cookies);
    }

    return results;
  } finally {
    service.shutdown();
  }
}

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
  private lastCacheCleanup: number;

  /**
   *
   * @param connectionManager
   */
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
    this.lastCacheCleanup = Date.now();
  }

  /**
   * Query cookies with enhanced features
   * @param options
   */
  async queryCookies(
    options: EnhancedQueryOptions,
  ): Promise<QueryResult<ExportedCookie>> {
    const startTime = Date.now();

    try {
      this.validateOptions(options);

      // Check cache if enabled
      const cachedResult = this.tryGetCachedResult(options, startTime);
      if (cachedResult) {
        return cachedResult;
      }

      // Build query and get filepaths
      const builder = this.getQueryBuilder(options.browser);
      const queryConfig = builder.buildSelectQuery(options);
      const filepaths = await this.getFilepaths(options);

      if (filepaths.length === 0) {
        logger.warn("No cookie files found", { browser: options.browser });
        return { data: [], cached: false };
      }

      // Execute queries across all files
      const results = await this.executeQueriesAcrossFiles(
        filepaths,
        queryConfig,
        options,
        builder,
      );

      // Cache results if enabled
      if (options.enableCache) {
        this.cacheResult(options, results);
      }

      // Build and return result
      const totalDuration = Date.now() - startTime;
      return this.buildQueryResult(
        results,
        queryConfig,
        filepaths,
        totalDuration,
        options,
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      return this.handleQueryError(error, options, duration);
    }
  }

  /**
   * Try to get cached result if available
   * @param options - Query options
   * @param startTime - Query start time for metrics
   * @returns Cached result or null if not cached
   */
  private tryGetCachedResult(
    options: EnhancedQueryOptions,
    startTime: number,
  ): QueryResult<ExportedCookie> | null {
    if (!options.enableCache || options.force) {
      return null;
    }

    const cached = this.getCachedResult<ExportedCookie>(options);
    if (!cached) {
      return null;
    }

    logger.debug("Cache hit", {
      browser: options.browser,
      name: options.name,
      domain: options.domain,
    });

    const result: QueryResult<ExportedCookie> = {
      data: cached,
      cached: true,
    };

    if (options.includeMetrics) {
      result.metrics = {
        query: this.getCacheKey(options),
        duration: Date.now() - startTime,
        rowCount: cached.length,
        filepath: options.filepath ?? "cache",
        timestamp: Date.now(),
        success: true,
      };
    }

    return result;
  }

  /**
   * Execute queries across multiple files
   * @param filepaths - Array of file paths to query
   * @param queryConfig - Query configuration
   * @param queryConfig.sql
   * @param queryConfig.params
   * @param options - Query options
   * @param builder - Query builder instance
   * @returns Array of exported cookies from all files
   */
  private async executeQueriesAcrossFiles(
    filepaths: string[],
    queryConfig: { sql: string; params: unknown[] },
    options: EnhancedQueryOptions,
    builder: CookieQueryBuilder,
  ): Promise<ExportedCookie[]> {
    const results: ExportedCookie[] = [];

    for (const filepath of filepaths) {
      const fileResults = await this.queryFile(
        filepath,
        queryConfig,
        options,
        builder,
      );
      results.push(...fileResults.data);
    }

    return results;
  }

  /**
   * Build query result with optional metrics
   * @param results - Query results
   * @param queryConfig - Query configuration
   * @param queryConfig.sql
   * @param queryConfig.description
   * @param filepaths - Array of file paths queried
   * @param duration - Query duration in milliseconds
   * @param options - Query options
   * @returns Query result with data and optional metrics
   */
  private buildQueryResult(
    results: ExportedCookie[],
    queryConfig: { sql: string; description?: string },
    filepaths: string[],
    duration: number,
    options: EnhancedQueryOptions,
  ): QueryResult<ExportedCookie> {
    logger.info("Query completed", {
      browser: options.browser,
      filesQueried: filepaths.length,
      resultsFound: results.length,
      duration,
    });

    const result: QueryResult<ExportedCookie> = {
      data: results,
      cached: false,
    };

    if (options.includeMetrics) {
      result.metrics = {
        query: queryConfig.description ?? queryConfig.sql,
        duration,
        rowCount: results.length,
        filepath: filepaths.join(", "),
        timestamp: Date.now(),
        success: true,
      };
    }

    return result;
  }

  /**
   * Handle query error and return error result or rethrow
   * @param error - The error that occurred
   * @param options - Query options
   * @param duration - Query duration before error
   * @returns Error result if metrics enabled, otherwise rethrows
   */
  private handleQueryError(
    error: unknown,
    options: EnhancedQueryOptions,
    duration: number,
  ): QueryResult<ExportedCookie> {
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
          filepath: options.filepath ?? "unknown",
          timestamp: Date.now(),
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
        cached: false,
      };
    }

    throw error;
  }

  /**
   * Query a single file
   * @param filepath
   * @param queryConfig
   * @param queryConfig.sql
   * @param queryConfig.params
   * @param options
   * @param _builder
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
   * @param row - Database row with cookie data
   * @param row.name - Cookie name
   * @param row.domain - Cookie domain
   * @param row.value - Cookie value
   * @param row.encrypted_value - Encrypted cookie value if available
   * @param row.expiry - Cookie expiry timestamp
   * @param row.path - Cookie path
   * @param row.is_secure - Whether cookie is secure (1 or 0)
   * @param row.is_httponly - Whether cookie is httpOnly (1 or 0)
   * @param options - Transformation options
   * @returns Transformed ExportedCookie object
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
   * @param options
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
   * @param browser
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
   * @param options
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
   * @param browser
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
   * @param options
   */
  private getCacheKey(options: EnhancedQueryOptions): string {
    return `${options.browser}:${options.name}:${options.domain}:${options.exactDomain}:${options.includeExpired}`;
  }

  /**
   * Get cached result if available
   * @param options
   */
  private getCachedResult<T>(options: EnhancedQueryOptions): T[] | null {
    // Clean cache periodically (every 30 seconds)
    const now = Date.now();
    if (now - this.lastCacheCleanup > 30000) {
      this.cleanupCache();
      this.lastCacheCleanup = now;
    }

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

    return entry.data as T[];
  }

  /**
   * Cache query result
   * @param options
   * @param data
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
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    const maxAge = 60000; // 1 minute

    for (const [key, entry] of this.queryCache) {
      if (now - entry.timestamp > maxAge) {
        this.queryCache.delete(key);
      }
    }
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
 * @param config
 * @param config.enableCache
 * @param config.cacheTTL
 * @param config.maxConnections
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
 * @param browsers
 * @param name
 * @param domain
 * @param options
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

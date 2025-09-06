/**
 * Query monitoring wrapper for SQL operations
 * Provides clean, type-safe monitoring without monkey-patching
 */

import type { Database, Statement } from "better-sqlite3";

import { createTaggedLogger } from "@utils/logHelpers";

const logger = createTaggedLogger("QueryMonitor");

/**
 * Query execution metrics
 */
export interface QueryExecution {
  sql: string;
  params: unknown[];
  startTime: number;
  endTime?: number;
  duration?: number;
  rowCount?: number;
  error?: Error;
  filepath?: string;
}

/**
 * Query monitoring options
 */
export interface MonitoringOptions {
  /** Log slow queries (in ms) */
  slowQueryThreshold?: number;
  /** Enable detailed logging */
  verbose?: boolean;
  /** Track query history */
  trackHistory?: boolean;
  /** Maximum history size */
  maxHistorySize?: number;
}

/**
 * Query monitor for tracking SQL performance
 */
export class QueryMonitor {
  private readonly options: Required<MonitoringOptions>;
  private readonly queryHistory: QueryExecution[];
  private totalQueries: number;
  private totalDuration: number;
  private slowQueries: number;
  private errors: number;

  /**
   * Creates a new QueryMonitor instance for tracking SQL query performance and metrics.
   * @param options - Configuration options for monitoring behavior
   * @param options.slowQueryThreshold - Milliseconds before a query is considered slow (default: 100ms)
   * @param options.verbose - Whether to log detailed query information (default: false)
   * @param options.trackHistory - Whether to maintain query history (default: true)
   * @param options.maxHistorySize - Maximum number of queries to keep in history (default: 1000)
   */
  constructor(options: MonitoringOptions = {}) {
    this.options = {
      slowQueryThreshold: options.slowQueryThreshold ?? 100,
      verbose: options.verbose ?? false,
      trackHistory: options.trackHistory ?? true,
      maxHistorySize: options.maxHistorySize ?? 1000,
    };

    this.queryHistory = [];
    this.totalQueries = 0;
    this.totalDuration = 0;
    this.slowQueries = 0;
    this.errors = 0;
  }

  /**
   * Execute a query with monitoring
   * @param db
   * @param sql
   * @param params
   * @param filepath
   */
  executeQuery<T>(
    db: Database,
    sql: string,
    params: unknown[] = [],
    filepath?: string,
  ): T[] {
    const execution: QueryExecution = {
      sql,
      params,
      startTime: Date.now(),
    };
    if (filepath !== undefined) {
      execution.filepath = filepath;
    }

    try {
      // Execute the query (timeout is already set on the connection)
      const stmt = db.prepare(sql);
      const result = stmt.all(...params) as T[];

      // Record success metrics
      execution.endTime = Date.now();
      execution.duration = execution.endTime - execution.startTime;
      execution.rowCount = result.length;

      this.recordExecution(execution);

      return result;
    } catch (error) {
      // Record error metrics
      execution.endTime = Date.now();
      execution.duration = execution.endTime - execution.startTime;
      execution.error = error as Error;

      this.recordExecution(execution);

      throw error;
    }
  }

  /**
   * Execute a single row query with monitoring
   * @param db
   * @param sql
   * @param params
   * @param filepath
   */
  executeGet<T>(
    db: Database,
    sql: string,
    params: unknown[] = [],
    filepath?: string,
  ): T | undefined {
    const execution: QueryExecution = {
      sql,
      params,
      startTime: Date.now(),
    };
    if (filepath !== undefined) {
      execution.filepath = filepath;
    }

    try {
      // Execute the query (timeout is already set on the connection)
      const stmt = db.prepare(sql);
      const result = stmt.get(...params) as T | undefined;

      // Record success metrics
      execution.endTime = Date.now();
      execution.duration = execution.endTime - execution.startTime;
      execution.rowCount = result ? 1 : 0;

      this.recordExecution(execution);

      return result;
    } catch (error) {
      // Record error metrics
      execution.endTime = Date.now();
      execution.duration = execution.endTime - execution.startTime;
      execution.error = error as Error;

      this.recordExecution(execution);

      throw error;
    }
  }

  /**
   * Create a monitored statement wrapper
   * @param db
   * @param sql
   * @param filepath
   */
  prepareStatement<T>(
    db: Database,
    sql: string,
    filepath?: string,
  ): MonitoredStatement<T> {
    const stmt = db.prepare(sql);
    return new MonitoredStatement(stmt, sql, this, filepath);
  }

  /**
   * Record query execution
   * @param execution
   */
  private recordExecution(execution: QueryExecution): void {
    // Update statistics
    this.totalQueries++;

    if (execution.duration !== undefined) {
      this.totalDuration += execution.duration;

      // Check for slow query
      if (execution.duration > this.options.slowQueryThreshold) {
        this.slowQueries++;

        logger.debug("Slow query detected", {
          sql: execution.sql,
          duration: execution.duration,
          rowCount: execution.rowCount,
          filepath: execution.filepath,
        });
      }
    }

    if (execution.error) {
      this.errors++;

      if (this.options.verbose) {
        logger.error("Query failed", {
          sql: execution.sql,
          error: execution.error.message,
          filepath: execution.filepath,
        });
      }
    } else if (this.options.verbose) {
      logger.debug("Query executed", {
        sql: execution.sql,
        duration: execution.duration,
        rowCount: execution.rowCount,
      });
    }

    // Track history
    if (this.options.trackHistory) {
      this.queryHistory.push(execution);

      // Trim history if needed
      if (this.queryHistory.length > this.options.maxHistorySize) {
        this.queryHistory.splice(
          0,
          this.queryHistory.length - this.options.maxHistorySize,
        );
      }
    }
  }

  /**
   * Get monitoring statistics
   */
  getStatistics() {
    return {
      totalQueries: this.totalQueries,
      averageDuration:
        this.totalQueries > 0 ? this.totalDuration / this.totalQueries : 0,
      slowQueries: this.slowQueries,
      slowQueryRate:
        this.totalQueries > 0 ? this.slowQueries / this.totalQueries : 0,
      errors: this.errors,
      errorRate: this.totalQueries > 0 ? this.errors / this.totalQueries : 0,
      historySize: this.queryHistory.length,
    };
  }

  /**
   * Get query history
   * @param limit
   */
  getHistory(limit?: number): QueryExecution[] {
    if (limit) {
      return this.queryHistory.slice(-limit);
    }
    return [...this.queryHistory];
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.queryHistory.length = 0;
  }

  /**
   * Reset all statistics
   */
  reset(): void {
    this.clearHistory();
    this.totalQueries = 0;
    this.totalDuration = 0;
    this.slowQueries = 0;
    this.errors = 0;
  }
}

/**
 * Monitored statement wrapper
 */
export class MonitoredStatement<T> {
  /**
   * Creates a monitored wrapper around a prepared SQL statement.
   * This wrapper automatically tracks execution metrics for all queries run through it.
   * @param statement - The prepared SQLite statement to monitor
   * @param sql - The SQL query string for logging and debugging
   * @param monitor - The QueryMonitor instance that will track metrics
   * @param filepath - Optional database file path for additional context in logs
   */
  constructor(
    private readonly statement: Statement,
    private readonly sql: string,
    private readonly monitor: QueryMonitor,
    private readonly filepath?: string,
  ) {}

  /**
   * Execute all with monitoring
   * @param {...any} params
   */
  all(...params: unknown[]): T[] {
    return this.monitor.executeQuery<T>(
      { prepare: () => this.statement } as unknown as Database,
      this.sql,
      params,
      this.filepath,
    );
  }

  /**
   * Execute get with monitoring
   * @param {...any} params
   */
  get(...params: unknown[]): T | undefined {
    return this.monitor.executeGet<T>(
      { prepare: () => this.statement } as unknown as Database,
      this.sql,
      params,
      this.filepath,
    );
  }

  /**
   * Get underlying statement
   */
  getStatement(): Statement {
    return this.statement;
  }
}

/**
 * Create a global query monitor instance
 */
let globalMonitor: QueryMonitor | null = null;

/**
 * Get or create global query monitor
 * @param options
 */
export function getGlobalQueryMonitor(
  options?: MonitoringOptions,
): QueryMonitor {
  if (!globalMonitor) {
    globalMonitor = new QueryMonitor(options);
  }
  return globalMonitor;
}

/**
 * Reset global query monitor
 */
export function resetGlobalQueryMonitor(): void {
  if (globalMonitor) {
    globalMonitor.reset();
    globalMonitor = null;
  }
}

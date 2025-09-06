/**
 * Database connection manager with pooling and performance monitoring
 * Manages SQLite connections efficiently with automatic cleanup and monitoring
 */

import BetterSqlite3, { type Database } from "better-sqlite3";
import { createTaggedLogger, logError } from "@utils/logHelpers";
import { EventEmitter } from "node:events";

const logger = createTaggedLogger("DatabaseConnectionManager");

/**
 * Connection pool configuration
 */
export interface PoolConfig {
  /** Maximum number of connections in the pool */
  maxConnections?: number;
  /** Connection timeout in milliseconds */
  connectionTimeout?: number;
  /** Idle timeout before closing connection */
  idleTimeout?: number;
  /** Enable performance monitoring */
  enableMonitoring?: boolean;
  /** Retry attempts for locked databases */
  retryAttempts?: number;
  /** Retry delay in milliseconds */
  retryDelay?: number;
  /** Query execution timeout in milliseconds */
  queryTimeout?: number;
}

/**
 * Database connection metadata
 */
interface ConnectionMetadata {
  database: Database;
  filepath: string;
  inUse: boolean;
  lastAccessed: number;
  queryCount: number;
  totalQueryTime: number;
  created: number;
}

/**
 * Query performance metrics
 */
export interface QueryMetrics {
  query: string;
  duration: number;
  rowCount: number;
  filepath: string;
  timestamp: number;
  success: boolean;
  error?: string;
}

/**
 * Connection pool statistics
 */
export interface PoolStatistics {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  totalQueries: number;
  averageQueryTime: number;
  cacheHitRate: number;
  connectionReuse: number;
}

/**
 * Database connection manager with pooling
 */
export class DatabaseConnectionManager extends EventEmitter {
  private readonly connections: Map<string, ConnectionMetadata>;
  private readonly config: Required<PoolConfig>;
  private readonly queryMetrics: QueryMetrics[];
  private cleanupTimer?: NodeJS.Timeout;
  private totalQueries: number;
  private cacheHits: number;
  private connectionReuses: number;

  constructor(config: PoolConfig = {}) {
    super();

    this.connections = new Map();
    this.queryMetrics = [];
    this.totalQueries = 0;
    this.cacheHits = 0;
    this.connectionReuses = 0;

    this.config = {
      maxConnections: config.maxConnections ?? 5,
      connectionTimeout: config.connectionTimeout ?? 5000,
      idleTimeout: config.idleTimeout ?? 30000,
      enableMonitoring: config.enableMonitoring ?? true,
      retryAttempts: config.retryAttempts ?? 3,
      retryDelay: config.retryDelay ?? 100,
      queryTimeout: config.queryTimeout ?? 3000, // 3 seconds default
    };

    // Start cleanup timer
    this.startCleanupTimer();
  }

  /**
   * Get or create a database connection
   */
  async getConnection(filepath: string): Promise<Database> {
    // Check existing connection
    const existing = this.connections.get(filepath);
    if (existing && !existing.inUse) {
      existing.inUse = true;
      existing.lastAccessed = Date.now();
      this.connectionReuses++;

      logger.debug("Reusing existing connection", {
        filepath,
        queryCount: existing.queryCount,
      });

      return existing.database;
    }

    // Check pool limit
    if (this.connections.size >= this.config.maxConnections) {
      await this.evictLeastRecentlyUsed();
    }

    // Create new connection
    return this.createConnection(filepath);
  }

  /**
   * Create a new database connection
   */
  private async createConnection(filepath: string): Promise<Database> {
    const startTime = Date.now();
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        const database = new BetterSqlite3(filepath, {
          readonly: true,
          fileMustExist: true,
          timeout: this.config.queryTimeout || 3000, // Use query timeout for all operations
        });

        const metadata: ConnectionMetadata = {
          database,
          filepath,
          inUse: true,
          lastAccessed: Date.now(),
          queryCount: 0,
          totalQueryTime: 0,
          created: Date.now(),
        };

        this.connections.set(filepath, metadata);

        const connectionTime = Date.now() - startTime;
        logger.debug("Created new connection", {
          filepath,
          connectionTime,
          attempt: attempt + 1,
        });

        this.emit("connection:created", { filepath, connectionTime });

        return database;
      } catch (error) {
        lastError = error as Error;

        if (this.isDatabaseLocked(error)) {
          logger.warn("Database locked, retrying", {
            filepath,
            attempt: attempt + 1,
            maxAttempts: this.config.retryAttempts,
          });

          await this.delay(this.config.retryDelay * 2 ** attempt);
          continue;
        }

        throw error;
      }
    }

    throw lastError || new Error(`Failed to connect to database: ${filepath}`);
  }

  /**
   * Execute a query with the connection manager
   */
  async executeQuery<T>(
    filepath: string,
    queryFn: (db: Database) => T,
    queryDescription?: string,
  ): Promise<T> {
    const startTime = Date.now();
    const connection = await this.getConnection(filepath);
    const metadata = this.connections.get(filepath);

    try {
      const result = queryFn(connection);
      const duration = Date.now() - startTime;

      if (metadata) {
        metadata.queryCount++;
        metadata.totalQueryTime += duration;
      }

      this.totalQueries++;
      this.cacheHits++; // Increment cache hits for successful queries

      // Warn about slow queries
      if (duration > 100) {
        logger.warn("Slow query detected", {
          query: queryDescription || "Unknown query",
          duration,
          filepath,
        });
      }

      // Record metrics
      if (this.config.enableMonitoring) {
        const metrics: QueryMetrics = {
          query: queryDescription || "Unknown query",
          duration,
          rowCount: Array.isArray(result) ? result.length : 1,
          filepath,
          timestamp: Date.now(),
          success: true,
        };

        this.recordMetrics(metrics);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Increment query count even for failed queries
      this.totalQueries++;

      // Record error metrics
      if (this.config.enableMonitoring) {
        const metrics: QueryMetrics = {
          query: queryDescription || "Unknown query",
          duration,
          rowCount: 0,
          filepath,
          timestamp: Date.now(),
          success: false,
          error: (error as Error).message,
        };

        this.recordMetrics(metrics);
      }

      throw error;
    } finally {
      // Release connection
      if (metadata) {
        metadata.inUse = false;
        metadata.lastAccessed = Date.now();
      }
    }
  }

  /**
   * Release a connection back to the pool
   */
  releaseConnection(filepath: string): void {
    const metadata = this.connections.get(filepath);
    if (metadata) {
      metadata.inUse = false;
      metadata.lastAccessed = Date.now();
      logger.debug("Released connection", { filepath });
    }
  }

  /**
   * Close a specific connection
   */
  closeConnection(filepath: string): void {
    const metadata = this.connections.get(filepath);
    if (metadata) {
      try {
        metadata.database.close();
        this.connections.delete(filepath);

        logger.debug("Closed connection", {
          filepath,
          queryCount: metadata.queryCount,
          lifetime: Date.now() - metadata.created,
        });

        this.emit("connection:closed", { filepath });
      } catch (error) {
        logError("Failed to close connection", error, { filepath });
      }
    }
  }

  /**
   * Close all connections
   */
  closeAll(): void {
    for (const [filepath, metadata] of this.connections) {
      try {
        metadata.database.close();
        logger.debug("Closed connection", { filepath });
      } catch (error) {
        logError("Failed to close connection", error, { filepath });
      }
    }

    this.connections.clear();

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    logger.info("Closed all connections", {
      totalQueries: this.totalQueries,
      connectionReuses: this.connectionReuses,
    });
  }

  /**
   * Get pool statistics
   */
  getStatistics(): PoolStatistics {
    let totalQueryTime = 0;
    let totalQueryCount = 0;
    let activeConnections = 0;

    for (const metadata of this.connections.values()) {
      totalQueryTime += metadata.totalQueryTime;
      totalQueryCount += metadata.queryCount;
      if (metadata.inUse) {
        activeConnections++;
      }
    }

    return {
      totalConnections: this.connections.size,
      activeConnections,
      idleConnections: this.connections.size - activeConnections,
      totalQueries: this.totalQueries,
      averageQueryTime:
        totalQueryCount > 0 ? totalQueryTime / totalQueryCount : 0,
      cacheHitRate:
        this.totalQueries > 0 ? this.cacheHits / this.totalQueries : 0,
      connectionReuse: this.connectionReuses,
    };
  }

  /**
   * Get recent query metrics
   */
  getQueryMetrics(limit = 100): QueryMetrics[] {
    return this.queryMetrics.slice(-limit);
  }

  /**
   * Clear query metrics
   */
  clearMetrics(): void {
    this.queryMetrics.length = 0;
  }

  /**
   * Start cleanup timer for idle connections
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupIdleConnections();
    }, 10000); // Check every 10 seconds
  }

  /**
   * Clean up idle connections
   */
  private cleanupIdleConnections(): void {
    const now = Date.now();
    const toClose: string[] = [];

    for (const [filepath, metadata] of this.connections) {
      if (
        !metadata.inUse &&
        now - metadata.lastAccessed > this.config.idleTimeout
      ) {
        toClose.push(filepath);
      }
    }

    for (const filepath of toClose) {
      this.closeConnection(filepath);
    }

    if (toClose.length > 0) {
      logger.debug("Cleaned up idle connections", { count: toClose.length });
    }
  }

  /**
   * Evict least recently used connection
   */
  private async evictLeastRecentlyUsed(): Promise<void> {
    let lruPath: string | null = null;
    let lruTime = Date.now();

    for (const [filepath, metadata] of this.connections) {
      if (!metadata.inUse && metadata.lastAccessed < lruTime) {
        lruPath = filepath;
        lruTime = metadata.lastAccessed;
      }
    }

    if (lruPath) {
      this.closeConnection(lruPath);
      logger.debug("Evicted LRU connection", { filepath: lruPath });
    } else {
      // All connections are in use, wait a bit
      await this.delay(100);
    }
  }

  /**
   * Record query metrics
   */
  private recordMetrics(metrics: QueryMetrics): void {
    this.queryMetrics.push(metrics);

    // Keep only recent metrics (last 1000)
    if (this.queryMetrics.length > 1000) {
      this.queryMetrics.splice(0, this.queryMetrics.length - 1000);
    }

    this.emit("query:executed", metrics);
  }

  /**
   * Check if error indicates database lock
   */
  private isDatabaseLocked(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes("database is locked") ||
        message.includes("database locked") ||
        message.includes("sqlite_busy")
      );
    }
    return false;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Global connection manager instance
 */
let globalManager: DatabaseConnectionManager | null = null;

/**
 * Get or create global connection manager
 */
export function getGlobalConnectionManager(
  config?: PoolConfig,
): DatabaseConnectionManager {
  if (!globalManager) {
    globalManager = new DatabaseConnectionManager(config);

    // Ensure cleanup on process exit
    process.on("exit", () => {
      if (globalManager) {
        globalManager.closeAll();
      }
    });
  }

  return globalManager;
}

/**
 * Reset global connection manager (mainly for testing)
 */
export function resetGlobalConnectionManager(): void {
  if (globalManager) {
    globalManager.closeAll();
    globalManager = null;
  }
}

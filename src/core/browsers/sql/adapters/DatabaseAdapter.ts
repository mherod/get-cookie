/**
 * Database adapter abstraction layer
 * Provides a unified interface for SQLite implementations (better-sqlite3 and bun:sqlite)
 */

/**
 * Minimal SQLite statement interface
 * Represents a prepared SQL statement with binding and execution methods
 */
export interface SqliteStatement {
  /**
   * Execute prepared statement and return all matching rows
   * @param params - Query parameters to bind
   */
  all(...params: unknown[]): unknown[];

  /**
   * Execute prepared statement and return first matching row
   * @param params - Query parameters to bind
   */
  get(...params: unknown[]): unknown | undefined;

  /**
   * Execute prepared statement (for INSERT, UPDATE, DELETE)
   * @param params - Query parameters to bind
   */
  run(...params: unknown[]): void;
}

/**
 * Minimal SQLite database interface
 * Represents a database connection with query preparation and management
 */
export interface SqliteDatabase {
  /**
   * Prepare a SQL statement for execution
   * @param sql - SQL query string
   */
  prepare(sql: string): SqliteStatement;

  /**
   * Execute a PRAGMA statement
   * @param pragma - PRAGMA string (e.g., "busy_timeout = 3000")
   */
  pragma(pragma: string): unknown;

  /**
   * Close the database connection
   */
  close(): void;

  /**
   * Whether the database is opened in read-only mode
   */
  readonly?: boolean;
}

/**
 * SQLite database connection options
 */
export interface SqliteOptions {
  /**
   * Open database in read-only mode
   */
  readonly?: boolean;

  /**
   * Require the database file to exist
   */
  fileMustExist?: boolean;
}

/**
 * Runtime detection type
 */
export type Runtime = "node" | "bun";

/**
 * Detect the current runtime environment
 * @returns The detected runtime ("bun" or "node")
 */
function detectRuntime(): Runtime {
  // Check if running in Bun: look for globalThis.Bun
  if (typeof (globalThis as Record<string, unknown>).Bun !== "undefined") {
    return "bun";
  }
  return "node";
}

/**
 * Create a SQLite database adapter instance
 * Automatically detects the runtime and returns the appropriate adapter
 *
 * @param filepath - Path to the SQLite database file
 * @param options - Database connection options
 * @returns A SqliteDatabase instance compatible with the current runtime
 */
export function createSqliteDatabase(
  filepath: string,
  options: SqliteOptions = {},
): SqliteDatabase {
  const runtime = detectRuntime();

  if (runtime === "bun") {
    // Dynamically import BunSqliteAdapter only when needed
    // This allows Node.js to continue working without Bun installed
    const BunSqliteAdapter = require("./BunSqliteAdapter").BunSqliteAdapter;
    return new BunSqliteAdapter(filepath, options);
  }

  // Default to Node.js with better-sqlite3
  const BetterSqlite3Adapter =
    require("./BetterSqlite3Adapter").BetterSqlite3Adapter;
  return new BetterSqlite3Adapter(filepath, options);
}

/**
 * Export the current runtime detector for testing and debugging
 */
export function getCurrentRuntime(): Runtime {
  return detectRuntime();
}

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
 * Explicit runtime override, set by entrypoint modules (e.g. `@mherod/get-cookie/node`)
 * to skip auto-detection and force a specific SQLite adapter.
 */
let runtimeOverride: Runtime | undefined;

/**
 * Force a specific runtime for SQLite adapter selection.
 * Called by the `@mherod/get-cookie/node` and `@mherod/get-cookie/bun` entrypoints
 * so consumers get deterministic adapter resolution without relying on auto-detection.
 *
 * @param runtime - The runtime to force ("node" or "bun"), or undefined to clear
 */
export function setRuntimeOverride(runtime: Runtime | undefined): void {
  runtimeOverride = runtime;
}

/**
 * Detect the current runtime environment
 * @returns The explicit override if set, otherwise the detected runtime ("bun" or "node")
 */
function detectRuntime(): Runtime {
  if (runtimeOverride !== undefined) {
    return runtimeOverride;
  }
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
    // Dynamically import BunSqliteAdapter only when needed.
    // Wrapped in try/catch: if bun:sqlite is unavailable (e.g. the bundle is
    // evaluated in Node.js where the bun: URL scheme is rejected), fall through
    // to better-sqlite3 rather than throwing ERR_UNSUPPORTED_ESM_URL_SCHEME.
    try {
      const BunSqliteAdapter = require("./BunSqliteAdapter").BunSqliteAdapter;
      return new BunSqliteAdapter(filepath, options);
    } catch {
      // Fall through to better-sqlite3 below
    }
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

/**
 * Bun:sqlite adapter implementation
 * Wraps bun:sqlite to provide the SqliteDatabase interface
 */

import type {
  SqliteDatabase,
  SqliteOptions,
  SqliteStatement,
} from "./DatabaseAdapter";

/**
 * Type definitions for Bun's SQLite API
 * These are the minimal interfaces we need from Bun
 */
interface BunSqliteStatement {
  all(...params: unknown[]): unknown[];
  get(...params: unknown[]): unknown | undefined;
  run(...params: unknown[]): void;
}

interface BunDatabaseOptions {
  readonly?: boolean;
  create?: boolean;
}

interface BunSqliteDB {
  prepare(sql: string): BunSqliteStatement;
  exec(sql: string): void;
  close(): void;
}

interface BunDatabaseConstructor {
  new (filepath: string, options?: BunDatabaseOptions): BunSqliteDB;
}

/**
 * Statement wrapper for Bun:sqlite
 */
class BunStatement implements SqliteStatement {
  constructor(private readonly statement: BunSqliteStatement) {}

  all(...params: unknown[]): unknown[] {
    return this.statement.all(...params);
  }

  get(...params: unknown[]): unknown | undefined {
    return this.statement.get(...params);
  }

  run(...params: unknown[]): void {
    this.statement.run(...params);
  }
}

/**
 * Database adapter for Bun:sqlite
 * Implements the SqliteDatabase interface using Bun's built-in SQLite
 */
export class BunSqliteAdapter implements SqliteDatabase {
  private readonly db: BunSqliteDB;

  readonly?: boolean;

  constructor(filepath: string, options: SqliteOptions = {}) {
    // Dynamically require Bun's sqlite module
    // eslint-disable-next-line global-require
    const { Database } = require("bun:sqlite") as {
      Database: BunDatabaseConstructor;
    };

    // Bun uses 'Database' constructor from bun:sqlite
    // It handles the filepath directly.
    // Bun's default is create: false (won't create new files), but we pass it
    // explicitly when fileMustExist is true to match better-sqlite3 semantics.
    const dbOptions: BunDatabaseOptions = {
      readonly: options.readonly ?? false,
      ...(options.fileMustExist ? { create: false } : {}),
    };
    this.db = new Database(filepath, dbOptions);

    this.readonly = options.readonly ?? false;
  }

  prepare(sql: string): SqliteStatement {
    const stmt = this.db.prepare(sql);
    return new BunStatement(stmt);
  }

  pragma(pragma: string): unknown {
    // Bun uses exec() for PRAGMA statements instead of pragma()
    // Convert "key = value" format to "PRAGMA key = value"
    const pragmaSql = `PRAGMA ${pragma}`;
    this.db.exec(pragmaSql);
    return undefined;
  }

  close(): void {
    this.db.close();
  }
}

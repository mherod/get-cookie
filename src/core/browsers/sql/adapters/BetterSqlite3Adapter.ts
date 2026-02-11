/**
 * better-sqlite3 adapter implementation
 * Wraps better-sqlite3 to provide the SqliteDatabase interface
 */

import BetterSqlite3 from "better-sqlite3";

import type {
  SqliteDatabase,
  SqliteOptions,
  SqliteStatement,
} from "./DatabaseAdapter";

/**
 * Statement wrapper for better-sqlite3
 */
class BetterSqlite3Statement implements SqliteStatement {
  constructor(private readonly statement: BetterSqlite3.Statement) {}

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
 * Database adapter for better-sqlite3 (Node.js)
 * Implements the SqliteDatabase interface using better-sqlite3
 */
export class BetterSqlite3Adapter implements SqliteDatabase {
  private readonly db: BetterSqlite3.Database;

  readonly?: boolean;

  constructor(filepath: string, options: SqliteOptions = {}) {
    this.db = new BetterSqlite3(filepath, {
      readonly: options.readonly ?? false,
      fileMustExist: options.fileMustExist ?? false,
    });

    // Set readonly flag on adapter
    this.readonly = options.readonly ?? false;
  }

  prepare(sql: string): SqliteStatement {
    const stmt = this.db.prepare(sql);
    return new BetterSqlite3Statement(stmt);
  }

  pragma(pragma: string): void {
    this.db.pragma(pragma);
  }

  close(): void {
    this.db.close();
  }
}

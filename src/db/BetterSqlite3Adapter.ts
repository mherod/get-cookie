import BetterSqlite3 from "better-sqlite3";
import { ISqliteAdapter, SqliteAdapterOptions, SqliteQueryResult, SqliteRow } from "./ISqliteAdapter";

export class BetterSqlite3Adapter implements ISqliteAdapter {
  private readonly db: BetterSqlite3.Database;

  constructor(options: SqliteAdapterOptions) {
    this.db = new BetterSqlite3(options.file, { readonly: options.readOnly });
  }

  async query(sql: string): Promise<SqliteQueryResult> {
    const stmt = this.db.prepare(sql);
    return {
      all: async (): Promise<SqliteRow[]> => stmt.all() as SqliteRow[],
    };
  }

  async close(): Promise<void> {
    this.db.close();
  }
}
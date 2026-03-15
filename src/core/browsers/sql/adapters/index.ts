/**
 * SQLite adapter abstraction layer
 * Provides runtime-aware database adapter selection
 */

export {
  createSqliteDatabase,
  getCurrentRuntime,
  setRuntimeOverride,
  type Runtime,
  type SqliteDatabase,
  type SqliteOptions,
  type SqliteStatement,
} from "./DatabaseAdapter";

export { BetterSqlite3Adapter } from "./BetterSqlite3Adapter";
export { BunSqliteAdapter } from "./BunSqliteAdapter";

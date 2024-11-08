import { ISqliteAdapter, SqliteQueryResult } from './ISqliteAdapter';
import { SqliteAdapterRegistry } from './SqliteAdapterRegistry';
import { BetterSqlite3AdapterFactory } from './BetterSqlite3AdapterFactory';
import { CliSqliteAdapterFactory } from './CliSqliteAdapterFactory';
import { SqliteError } from './SqliteError';

class SqliteAdapter implements ISqliteAdapter {
  private static registry: SqliteAdapterRegistry;
  private adapter!: ISqliteAdapter;
  private initialized: boolean = false;
  private initializationPromise: Promise<void>;

  static {
    SqliteAdapter.registry = new SqliteAdapterRegistry();
    SqliteAdapter.registry.registerFactory(new BetterSqlite3AdapterFactory());
    SqliteAdapter.registry.registerFactory(new CliSqliteAdapterFactory());
  }

  constructor(file: string) {
    this.initializationPromise = this.initialize(file);
  }

  private async initialize(file: string): Promise<void> {
    try {
      this.adapter = await SqliteAdapter.registry.createAdapter({
        file,
        readOnly: true
      });
      this.initialized = true;
    } catch (error) {
      throw new SqliteError(
        `Failed to initialize SQLite adapter: ${(error as Error).message}`,
        SqliteError.ErrorCodes.INITIALIZATION_FAILED,
        error as Error
      );
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initializationPromise;
    }
  }

  async query(sql: string): Promise<SqliteQueryResult> {
    await this.ensureInitialized();
    try {
      return await this.adapter.query(sql);
    } catch (error) {
      throw new SqliteError(
        `Query failed: ${(error as Error).message}`,
        SqliteError.ErrorCodes.QUERY_FAILED,
        error as Error
      );
    }
  }

  async close(): Promise<void> {
    await this.ensureInitialized();
    try {
      await this.adapter.close();
    } catch (error) {
      throw new SqliteError(
        `Failed to close adapter: ${(error as Error).message}`,
        SqliteError.ErrorCodes.QUERY_FAILED,
        error as Error
      );
    }
  }
}

export default SqliteAdapter;
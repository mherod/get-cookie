import { ISqliteAdapterFactory } from './ISqliteAdapterFactory';
import { ISqliteAdapter, SqliteAdapterOptions } from './ISqliteAdapter';
import { BetterSqlite3Adapter } from './BetterSqlite3Adapter';

export class BetterSqlite3AdapterFactory implements ISqliteAdapterFactory {
  async canHandle(options: SqliteAdapterOptions): Promise<boolean> {
    try {
      const adapter = new BetterSqlite3Adapter(options);
      await adapter.close();
      return true;
    } catch {
      return false;
    }
  }

  createAdapter(options: SqliteAdapterOptions): ISqliteAdapter {
    return new BetterSqlite3Adapter(options);
  }
}
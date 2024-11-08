import { ISqliteAdapter, SqliteAdapterOptions } from './ISqliteAdapter';

export interface ISqliteAdapterFactory {
  createAdapter(options: SqliteAdapterOptions): ISqliteAdapter;
  canHandle(options: SqliteAdapterOptions): Promise<boolean>;
}
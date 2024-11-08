import { ISqliteAdapterFactory } from './ISqliteAdapterFactory';
import { ISqliteAdapter, SqliteAdapterOptions } from './ISqliteAdapter';

export class SqliteAdapterRegistry {
  private readonly factories: ISqliteAdapterFactory[] = [];

  registerFactory(factory: ISqliteAdapterFactory): void {
    this.factories.push(factory);
  }

  async createAdapter(options: SqliteAdapterOptions): Promise<ISqliteAdapter> {
    for (const factory of this.factories) {
      if (await factory.canHandle(options)) {
        return factory.createAdapter(options);
      }
    }
    throw new Error('No suitable SQLite adapter found');
  }
}
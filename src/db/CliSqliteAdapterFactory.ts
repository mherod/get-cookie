import { ISqliteAdapterFactory } from './ISqliteAdapterFactory';
import { ISqliteAdapter, SqliteAdapterOptions } from './ISqliteAdapter';
import { CliSqliteAdapter } from './CliSqliteAdapter';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class CliSqliteAdapterFactory implements ISqliteAdapterFactory {
  async canHandle(_options: SqliteAdapterOptions): Promise<boolean> {
    try {
      await execAsync('sqlite3 --version');
      return true;
    } catch {
      return false;
    }
  }

  createAdapter(options: SqliteAdapterOptions): ISqliteAdapter {
    return new CliSqliteAdapter(options);
  }
}
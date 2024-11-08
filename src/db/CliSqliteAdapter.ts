import { ISqliteAdapter, SqliteAdapterOptions, SqliteQueryResult, SqliteRow } from "./ISqliteAdapter";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const WRITE_OPERATIONS_REGEX = /^(?:INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)/i;

export interface CliSqliteAdapterOptions extends SqliteAdapterOptions {
  csv?: boolean;
  json?: boolean;
  nullValue?: string;
  separator?: string;
}

type OutputFormat = '-json' | '-csv' | '-list';

export class CliSqliteAdapter implements ISqliteAdapter {
  private readonly dbPath: string;
  private readonly readOnly: boolean;
  private readonly outputFormat: OutputFormat;
  private readonly nullValue: string;
  private readonly separator: string;

  constructor(options: CliSqliteAdapterOptions) {
    this.dbPath = options.file;
    this.readOnly = options.readOnly ?? false;
    this.outputFormat = this.determineOutputFormat(options);
    this.nullValue = options.nullValue ?? '';
    this.separator = options.separator ?? '|';
  }

  private determineOutputFormat(options: CliSqliteAdapterOptions): OutputFormat {
    if (options.json) return '-json';
    if (options.csv) return '-csv';
    return '-list';
  }

  async query(sql: string): Promise<SqliteQueryResult> {
    if (this.readOnly && WRITE_OPERATIONS_REGEX.test(sql.trim())) {
      throw new Error('Write operations not permitted in readonly mode');
    }

    return {
      all: async (): Promise<SqliteRow[]> => {
        try {
          const escapedSql = sql.replace(/'/g, "''");
          const command = this.buildSqliteCommand(escapedSql);
          const { stdout } = await execAsync(command);

          return this.parseOutput(stdout);
        } catch (error) {
          throw new Error(`SQLite CLI query failed: ${(error as Error).message}`);
        }
      }
    };
  }

  private buildSqliteCommand(sql: string): string {
    const readOnlyFlag = this.readOnly ? '-readonly' : '';
    const nullValueFlag = `-nullvalue '${this.nullValue}'`;
    const separatorFlag = `-separator '${this.separator}'`;

    return [
      'sqlite3',
      readOnlyFlag,
      this.outputFormat,
      nullValueFlag,
      separatorFlag,
      `"${this.dbPath}"`,
      `'${sql}'`
    ].filter(Boolean).join(' ');
  }

  private parseOutput(output: string): SqliteRow[] {
    if (!output.trim()) {
      return [];
    }

    if (this.outputFormat === '-json') {
      return JSON.parse(output) as SqliteRow[];
    }

    return this.parseDelimitedOutput(output);
  }

  private parseDelimitedOutput(output: string): SqliteRow[] {
    return output
      .trim()
      .split('\n')
      .map(row => {
        const values = row.split(this.separator);
        return values.reduce<SqliteRow>((obj, val, idx) => {
          obj[`column${idx}`] = val === '' ? this.nullValue : val;
          return obj;
        }, {});
      });
  }

  async close(): Promise<void> {
    // No persistent connection to close when using CLI
  }
}
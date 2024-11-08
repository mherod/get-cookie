export interface SqliteAdapterOptions {
  file: string;
  readOnly?: boolean;
}

export type SqliteRow = Record<string, string | number | null>;

export interface SqliteQueryResult {
  all(): Promise<SqliteRow[]>;
}

export interface ISqliteAdapter {
  query(sql: string): Promise<SqliteQueryResult>;
  close(): Promise<void>;
}
// External imports
import BetterSqlite3, { Database } from "better-sqlite3";

// Internal imports
import { logError } from "@utils/logHelpers";

interface QuerySqliteThenTransformOptions<TRow, TResult> {
  file: string;
  sql: string;
  params?: unknown[];
  rowFilter?: (row: TRow) => boolean;
  rowTransform?: (row: TRow) => TResult;
}

function openDatabase(file: string): Database {
  try {
    return new BetterSqlite3(file, { readonly: true, fileMustExist: true });
  } catch (error) {
    logError("Database open failed", error, { file });
    throw error;
  }
}

function closeDatabase(db: Database): Promise<void> {
  try {
    db.close();
    return Promise.resolve();
  } catch (error) {
    logError("Database close failed", error);
    return Promise.reject(
      error instanceof Error
        ? error
        : new Error("Failed to close database: Unknown error"),
    );
  }
}

/**
 * Executes a SQL query on a SQLite database file and transforms the results
 * @param root0 - The options object containing query parameters
 * @param root0.file - The path to the SQLite database file
 * @param root0.sql - The SQL query to execute
 * @param root0.params - Optional parameters for the SQL query
 * @param root0.rowFilter - Optional function to filter rows from the result set
 * @param root0.rowTransform - Optional function to transform each row before returning
 * @returns A promise that resolves to an array of transformed results
 */
export async function querySqliteThenTransform<TRow, TResult>({
  file,
  sql,
  params,
  rowFilter,
  rowTransform,
}: QuerySqliteThenTransformOptions<TRow, TResult>): Promise<TResult[]> {
  let db: Database | undefined;

  try {
    db = openDatabase(file);
    const stmt = db.prepare(sql);
    const rows = stmt.all(params) as TRow[];

    const filteredRows = rowFilter ? rows.filter(rowFilter) : rows;
    const transformedRows = rowTransform
      ? filteredRows.map(rowTransform)
      : (filteredRows as unknown as TResult[]);

    return transformedRows;
  } catch (error) {
    logError("Database query failed", error, { file, sql });
    throw error;
  } finally {
    if (db) {
      await closeDatabase(db);
    }
  }
}

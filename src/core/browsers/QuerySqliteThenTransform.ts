// External imports
import BetterSqlite3, { Database } from "better-sqlite3";

// Internal imports
import logger from "@utils/logger";

const consola = logger.withTag("QuerySqliteThenTransform");

interface QuerySqliteThenTransformOptions<TRow, TResult> {
  file: string;
  sql: string;
  params?: unknown[];
  rowFilter?: (row: TRow) => boolean;
  rowTransform?: (row: TRow) => TResult;
}

function openDatabase(file: string): Promise<Database> {
  try {
    return Promise.resolve(new BetterSqlite3(file, { readonly: true }));
  } catch (error) {
    if (error instanceof Error) {
      consola.error(`Failed to open database ${file}:`, error.message);
    } else {
      consola.error(`Failed to open database ${file}: Unknown error`);
    }
    throw error;
  }
}

function closeDatabase(db: Database): Promise<void> {
  try {
    db.close();
    return Promise.resolve();
  } catch (error) {
    if (error instanceof Error) {
      consola.error("Failed to close database:", error.message);
      return Promise.reject(error);
    } else {
      consola.error("Failed to close database: Unknown error");
      return Promise.reject(
        new Error("Failed to close database: Unknown error"),
      );
    }
  }
}

/**
 * Executes a SQL query on a SQLite database file and transforms the results
 *
 * @param root0 - The options object containing query parameters
 * @param root0.file - The path to the SQLite database file
 * @param root0.sql - The SQL query to execute
 * @param root0.params - Optional parameters for the SQL query
 * @param root0.rowFilter - Optional function to filter rows from the result set
 * @param root0.rowTransform - Optional function to transform each row before returning
 * @returns A promise that resolves to an array of transformed results
 * @example
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
    db = await openDatabase(file);
    const stmt = db.prepare(sql);
    const rows = stmt.all(params) as TRow[];

    const filteredRows = rowFilter ? rows.filter(rowFilter) : rows;
    const transformedRows = rowTransform
      ? filteredRows.map(rowTransform)
      : (filteredRows as unknown as TResult[]);

    return transformedRows;
  } catch (error) {
    if (error instanceof Error) {
      consola.error(`Failed to query database ${file}:`, error.message);
    } else {
      consola.error(`Failed to query database ${file}: Unknown error`);
    }
    throw error;
  } finally {
    if (db) {
      await closeDatabase(db);
    }
  }
}

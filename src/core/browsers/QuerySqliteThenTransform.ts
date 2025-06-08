// External imports
import BetterSqlite3, { Database } from "better-sqlite3";

// Internal imports
import { logError, createTaggedLogger } from "@utils/logHelpers";

const logger = createTaggedLogger("QuerySqliteThenTransform");

interface QuerySqliteThenTransformOptions<TRow, TResult> {
  file: string;
  sql: string;
  params?: unknown[];
  rowFilter?: (row: TRow) => boolean;
  rowTransform?: (row: TRow) => TResult;
  retryAttempts?: number;
}

/**
 * Sleep for a specified number of milliseconds
 * @param ms - Number of milliseconds to sleep
 * @returns Promise that resolves after the specified time
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if an error indicates a database lock
 * @param error - The error to check
 * @returns True if the error indicates a database lock
 */
function isDatabaseLockError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("database is locked") ||
      message.includes("database locked") ||
      message.includes("sqlite_busy")
    );
  }
  return false;
}

function openDatabase(file: string): Database {
  try {
    const db = new BetterSqlite3(file, { readonly: true, fileMustExist: true });

    // Set WAL mode to reduce lock contention with the browser
    try {
      db.pragma("journal_mode = WAL");
      logger.debug("Set WAL mode for database", { file });
    } catch (pragmaError) {
      // WAL mode setting failed, but continue with default mode
      logger.warn("Failed to set WAL mode, continuing with default", {
        file,
        error:
          pragmaError instanceof Error
            ? pragmaError.message
            : String(pragmaError),
      });
    }

    return db;
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
 * Execute a single query attempt
 * @param options - Query options
 * @returns Promise that resolves to transformed results
 */
async function executeQueryAttempt<TRow, TResult>(
  options: QuerySqliteThenTransformOptions<TRow, TResult>,
): Promise<TResult[]> {
  const { file, sql, params, rowFilter, rowTransform } = options;
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
  } finally {
    if (db) {
      await closeDatabase(db);
    }
  }
}

/**
 * Executes a SQL query on a SQLite database file and transforms the results
 * Includes retry logic with exponential backoff for database lock errors
 * @param options - The options object containing query parameters
 * @param options.file - The path to the SQLite database file
 * @param options.sql - The SQL query to execute
 * @param options.params - Optional parameters for the SQL query
 * @param options.rowFilter - Optional function to filter rows from the result set
 * @param options.rowTransform - Optional function to transform each row before returning
 * @param options.retryAttempts - Number of retry attempts (default: 3)
 * @returns A promise that resolves to an array of transformed results
 */
export async function querySqliteThenTransform<TRow, TResult>(
  options: QuerySqliteThenTransformOptions<TRow, TResult>,
): Promise<TResult[]> {
  const { file, sql, retryAttempts = 3 } = options;
  const retryDelays = [100, 500, 1000]; // Exponential backoff delays

  let lastError: unknown;

  for (let attempt = 0; attempt < retryAttempts; attempt++) {
    try {
      const results = await executeQueryAttempt(options);

      if (attempt > 0) {
        logger.info("Database query succeeded after retry", {
          file,
          attempt: attempt + 1,
          totalAttempts: retryAttempts,
        });
      }

      return results;
    } catch (error) {
      lastError = error;

      if (isDatabaseLockError(error) && attempt < retryAttempts - 1) {
        const delay = retryDelays[attempt] || 1000;
        logger.warn("Database locked, retrying after delay", {
          file,
          attempt: attempt + 1,
          totalAttempts: retryAttempts,
          delay,
          error: error instanceof Error ? error.message : String(error),
        });

        await sleep(delay);
        continue;
      }

      // Not a lock error or final attempt - throw the error
      logError("Database query failed", error, {
        file,
        sql,
        attempt: attempt + 1,
      });
      throw error;
    }
  }

  // Should never reach here, but TypeScript requires it
  throw lastError;
}

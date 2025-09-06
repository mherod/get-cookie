/**
 * DEPRECATED: Legacy query function - use sql/DatabaseConnectionManager instead
 * This file is maintained for backward compatibility but all new code should use
 * the new SQL utilities in src/core/browsers/sql/
 */

import { createTaggedLogger } from "@utils/logHelpers";
import { getGlobalConnectionManager } from "./sql/DatabaseConnectionManager";
import { getGlobalQueryMonitor } from "./sql/QueryMonitor";

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
 * Executes a SQL query on a SQLite database file and transforms the results
 *
 * @deprecated Use DatabaseConnectionManager.executeQuery() instead for better performance and monitoring
 *
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
  const {
    file,
    sql,
    params,
    rowFilter,
    rowTransform,
    retryAttempts = 3,
  } = options;

  // Use the new connection manager with built-in retry logic
  const connectionManager = getGlobalConnectionManager({
    retryAttempts,
    retryDelay: 100,
    enableMonitoring: true,
  });

  const monitor = getGlobalQueryMonitor();

  try {
    // Execute using the connection manager
    const results = await connectionManager.executeQuery(
      file,
      (db) => {
        // Use the query monitor for tracking
        const rows = monitor.executeQuery<TRow>(db, sql, params || [], file);

        // Apply filtering
        const filteredRows = rowFilter ? rows.filter(rowFilter) : rows;

        // Apply transformation
        const transformedRows = rowTransform
          ? filteredRows.map(rowTransform)
          : (filteredRows as unknown as TResult[]);

        return transformedRows;
      },
      sql, // Pass SQL for monitoring
    );

    return results;
  } catch (error) {
    logger.error("Query failed using new connection manager", {
      file,
      sql,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

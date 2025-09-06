import { existsSync } from "node:fs";
import { join } from "node:path";

import glob from "fast-glob";

import {
  createTaggedLogger,
  logError,
  logOperationResult,
} from "@utils/logHelpers";

import type { CookieRow } from "../../types/schemas";

import { chromeApplicationSupport } from "./chrome/ChromeApplicationSupport";
import { CookieQueryBuilder } from "./sql/CookieQueryBuilder";
import { getGlobalConnectionManager } from "./sql/DatabaseConnectionManager";
import { getGlobalQueryMonitor } from "./sql/QueryMonitor";

const logger = createTaggedLogger("getEncryptedChromeCookie");

interface ChromeCookieRow {
  encrypted_value: Buffer;
  name: string;
  host_key: string;
  expires_utc: number;
}

interface GetEncryptedCookieOptions {
  name: string;
  domain: string;
  file?: string;
}

interface SqlQuery {
  sql: string;
  params: string[];
}

/**
 * Validates if a path is a valid, existing file
 * @param path - Path to validate
 * @returns true if path is valid and file exists, false otherwise
 */
function isValidFilePath(path: unknown): path is string {
  if (typeof path !== "string") {
    return false;
  }

  const trimmedPath = path.trim();
  if (trimmedPath.length === 0) {
    return false;
  }

  return existsSync(trimmedPath);
}

/**
 * Get paths to Chrome cookie files
 * @returns A promise that resolves to an array of file paths
 */
async function getCookieFiles(): Promise<string[]> {
  const patterns = [
    join(chromeApplicationSupport, "Default/Cookies"),
    join(chromeApplicationSupport, "Profile */Cookies"),
    join(chromeApplicationSupport, "Profile Default/Cookies"),
  ];

  const files: string[] = [];
  for (const pattern of patterns) {
    const matches = await glob(pattern);
    files.push(...matches);
  }

  logger.debug("ChromeCookies", "Found cookie files", {
    count: files.length,
    files,
  });
  return files;
}

/**
 * Builds the SQL query for retrieving cookies using the new query builder
 * @param name - Cookie name to search for
 * @param domain - Domain to filter by
 * @returns SQL query configuration
 */
function buildSqlQuery(name: string, domain: string): SqlQuery {
  const queryBuilder = new CookieQueryBuilder("chrome");
  const queryConfig = queryBuilder.buildSelectQuery({
    name,
    domain,
    browser: "chrome",
  });

  return {
    sql: queryConfig.sql,
    params: queryConfig.params as string[], // Cast since we know Chrome queries use string params
  };
}

/**
 * Processes a single cookie file to extract matching cookies
 * @param cookieFile - Path to the cookie file
 * @param name - Cookie name to search for
 * @param domain - Domain to filter by
 * @returns Array of matching cookies
 */
async function processCookieFile(
  cookieFile: string,
  name: string,
  domain: string,
): Promise<CookieRow[]> {
  try {
    const { sql, params } = buildSqlQuery(name, domain);
    logger.debug("ChromeCookies", "Executing query", { sql, params });

    // Use the new connection manager and query monitor
    const connectionManager = getGlobalConnectionManager();
    const monitor = getGlobalQueryMonitor();

    const rows = await connectionManager.executeQuery(
      cookieFile,
      (db) => {
        const results = monitor.executeQuery<ChromeCookieRow>(
          db,
          sql,
          params,
          cookieFile,
        );

        // Transform the rows
        return results.map(
          (row): CookieRow => ({
            name: row.name,
            domain: row.host_key,
            value: row.encrypted_value,
            expiry: row.expires_utc,
          }),
        );
      },
      sql, // Pass SQL for monitoring
    );

    logOperationResult("QueryCookies", true, {
      file: cookieFile,
      count: rows.length,
    });
    return rows;
  } catch (error) {
    logError("Failed to read cookie file", error, { file: cookieFile });
    return [];
  }
}

/**
 * Retrieve encrypted cookies from Chrome's cookie store
 * @param options - Options for querying Chrome cookies
 * @param options.name - The name of the cookie to retrieve
 * @param options.domain - The domain to retrieve cookies from
 * @param options.file - Optional specific cookie file to query
 * @returns Promise resolving to array of encrypted cookies
 */
export async function getEncryptedChromeCookie({
  name,
  domain,
  file,
}: GetEncryptedCookieOptions): Promise<CookieRow[]> {
  const cookieFiles =
    typeof file === "string" && file.length > 0
      ? [file]
      : await getCookieFiles();

  if (cookieFiles.length === 0) {
    logger.debug("ChromeCookies", "No cookie files found");
    return [];
  }

  const results: CookieRow[] = [];
  for (const cookieFile of cookieFiles) {
    if (!isValidFilePath(cookieFile)) {
      logger.debug("ChromeCookies", "Cookie file missing or invalid", {
        file: cookieFile,
      });
      continue;
    }

    const cookies = await processCookieFile(cookieFile, name, domain);
    results.push(...cookies);
  }

  logger.debug("ChromeCookies", "Query complete", {
    totalCookies: results.length,
  });
  return results;
}

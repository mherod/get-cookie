import { homedir } from "os";
import { join } from "path";

import fg from "fast-glob";

import { createTaggedLogger } from "@utils/logHelpers";
import { isFirefoxRunning, getBrowserConflictAdvice } from "@utils/ProcessDetector";

import type { ExportedCookie } from "../../../types/schemas";
import { BaseCookieQueryStrategy } from "../BaseCookieQueryStrategy";
import { querySqliteThenTransform } from "../QuerySqliteThenTransform";

interface FirefoxCookieRow {
  name: string;
  value: string;
  domain: string;
  expiry: number;
}

/**
 * Find all Firefox cookie database files
 * @param logger - Logger instance for logging messages
 * @returns An array of file paths to Firefox cookie databases
 */
function findFirefoxCookieFiles(
  logger: ReturnType<typeof createTaggedLogger>,
): string[] {
  const home = homedir();
  if (!home) {
    logger.warn("Failed to get home directory");
    return [];
  }

  const patterns = [
    join(home, "Library/Application Support/Firefox/Profiles/*/cookies.sqlite"),
    join(home, ".mozilla/firefox/*/cookies.sqlite"),
  ];

  const files: string[] = [];
  for (const pattern of patterns) {
    const matches = fg.sync(pattern);
    files.push(...matches);
  }

  logger.debug("Found Firefox cookie files", { files });
  return files;
}

/**
 * Strategy for querying cookies from Firefox browser.
 * This class extends the BaseCookieQueryStrategy and implements Firefox-specific
 * cookie extraction logic. It searches for cookie databases in standard Firefox
 * profile locations and extracts cookies matching the specified name and domain.
 * @example
 * ```typescript
 * import { FirefoxCookieQueryStrategy } from './FirefoxCookieQueryStrategy';
 *
 * const strategy = new FirefoxCookieQueryStrategy();
 * const cookies = await strategy.queryCookies('sessionid', 'example.com');
 * console.log(cookies);
 * ```
 */
export class FirefoxCookieQueryStrategy extends BaseCookieQueryStrategy {
  /**
   * Creates a new instance of FirefoxCookieQueryStrategy
   */
  public constructor() {
    super("FirefoxCookieQueryStrategy", "Firefox");
  }

  /**
   * Check if an error indicates a database lock and provide helpful advice
   * @param error - The error to check
   * @param file - The database file that was locked
   * @returns Promise that resolves after providing advice
   * @private
   */
  private async handleDatabaseLockError(error: unknown, file: string): Promise<void> {
    if (error instanceof Error && error.message.toLowerCase().includes("database is locked")) {
      try {
        const firefoxProcesses = await isFirefoxRunning();
        if (firefoxProcesses.length > 0) {
          const advice = getBrowserConflictAdvice("firefox", firefoxProcesses);
          this.logger.warn("Firefox process conflict detected", {
            file,
            processCount: firefoxProcesses.length,
            advice
          });
        } else {
          this.logger.warn("Database locked but no Firefox processes detected", {
            file,
            suggestion: "Another process may be accessing the database"
          });
        }
      } catch (processError) {
        this.logger.debug("Failed to check Firefox processes", {
          error: processError instanceof Error ? processError.message : String(processError)
        });
      }
    }
  }

  /**
   * Executes the Firefox-specific query logic
   * @param name - The name pattern to match cookies against
   * @param domain - The domain pattern to match cookies against
   * @param store - Optional path to a specific cookie store file
   * @param _force - Whether to force operations despite warnings (e.g., locked databases)
   * @returns A promise that resolves to an array of exported cookies
   * @protected
   */
  protected async executeQuery(
    name: string,
    domain: string,
    store?: string,
    _force?: boolean,
  ): Promise<ExportedCookie[]> {
    const files = store ?? findFirefoxCookieFiles(this.logger);
    const fileList = Array.isArray(files) ? files : [files];
    const results: ExportedCookie[] = [];

    for (const file of fileList) {
      try {
        const cookies = await querySqliteThenTransform<
          FirefoxCookieRow,
          ExportedCookie
        >({
          file,
          sql: "SELECT name, value, host as domain, expiry FROM moz_cookies WHERE name = ? AND host LIKE ?",
          params: [name, `%${domain}%`],
          rowTransform: (row) => ({
            name: row.name,
            value: row.value,
            domain: row.domain,
            expiry: row.expiry > 0 ? new Date(row.expiry * 1000) : "Infinity",
            meta: {
              file,
              browser: "Firefox",
              decrypted: false,
            },
          }),
        });

        results.push(...cookies);
      } catch (error) {
        // Check for database locks and provide helpful advice
        await this.handleDatabaseLockError(error, file);
        
        if (error instanceof Error) {
          this.logger.warn(`Error reading Firefox cookie file ${file}`, {
            error: error.message,
            file,
            name,
            domain,
          });
        } else {
          this.logger.warn(`Error reading Firefox cookie file ${file}`, {
            error: String(error),
            file,
            name,
            domain,
          });
        }
      }
    }

    return results;
  }
}

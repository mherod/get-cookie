import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import fg from "fast-glob";

import type { createTaggedLogger } from "@utils/logHelpers";
import { getPlatform } from "@utils/platformUtils";
import { isFirefoxRunning } from "@utils/ProcessDetector";

import type { ExportedCookie } from "../../../types/schemas";
import { BaseCookieQueryStrategy } from "../BaseCookieQueryStrategy";
import { BrowserLockHandler } from "../BrowserLockHandler";
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

  // Fast path: Check if Firefox profile directories exist before attempting glob
  const platform = getPlatform();
  const profileDirs: string[] = [];
  const patterns: string[] = [];

  switch (platform) {
    case "darwin":
      profileDirs.push(join(home, "Library/Application Support/Firefox"));
      patterns.push(
        join(
          home,
          "Library/Application Support/Firefox/Profiles/*/cookies.sqlite",
        ),
      );
      break;
    case "win32":
      profileDirs.push(join(home, "AppData/Roaming/Mozilla/Firefox"));
      patterns.push(
        join(home, "AppData/Roaming/Mozilla/Firefox/Profiles/*/cookies.sqlite"),
      );
      break;
    case "linux":
      profileDirs.push(join(home, ".mozilla/firefox"));
      patterns.push(join(home, ".mozilla/firefox/*/cookies.sqlite"));
      break;
    default:
      logger.debug("Unsupported platform for Firefox cookie extraction", {
        platform,
      });
      return [];
  }

  const existingProfileDirs = profileDirs.filter((dir) => existsSync(dir));

  if (existingProfileDirs.length === 0) {
    logger.debug(
      "No Firefox profile directories found - Firefox may not be installed",
      {
        checked: profileDirs,
        platform,
      },
    );
    return [];
  }

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
  private lockHandler: BrowserLockHandler;

  /**
   * Creates a new instance of FirefoxCookieQueryStrategy
   */
  public constructor() {
    super("FirefoxCookieQueryStrategy", "Firefox");
    this.lockHandler = new BrowserLockHandler(this.logger, "Firefox");
  }

  /**
   * Creates the query parameters for cookie extraction
   * @param name - The cookie name to search for
   * @param domain - The domain pattern to match cookies against
   * @param file - The database file path for metadata
   * @returns Query configuration object
   * @private
   */
  private createCookieQueryConfig(
    name: string,
    domain: string,
    file: string,
  ): {
    file: string;
    sql: string;
    params: string[];
    rowTransform: (row: FirefoxCookieRow) => ExportedCookie;
  } {
    return {
      file,
      sql: "SELECT name, value, host as domain, expiry FROM moz_cookies WHERE name = ? AND host LIKE ?",
      params: [name, `%${domain}%`],
      rowTransform: (row: FirefoxCookieRow): ExportedCookie => ({
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
    };
  }

  /**
   * Handles errors that occur during cookie extraction
   * @param error - The error that occurred
   * @param file - The database file being queried
   * @param force - Whether operations are being forced
   * @param name - The cookie name being searched
   * @param domain - The domain being searched
   * @returns Promise resolving to retry configuration
   * @private
   */
  private async handleCookieExtractionError(
    error: unknown,
    file: string,
    force: boolean | undefined,
    name: string,
    domain: string,
  ): Promise<{ retryAfterClose: boolean; shouldRelaunch: boolean }> {
    const processes = await isFirefoxRunning();
    const lockResult = await this.lockHandler.handleBrowserConflict(
      error,
      file,
      processes,
      force !== true,
    );

    if (lockResult.resolved) {
      return {
        retryAfterClose: true,
        shouldRelaunch: lockResult.shouldRelaunch,
      };
    }

    this.logExtractError(error, file, name, domain);
    return { retryAfterClose: false, shouldRelaunch: false };
  }

  /**
   * Logs cookie extraction errors in a consistent format
   * @param error - The error to log
   * @param file - The file that failed
   * @param name - The cookie name
   * @param domain - The domain
   * @private
   */
  private logExtractError(
    error: unknown,
    file: string,
    name: string,
    domain: string,
  ): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.logger.warn(`Error reading Firefox cookie file ${file}`, {
      error: errorMessage,
      file,
      name,
      domain,
    });
  }

  /**
   * Performs a retry attempt after browser closure
   * @param queryConfig - The cookie query configuration
   * @param shouldRelaunch - Whether to relaunch the browser after success
   * @returns Promise resolving to extracted cookies
   * @private
   */
  private async performRetryAfterClose(
    queryConfig: ReturnType<typeof this.createCookieQueryConfig>,
    shouldRelaunch: boolean,
  ): Promise<ExportedCookie[]> {
    this.logger.info(
      "Retrying Firefox cookie extraction after browser close...",
    );

    try {
      const cookies = await querySqliteThenTransform<
        FirefoxCookieRow,
        ExportedCookie
      >(queryConfig);
      this.logger.success(
        "Successfully extracted cookies after closing Firefox",
      );

      if (shouldRelaunch) {
        await this.lockHandler.relaunchBrowser();
      }

      return cookies;
    } catch (retryError) {
      this.logger.error(
        "Failed to extract cookies even after closing Firefox",
        {
          error:
            retryError instanceof Error
              ? retryError.message
              : String(retryError),
          file: queryConfig.file,
        },
      );

      if (shouldRelaunch) {
        await this.lockHandler.relaunchBrowser();
      }

      return [];
    }
  }

  /**
   * Processes a single Firefox cookie file for the given parameters
   * @param file - The cookie file to process
   * @param name - The cookie name to search for
   * @param domain - The domain pattern to match
   * @param force - Whether to force operations despite warnings
   * @returns Promise resolving to extracted cookies from this file
   * @private
   */
  private async processCookieFile(
    file: string,
    name: string,
    domain: string,
    force?: boolean,
  ): Promise<ExportedCookie[]> {
    const queryConfig = this.createCookieQueryConfig(name, domain, file);

    try {
      return querySqliteThenTransform<FirefoxCookieRow, ExportedCookie>(
        queryConfig,
      );
    } catch (error) {
      const retryConfig = await this.handleCookieExtractionError(
        error,
        file,
        force,
        name,
        domain,
      );

      if (retryConfig.retryAfterClose) {
        return this.performRetryAfterClose(
          queryConfig,
          retryConfig.shouldRelaunch,
        );
      }

      return [];
    }
  }

  /**
   * Executes the Firefox-specific query logic
   * @param name - The name pattern to match cookies against
   * @param domain - The domain pattern to match cookies against
   * @param store - Optional path to a specific cookie store file
   * @param force - Whether to force operations despite warnings (e.g., locked databases)
   * @returns A promise that resolves to an array of exported cookies
   * @protected
   */
  protected async executeQuery(
    name: string,
    domain: string,
    store?: string,
    force?: boolean,
  ): Promise<ExportedCookie[]> {
    const files = store ?? findFirefoxCookieFiles(this.logger);
    const fileList = Array.isArray(files) ? files : [files];

    // Fast path: If no Firefox cookie files found (Firefox not installed),
    // return early to avoid unnecessary database queries and process detection
    if (fileList.length === 0) {
      this.logger.debug("No Firefox cookie files to query");
      return [];
    }

    const results: ExportedCookie[] = [];

    for (const file of fileList) {
      const cookies = await this.processCookieFile(file, name, domain, force);
      results.push(...cookies);
    }

    return results;
  }
}

import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import fg from "fast-glob";

import { isFirefoxRunning } from "@utils/ProcessDetector";
import type { createTaggedLogger } from "@utils/logHelpers";
import { getPlatform } from "@utils/platformUtils";
import { BrowserLockHandler } from "../BrowserLockHandler";

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
    force?: boolean,
  ): Promise<ExportedCookie[]> {
    const files = store ?? findFirefoxCookieFiles(this.logger);
    const fileList = Array.isArray(files) ? files : [files];

    // Fast path: If no Firefox cookie files found (Firefox not installed),
    // return early to avoid unnecessary database queries and process detection
    if (fileList.length === 0 || (fileList.length === 1 && !fileList[0])) {
      this.logger.debug("No Firefox cookie files to query");
      return [];
    }

    const results: ExportedCookie[] = [];

    for (const file of fileList) {
      let retryAfterClose = false;
      let shouldRelaunch = false;

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
        // Check for database locks and offer to close browser (only if not forcing)
        const processes = await isFirefoxRunning();
        const lockResult = await this.lockHandler.handleBrowserConflict(
          error,
          file,
          processes,
          force !== true,
        );

        // If the browser was closed, retry once
        if (lockResult.resolved) {
          retryAfterClose = true;
          shouldRelaunch = lockResult.shouldRelaunch;
        } else {
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

      // Retry if browser was closed
      if (retryAfterClose) {
        try {
          this.logger.info(
            "Retrying Firefox cookie extraction after browser close...",
          );
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
          this.logger.success(
            "Successfully extracted cookies after closing Firefox",
          );

          // Relaunch Firefox if it was closed
          if (shouldRelaunch) {
            await this.lockHandler.relaunchBrowser();
          }
        } catch (retryError) {
          this.logger.error(
            "Failed to extract cookies even after closing Firefox",
            {
              error:
                retryError instanceof Error
                  ? retryError.message
                  : String(retryError),
              file,
            },
          );

          // Still try to relaunch Firefox if needed
          if (shouldRelaunch) {
            await this.lockHandler.relaunchBrowser();
          }
        }
      }
    }

    return results;
  }
}

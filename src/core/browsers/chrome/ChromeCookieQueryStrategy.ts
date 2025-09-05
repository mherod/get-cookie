import { isChromeRunning } from "@utils/ProcessDetector";
import type { CookieRow, ExportedCookie } from "../../../types/schemas";
import { chromeTimestampToDate } from "../../../utils/chromeDates";
import { BaseCookieQueryStrategy } from "../BaseCookieQueryStrategy";
import { BrowserLockHandler } from "../BrowserLockHandler";
import { getEncryptedChromeCookie } from "../getEncryptedChromeCookie";
import { listChromeProfilePaths } from "../listChromeProfiles";

import { decrypt } from "./decrypt";
import { getChromePassword } from "./getChromePassword";

interface DecryptionContext {
  file: string;
  password: string | Buffer;
  metaVersion?: number;
}

function createExportedCookie(
  domain: string,
  name: string,
  value: string,
  expiry: number | undefined | null,
  file: string,
  decrypted: boolean,
): ExportedCookie {
  return {
    domain,
    name,
    value,
    expiry: chromeTimestampToDate(expiry),
    meta: {
      file,
      browser: "Chrome",
      decrypted,
    },
  };
}

/**
 * Strategy for querying cookies from Chrome browser.
 * This class extends the BaseCookieQueryStrategy and implements Chrome-specific
 * cookie extraction logic.
 * @example
 * ```typescript
 * const strategy = new ChromeCookieQueryStrategy();
 * const cookies = await strategy.queryCookies('session', 'example.com');
 * ```
 */
export class ChromeCookieQueryStrategy extends BaseCookieQueryStrategy {
  private lockHandler: BrowserLockHandler;

  /**
   * Creates a new instance of ChromeCookieQueryStrategy
   */
  public constructor() {
    super("ChromeCookieQueryStrategy", "Chrome");
    this.lockHandler = new BrowserLockHandler(this.logger, "Chrome");
  }

  /**
   * Executes the Chrome-specific query logic
   * @param name - The name pattern to match cookies against
   * @param domain - The domain pattern to match cookies against
   * @param store - Optional path to a specific cookie store file
   * @param _force - Whether to force operations despite warnings (e.g., locked databases)
   * @returns A promise that resolves to an array of exported cookies
   * @protected
   * @example
   * ```typescript
   * // This method is called internally by queryCookies
   * const cookies = await strategy.queryCookies('session', 'example.com');
   * console.log(cookies);
   * ```
   */
  protected async executeQuery(
    name: string,
    domain: string,
    store?: string,
    force?: boolean,
  ): Promise<ExportedCookie[]> {
    const supportedPlatforms = ["darwin", "win32", "linux"];
    if (!supportedPlatforms.includes(process.platform)) {
      this.logger.warn("Platform not supported", {
        platform: process.platform,
        supportedPlatforms,
      });
      return [];
    }

    const cookieFiles = store ?? listChromeProfilePaths();
    const files = Array.isArray(cookieFiles) ? cookieFiles : [cookieFiles];
    if (files.length === 0) {
      this.logger.warn("No Chrome cookie files found");
      return [];
    }

    const password = await getChromePassword();
    const results: ExportedCookie[] = [];

    for (const file of files) {
      let retryAfterClose = false;
      let shouldRelaunch = false;

      try {
        const cookies = await this.processFile(file, name, domain, password);
        results.push(...cookies);
      } catch (error) {
        // Check for database locks
        const processes = await isChromeRunning();
        const lockResult = await this.lockHandler.handleBrowserConflict(
          error,
          file,
          processes,
          force !== true,
        );

        if (lockResult.resolved) {
          retryAfterClose = true;
          shouldRelaunch = lockResult.shouldRelaunch;
        } else {
          if (error instanceof Error) {
            this.logger.warn(`Error reading Chrome cookie file ${file}`, {
              error: error.message,
              file,
              name,
              domain,
            });
          } else {
            this.logger.warn(`Error reading Chrome cookie file ${file}`, {
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
            "Retrying Chrome cookie extraction after browser close...",
          );
          const cookies = await this.processFile(file, name, domain, password);

          results.push(...cookies);
          this.logger.success(
            "Successfully extracted cookies after closing Chrome",
          );

          // Relaunch Chrome if it was closed
          if (shouldRelaunch) {
            await this.lockHandler.relaunchBrowser();
          }
        } catch (retryError) {
          this.logger.error(
            "Failed to extract cookies even after closing Chrome",
            {
              error:
                retryError instanceof Error
                  ? retryError.message
                  : String(retryError),
              file,
            },
          );

          // Still try to relaunch Chrome if needed
          if (shouldRelaunch) {
            await this.lockHandler.relaunchBrowser();
          }
        }
      }
    }

    return results;
  }

  private async processFile(
    file: string,
    name: string,
    domain: string,
    password: string | Buffer,
  ): Promise<ExportedCookie[]> {
    try {
      const encryptedCookies = await getEncryptedChromeCookie({
        name,
        domain,
        file,
      });

      // Get meta version from the Chrome database to determine if hash prefix should be used
      let metaVersion = 0;
      try {
        const Database = await import("better-sqlite3");
        const db = new Database.default(file, { readonly: true });
        try {
          const metaResult = db
            .prepare("SELECT value FROM meta WHERE key = ?")
            .get("version") as { value: string } | undefined;
          metaVersion = metaResult ? Number.parseInt(metaResult.value, 10) : 0;
        } finally {
          db.close();
        }
      } catch (error) {
        // If we can't get meta version, default to 0 (no hash prefix)
        this.logger.debug("Could not retrieve meta version, defaulting to 0", {
          error,
        });
      }

      const context: DecryptionContext = { file, password, metaVersion };
      const results = await Promise.allSettled(
        encryptedCookies.map((cookie) => this.processCookie(cookie, context)),
      );

      return results
        .map((result) => (result.status === "fulfilled" ? result.value : null))
        .filter((cookie): cookie is ExportedCookie => cookie !== null);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error("Failed to process cookie file", {
          error: error.message,
          file,
          name,
          domain,
        });
      } else {
        this.logger.error("Failed to process cookie file", {
          error: String(error),
          file,
          name,
          domain,
        });
      }
      return [];
    }
  }

  private async processCookie(
    cookie: CookieRow,
    context: DecryptionContext,
  ): Promise<ExportedCookie> {
    try {
      const value = Buffer.isBuffer(cookie.value)
        ? cookie.value
        : Buffer.from(String(cookie.value));

      const decryptedValue = await decrypt(
        value,
        context.password,
        context.metaVersion,
      );
      return createExportedCookie(
        cookie.domain,
        cookie.name,
        decryptedValue,
        cookie.expiry,
        context.file,
        true,
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.warn("Failed to decrypt cookie", { error });
      } else {
        this.logger.warn("Failed to decrypt cookie", { error: String(error) });
      }
      return createExportedCookie(
        cookie.domain,
        cookie.name,
        cookie.value.toString("utf-8"),
        cookie.expiry,
        context.file,
        false,
      );
    }
  }
}

import { isChromeRunning } from "@utils/ProcessDetector";

import type { CookieRow, ExportedCookie } from "../../../types/schemas";
import { chromeTimestampToDate } from "../../../utils/chromeDates";
import { BaseCookieQueryStrategy } from "../BaseCookieQueryStrategy";
import { BrowserLockHandler } from "../BrowserLockHandler";
import type { ChromiumBrowser } from "../chrome/ChromiumBrowsers";
import { decrypt } from "../chrome/decrypt";
import { getChromiumPassword } from "../chrome/getChromiumPassword";
import { CookieQueryBuilder } from "../sql/CookieQueryBuilder";
import { getGlobalConnectionManager } from "../sql/DatabaseConnectionManager";
import { getGlobalQueryMonitor } from "../sql/QueryMonitor";

interface DecryptionContext {
  file: string;
  password: string | Buffer;
  browser: string;
  metaVersion?: number;
}

/**
 * Create an exported cookie object
 * @param domain - Cookie domain
 * @param name - Cookie name
 * @param value - Cookie value
 * @param expiry - Cookie expiry timestamp
 * @param file - Source file path
 * @param browser - Browser name
 * @param decrypted - Whether the cookie was decrypted
 * @returns ExportedCookie object
 */
export function createExportedCookie(
  domain: string,
  name: string,
  value: string,
  expiry: number | undefined | null,
  file: string,
  browser: string,
  decrypted: boolean,
): ExportedCookie {
  return {
    domain,
    name,
    value,
    expiry: chromeTimestampToDate(expiry),
    meta: {
      file,
      browser,
      decrypted,
    },
  };
}

/**
 * Base strategy for querying cookies from Chromium-based browsers.
 * This abstract class provides shared logic for Chrome, Chromium, Brave, Edge, etc.
 */
export abstract class BaseChromiumCookieQueryStrategy extends BaseCookieQueryStrategy {
  protected lockHandler: BrowserLockHandler;
  protected browserDisplayName: string;
  protected browserType: ChromiumBrowser;

  /**
   * Creates a new instance of BaseChromiumCookieQueryStrategy
   * @param strategyName - Name of the strategy for logging
   * @param browserName - Display name of the browser
   * @param browserType - The Chromium browser type for password retrieval
   */
  public constructor(
    strategyName: string,
    browserName: string,
    browserType: ChromiumBrowser = "chrome",
  ) {
    super(strategyName, "Chrome"); // Use "Chrome" for base class compatibility
    this.browserDisplayName = browserName;
    this.browserType = browserType;
    this.lockHandler = new BrowserLockHandler(this.logger, "Chrome");
  }

  /**
   * Get cookie file paths for the browser
   * @param store - Optional specific store path
   * @returns Array of cookie file paths
   */
  protected abstract getCookieFilePaths(store?: string): string[];

  /**
   * Get the browser-specific display name
   * @returns Browser display name
   */
  protected getBrowserName(): string {
    return this.browserDisplayName;
  }

  /**
   * Executes the Chromium-specific query logic
   * @param name - The name pattern to match cookies against
   * @param domain - The domain pattern to match cookies against
   * @param store - Optional path to a specific cookie store file
   * @param force - Whether to force operations despite warnings
   * @returns A promise that resolves to an array of exported cookies
   */
  protected async executeQuery(
    name: string,
    domain: string,
    store?: string,
    force?: boolean,
  ): Promise<ExportedCookie[]> {
    if (!this.isPlatformSupported()) {
      return [];
    }

    const files = this.getCookieFiles(store);
    if (files.length === 0) {
      this.logger.debug(`No ${this.browserDisplayName} cookie files found`);
      return [];
    }

    try {
      const password = await getChromiumPassword(this.browserType);
      const results: ExportedCookie[] = [];

      for (const file of files) {
        const fileResults = await this.processFileWithRetry(
          file,
          name,
          domain,
          password,
          force,
        );
        results.push(...fileResults);
      }

      return results;
    } catch (error) {
      this.logger.error(`Failed to get ${this.browserDisplayName} password`, {
        error: this.getErrorMessage(error),
      });
      return [];
    }
  }

  /**
   * Check if the current platform is supported
   * @returns True if platform is supported
   */
  protected isPlatformSupported(): boolean {
    const supportedPlatforms = ["darwin", "win32", "linux"];
    if (!supportedPlatforms.includes(process.platform)) {
      this.logger.warn("Platform not supported", {
        platform: process.platform,
        supportedPlatforms,
      });
      return false;
    }
    return true;
  }

  /**
   * Get cookie files to process
   * @param store - Optional specific store path
   * @returns Array of file paths
   */
  protected getCookieFiles(store?: string): string[] {
    const cookieFiles = store ?? this.getCookieFilePaths();
    return Array.isArray(cookieFiles) ? cookieFiles : [cookieFiles];
  }

  /**
   * Convert error to string message
   * @param error - The error to convert
   * @returns Error message string
   */
  protected getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  /**
   * Process a file with retry logic for lock conflicts
   * @param file - Cookie file path
   * @param name - Cookie name pattern
   * @param domain - Domain pattern
   * @param password - Decryption password
   * @param force - Force processing
   * @returns Array of exported cookies
   */
  private async processFileWithRetry(
    file: string,
    name: string,
    domain: string,
    password: string | Buffer,
    force?: boolean,
  ): Promise<ExportedCookie[]> {
    try {
      return await this.processFile(file, name, domain, password);
    } catch (error) {
      const lockResult = await this.handleFileError(
        error,
        file,
        name,
        domain,
        force,
      );

      if (lockResult.resolved) {
        return this.retryAfterBrowserClose(
          file,
          name,
          domain,
          password,
          lockResult.shouldRelaunch,
        );
      }

      return [];
    }
  }

  /**
   * Handle file processing errors
   * @param error - The error that occurred
   * @param file - File path
   * @param name - Cookie name pattern
   * @param domain - Domain pattern
   * @param force - Whether to force operations
   * @returns Lock result indicating if resolved and should relaunch
   */
  private async handleFileError(
    error: unknown,
    file: string,
    name: string,
    domain: string,
    force?: boolean,
  ): Promise<{ resolved: boolean; shouldRelaunch: boolean }> {
    const processes = await isChromeRunning();
    const lockResult = await this.lockHandler.handleBrowserConflict(
      error,
      file,
      processes,
      force !== true,
    );

    if (!lockResult.resolved) {
      this.logger.warn(
        `Error reading ${this.browserDisplayName} cookie file ${file}`,
        {
          error: this.getErrorMessage(error),
          file,
          name,
          domain,
        },
      );
    }

    return lockResult;
  }

  /**
   * Retry after browser close
   * @param file - Cookie file path
   * @param name - Cookie name pattern
   * @param domain - Domain pattern
   * @param password - Decryption password
   * @param shouldRelaunch - Whether to relaunch browser
   * @returns Array of exported cookies
   */
  private async retryAfterBrowserClose(
    file: string,
    name: string,
    domain: string,
    password: string | Buffer,
    shouldRelaunch: boolean,
  ): Promise<ExportedCookie[]> {
    try {
      this.logger.info(
        `Retrying ${this.browserDisplayName} cookie extraction after browser close...`,
      );
      const cookies = await this.processFile(file, name, domain, password);
      this.logger.success(
        `Successfully extracted cookies after closing ${this.browserDisplayName}`,
      );

      if (shouldRelaunch) {
        await this.lockHandler.relaunchBrowser();
      }

      return cookies;
    } catch (retryError) {
      this.logger.error(
        `Failed to extract cookies even after closing ${this.browserDisplayName}`,
        {
          error: this.getErrorMessage(retryError),
          file,
        },
      );

      if (shouldRelaunch) {
        await this.lockHandler.relaunchBrowser();
      }

      return [];
    }
  }

  /**
   * Process a single cookie file
   * @param file - Cookie file path
   * @param name - Cookie name pattern
   * @param domain - Domain pattern
   * @param password - Decryption password
   * @returns Array of exported cookies
   */
  protected async processFile(
    file: string,
    name: string,
    domain: string,
    password: string | Buffer,
  ): Promise<ExportedCookie[]> {
    try {
      // Use SQL utilities directly instead of getEncryptedChromeCookie
      const connectionManager = getGlobalConnectionManager();
      const monitor = getGlobalQueryMonitor();
      const queryBuilder = new CookieQueryBuilder("chrome");

      const queryConfig = queryBuilder.buildSelectQuery({
        name,
        domain,
        browser: "chrome",
      });

      const encryptedCookies = await connectionManager.executeQuery(
        file,
        (db) => {
          const rows = monitor.executeQuery<{
            encrypted_value: Buffer;
            name: string;
            host_key: string;
            expires_utc: number;
          }>(db, queryConfig.sql, queryConfig.params, file);

          // Transform to CookieRow format
          return rows.map(
            (row): CookieRow => ({
              name: row.name,
              domain: row.host_key,
              value: row.encrypted_value,
              expiry: row.expires_utc,
            }),
          );
        },
        queryConfig.sql,
      );

      const metaVersion = await this.getMetaVersion(file);
      const context: DecryptionContext = {
        file,
        password,
        browser: this.browserDisplayName,
        metaVersion,
      };

      const results = await Promise.allSettled(
        encryptedCookies.map(async (cookie) =>
          this.processCookie(cookie, context),
        ),
      );

      return results
        .map((result) => (result.status === "fulfilled" ? result.value : null))
        .filter((cookie): cookie is ExportedCookie => cookie !== null);
    } catch (error) {
      this.logger.error(
        `Failed to process ${this.browserDisplayName} cookie file`,
        {
          error: this.getErrorMessage(error),
          file,
          name,
          domain,
        },
      );
      return [];
    }
  }

  /**
   * Get meta version from Chrome database
   * @param file - Database file path
   * @returns Meta version number
   */
  protected async getMetaVersion(file: string): Promise<number> {
    try {
      const connectionManager = getGlobalConnectionManager();
      const queryBuilder = new CookieQueryBuilder("chrome");
      const metaQuery = queryBuilder.buildMetaQuery("version");

      const metaResult = await connectionManager.executeQuery(
        file,
        (db) => {
          const stmt = db.prepare(metaQuery.sql);
          return stmt.get(...metaQuery.params) as { value: string } | undefined;
        },
        "Get meta version",
      );

      return metaResult ? Number.parseInt(metaResult.value, 10) : 0;
    } catch (error) {
      this.logger.debug("Could not retrieve meta version, defaulting to 0", {
        error: this.getErrorMessage(error),
      });
      return 0;
    }
  }

  /**
   * Process a single cookie
   * @param cookie - Cookie row from database
   * @param context - Decryption context
   * @returns Exported cookie
   */
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
        context.browser,
        true,
      );
    } catch (error) {
      this.logger.warn(`Failed to decrypt ${context.browser} cookie`, {
        error: this.getErrorMessage(error),
      });

      return createExportedCookie(
        cookie.domain,
        cookie.name,
        cookie.value.toString("utf-8"),
        cookie.expiry,
        context.file,
        context.browser,
        false,
      );
    }
  }
}

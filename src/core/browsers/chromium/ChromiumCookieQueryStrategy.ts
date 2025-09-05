import fg from "fast-glob";

import { isChromeRunning } from "@utils/ProcessDetector";

import type { CookieRow, ExportedCookie } from "../../../types/schemas";
import { chromeTimestampToDate } from "../../../utils/chromeDates";
import { BaseCookieQueryStrategy } from "../BaseCookieQueryStrategy";
import { BrowserLockHandler } from "../BrowserLockHandler";
import {
  type ChromiumBrowser,
  getChromiumBrowserPath,
} from "../chrome/ChromiumBrowsers";
import { decrypt } from "../chrome/decrypt";
import { getChromePassword } from "../chrome/getChromePassword";
import { getEncryptedChromeCookie } from "../getEncryptedChromeCookie";

interface DecryptionContext {
  file: string;
  password: string | Buffer;
  browser: ChromiumBrowser;
}

function createExportedCookie(
  domain: string,
  name: string,
  value: string,
  expiry: number | undefined | null,
  file: string,
  browser: ChromiumBrowser,
  decrypted: boolean,
): ExportedCookie {
  return {
    domain,
    name,
    value,
    expiry: chromeTimestampToDate(expiry),
    meta: {
      file,
      browser: browser.charAt(0).toUpperCase() + browser.slice(1),
      decrypted,
    },
  };
}

/**
 * Strategy for querying cookies from Chromium-based browsers (Chrome, Brave, Edge, etc.)
 * This class extends the BaseCookieQueryStrategy and implements Chromium-specific
 * cookie extraction logic that works across multiple browsers.
 */
export class ChromiumCookieQueryStrategy extends BaseCookieQueryStrategy {
  private browser: ChromiumBrowser;
  private lockHandler: BrowserLockHandler;

  /**
   * Creates a new instance of ChromiumCookieQueryStrategy
   * @param browser - The Chromium-based browser to query (chrome, brave, edge, etc.)
   */
  public constructor(browser: ChromiumBrowser = "chrome") {
    const browserName = browser.charAt(0).toUpperCase() + browser.slice(1);
    // Use "Chrome" for the base class since it expects specific browser names
    super(`${browserName}CookieQueryStrategy`, "Chrome");
    this.browser = browser;
    this.lockHandler = new BrowserLockHandler(this.logger, "Chrome");
  }

  /**
   * Lists all cookie file paths for the specified browser
   */
  private listBrowserCookiePaths(): string[] {
    try {
      const browserPath = getChromiumBrowserPath(this.browser);
      const files = fg.sync("./**/Cookies", {
        cwd: browserPath,
        absolute: true,
      });
      this.logger.debug(
        `Found ${files.length} cookie files for ${this.browser}`,
      );
      return files;
    } catch (error) {
      this.logger.warn(`Failed to find ${this.browser} cookie files`, {
        error,
      });
      return [];
    }
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
      this.logger.warn(`No ${this.browser} cookie files found`);
      return [];
    }

    try {
      const password = await getChromePassword();
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
      this.logger.error(`Failed to get ${this.browser} password`, {
        error: this.getErrorMessage(error),
      });
      return [];
    }
  }

  /**
   * Check if the current platform is supported
   * @returns True if platform is supported
   */
  private isPlatformSupported(): boolean {
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
  private getCookieFiles(store?: string): string[] {
    const cookieFiles = store ?? this.listBrowserCookiePaths();
    return Array.isArray(cookieFiles) ? cookieFiles : [cookieFiles];
  }

  /**
   * Convert error to string message
   * @param error - The error to convert
   * @returns Error message string
   */
  private getErrorMessage(error: unknown): string {
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
      // Check for database locks
      const processes = await isChromeRunning();
      const lockResult = await this.lockHandler.handleBrowserConflict(
        error,
        file,
        processes,
        force !== true,
      );

      if (lockResult.resolved) {
        try {
          this.logger.info(
            `Retrying ${this.browser} cookie extraction after browser close...`,
          );
          const cookies = await this.processFile(file, name, domain, password);

          if (lockResult.shouldRelaunch) {
            await this.lockHandler.relaunchBrowser();
          }

          return cookies;
        } catch (retryError) {
          this.logger.error(
            `Failed to extract cookies even after closing ${this.browser}`,
            {
              error: this.getErrorMessage(retryError),
              file,
            },
          );

          if (lockResult.shouldRelaunch) {
            await this.lockHandler.relaunchBrowser();
          }
        }
      } else {
        this.logger.warn(`Error reading ${this.browser} cookie file ${file}`, {
          error: this.getErrorMessage(error),
          file,
          name,
          domain,
        });
      }
    }

    return [];
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

      const context: DecryptionContext = {
        file,
        password,
        browser: this.browser,
      };
      const results = await Promise.allSettled(
        encryptedCookies.map((cookie) => this.processCookie(cookie, context)),
      );

      return results
        .map((result) => (result.status === "fulfilled" ? result.value : null))
        .filter((cookie): cookie is ExportedCookie => cookie !== null);
    } catch (error) {
      this.logger.error(`Failed to process ${this.browser} cookie file`, {
        error: this.getErrorMessage(error),
        file,
        name,
        domain,
      });
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

      const decryptedValue = await decrypt(value, context.password);
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
      this.logger.warn(`Failed to decrypt ${this.browser} cookie`, {
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

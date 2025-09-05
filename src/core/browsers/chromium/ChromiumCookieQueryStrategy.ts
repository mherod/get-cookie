import fg from "fast-glob";

import {
  type ChromiumBrowser,
  getChromiumBrowserPath,
} from "../chrome/ChromiumBrowsers";

import { BaseChromiumCookieQueryStrategy } from "./BaseChromiumCookieQueryStrategy";

/**
 * Strategy for querying cookies from Chromium-based browsers (Chrome, Brave, Edge, etc.)
 * This class extends the BaseChromiumCookieQueryStrategy with browser-specific path discovery.
 * @example
 * ```typescript
 * const strategy = new ChromiumCookieQueryStrategy('brave');
 * const cookies = await strategy.queryCookies('session', 'example.com');
 * ```
 */
export class ChromiumCookieQueryStrategy extends BaseChromiumCookieQueryStrategy {
  private browser: ChromiumBrowser;

  /**
   * Creates a new instance of ChromiumCookieQueryStrategy
   * @param browser - The Chromium-based browser to query (chrome, brave, edge, etc.)
   */
  public constructor(browser: ChromiumBrowser = "chrome") {
    const browserName = browser.charAt(0).toUpperCase() + browser.slice(1);
    super(`${browserName}CookieQueryStrategy`, browserName);
    this.browser = browser;
  }

  /**
   * Get browser-specific cookie file paths
   * @param store - Optional specific store path
   * @returns Array of cookie file paths
   */
  protected getCookieFilePaths(store?: string): string[] {
    if (store) {
      return [store];
    }

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
        error: this.getErrorMessage(error),
      });
      return [];
    }
  }
}

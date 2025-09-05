import { BaseChromiumCookieQueryStrategy } from "../chromium/BaseChromiumCookieQueryStrategy";
import { listChromeProfilePaths } from "../listChromeProfiles";

/**
 * Strategy for querying cookies from Chrome browser.
 * This class extends the BaseChromiumCookieQueryStrategy with Chrome-specific logic.
 * @example
 * ```typescript
 * const strategy = new ChromeCookieQueryStrategy();
 * const cookies = await strategy.queryCookies('session', 'example.com');
 * ```
 */
export class ChromeCookieQueryStrategy extends BaseChromiumCookieQueryStrategy {
  /**
   * Creates a new instance of ChromeCookieQueryStrategy
   */
  public constructor() {
    super("ChromeCookieQueryStrategy", "Chrome");
  }

  /**
   * Get Chrome-specific cookie file paths
   * @param store - Optional specific store path
   * @returns Array of cookie file paths
   */
  protected getCookieFilePaths(store?: string): string[] {
    if (store) {
      return [store];
    }

    const paths = listChromeProfilePaths();
    return Array.isArray(paths) ? paths : [paths];
  }
}

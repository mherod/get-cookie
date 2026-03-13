import { ChromiumCookieQueryStrategy } from "../chromium/ChromiumCookieQueryStrategy";

/**
 * Strategy for querying cookies from Chrome browser.
 * Extends ChromiumCookieQueryStrategy with Chrome as the target browser.
 * Supports optional profile-name filtering via the profileName constructor parameter.
 * @example
 * ```typescript
 * const strategy = new ChromeCookieQueryStrategy();
 * const cookies = await strategy.queryCookies('session', 'example.com');
 *
 * // With profile filtering
 * const strategy = new ChromeCookieQueryStrategy('Work');
 * const cookies = await strategy.queryCookies('session', 'example.com');
 * ```
 */
export class ChromeCookieQueryStrategy extends ChromiumCookieQueryStrategy {
  /**
   * Creates a new instance of ChromeCookieQueryStrategy
   * @param profileName - Optional specific profile name to target
   */
  public constructor(profileName?: string) {
    super("chrome", profileName);
  }
}

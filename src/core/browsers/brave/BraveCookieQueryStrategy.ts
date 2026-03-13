import { ChromiumCookieQueryStrategy } from "../chromium/ChromiumCookieQueryStrategy";

/**
 * Strategy for querying cookies from Brave browser.
 * Brave is a Chromium-based browser with standard cookie storage.
 * Supports optional profile-name filtering via the profileName constructor parameter.
 * @example
 * ```typescript
 * const strategy = new BraveCookieQueryStrategy();
 * const cookies = await strategy.queryCookies('session', 'example.com');
 * ```
 */
export class BraveCookieQueryStrategy extends ChromiumCookieQueryStrategy {
  /**
   * Creates a new instance of BraveCookieQueryStrategy
   * @param profileName - Optional specific profile name to target
   */
  public constructor(profileName?: string) {
    super("brave", profileName);
  }
}

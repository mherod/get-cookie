import { ChromiumCookieQueryStrategy } from "../chromium/ChromiumCookieQueryStrategy";

/**
 * Strategy for querying cookies from Microsoft Edge browser.
 * Edge is Chromium-based and uses the same cookie storage format as Chrome.
 * Supports optional profile-name filtering via the profileName constructor parameter.
 * @example
 * ```typescript
 * const strategy = new EdgeCookieQueryStrategy();
 * const cookies = await strategy.queryCookies('session', 'example.com');
 * ```
 */
export class EdgeCookieQueryStrategy extends ChromiumCookieQueryStrategy {
  /**
   * Creates a new instance of EdgeCookieQueryStrategy
   * @param profileName - Optional specific profile name to target
   */
  public constructor(profileName?: string) {
    super("edge", profileName);
  }
}

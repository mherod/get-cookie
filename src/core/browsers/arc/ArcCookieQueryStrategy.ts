import { ChromiumCookieQueryStrategy } from "../chromium/ChromiumCookieQueryStrategy";

/**
 * Strategy for querying cookies from Arc browser.
 * Arc is a Chromium-based browser with unique features but standard cookie storage.
 * Supports optional profile-name filtering via the profileName constructor parameter.
 * @example
 * ```typescript
 * const strategy = new ArcCookieQueryStrategy();
 * const cookies = await strategy.queryCookies('session', 'example.com');
 * ```
 */
export class ArcCookieQueryStrategy extends ChromiumCookieQueryStrategy {
  /**
   * Creates a new instance of ArcCookieQueryStrategy
   * @param profileName - Optional specific profile name to target
   */
  public constructor(profileName?: string) {
    super("arc", profileName);
  }
}

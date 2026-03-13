import { ChromiumCookieQueryStrategy } from "../chromium/ChromiumCookieQueryStrategy";

/**
 * Strategy for querying cookies from Opera browser.
 * Opera is a Chromium-based browser with its own keychain entry.
 * Supports optional profile-name filtering via the profileName constructor parameter.
 * @example
 * ```typescript
 * const strategy = new OperaCookieQueryStrategy();
 * const cookies = await strategy.queryCookies('session', 'example.com');
 * ```
 */
export class OperaCookieQueryStrategy extends ChromiumCookieQueryStrategy {
  /**
   * Creates a new instance of OperaCookieQueryStrategy
   * @param profileName - Optional specific profile name to target
   */
  public constructor(profileName?: string) {
    super("opera", profileName);
  }
}

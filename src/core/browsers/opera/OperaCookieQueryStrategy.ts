import { ChromiumCookieQueryStrategy } from "../chromium/ChromiumCookieQueryStrategy";

/**
 * Strategy for querying cookies from Opera browser.
 * Opera is a Chromium-based browser with its own keychain entry.
 * @example
 * ```typescript
 * const strategy = new OperaCookieQueryStrategy();
 * const cookies = await strategy.queryCookies('session', 'example.com');
 * ```
 */
export class OperaCookieQueryStrategy extends ChromiumCookieQueryStrategy {
  /**
   * Creates a new instance of OperaCookieQueryStrategy
   */
  public constructor() {
    super("opera");
  }
}

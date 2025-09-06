import { ChromiumCookieQueryStrategy } from "../chromium/ChromiumCookieQueryStrategy";

/**
 * Strategy for querying cookies from Microsoft Edge browser.
 * Edge is Chromium-based and uses the same cookie storage format as Chrome.
 * @example
 * ```typescript
 * const strategy = new EdgeCookieQueryStrategy();
 * const cookies = await strategy.queryCookies('session', 'example.com');
 * ```
 */
export class EdgeCookieQueryStrategy extends ChromiumCookieQueryStrategy {
  /**
   * Creates a new instance of EdgeCookieQueryStrategy
   */
  public constructor() {
    super("edge");
  }
}

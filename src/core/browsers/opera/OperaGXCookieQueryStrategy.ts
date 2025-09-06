import { ChromiumCookieQueryStrategy } from "../chromium/ChromiumCookieQueryStrategy";

/**
 * Strategy for querying cookies from Opera GX browser.
 * Opera GX is the gaming-focused variant of Opera, sharing the same keychain entry.
 *
 * @example
 * ```typescript
 * const strategy = new OperaGXCookieQueryStrategy();
 * const cookies = await strategy.queryCookies('session', 'example.com');
 * ```
 */
export class OperaGXCookieQueryStrategy extends ChromiumCookieQueryStrategy {
  /**
   * Creates a new instance of OperaGXCookieQueryStrategy
   */
  public constructor() {
    super("opera-gx");
  }
}

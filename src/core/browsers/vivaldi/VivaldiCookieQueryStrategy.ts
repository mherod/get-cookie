import { ChromiumCookieQueryStrategy } from "../chromium/ChromiumCookieQueryStrategy";

/**
 * Strategy for querying cookies from Vivaldi browser.
 * Vivaldi is a Chromium-based browser with standard cookie storage.
 * Supports optional profile-name filtering via the profileName constructor parameter.
 * @example
 * ```typescript
 * const strategy = new VivaldiCookieQueryStrategy();
 * const cookies = await strategy.queryCookies('session', 'example.com');
 * ```
 */
export class VivaldiCookieQueryStrategy extends ChromiumCookieQueryStrategy {
  /**
   * Creates a new instance of VivaldiCookieQueryStrategy
   * @param profileName - Optional specific profile name to target
   */
  public constructor(profileName?: string) {
    super("vivaldi", profileName);
  }
}

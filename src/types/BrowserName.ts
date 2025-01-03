/**
 * Valid browser names in the application
 *
 * @example
 * // Type usage in function parameters
 * function getBrowserCookies(browser: BrowserName): Promise<Cookie[]> {
 *   switch (browser) {
 *     case 'Chrome':
 *       return getChromeCookies();
 *     case 'Firefox':
 *       return getFirefoxCookies();
 *     case 'Safari':
 *       return getSafariCookies();
 *     case 'internal':
 *       return getInternalCookies();
 *     default:
 *       return Promise.resolve([]);
 *   }
 * }
 *
 * // Type checking
 * const validBrowser: BrowserName = 'Chrome'; // OK
 * const invalidBrowser: BrowserName = 'Edge'; // Type error
 *
 * // Use in object properties
 * interface CookieSource {
 *   browser: BrowserName;
 *   profile: string;
 * }
 */
export type BrowserName =
  | "Chrome"
  | "Firefox"
  | "Safari"
  | "internal"
  | "unknown";

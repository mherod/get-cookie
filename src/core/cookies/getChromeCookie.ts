import type { CookieSpec } from "../../types/CookieSpec";
import type { ExportedCookie } from "../../types/ExportedCookie";
import logger from "../../utils/logger";
import { ChromeCookieQueryStrategy } from "../browsers/chrome/ChromeCookieQueryStrategy";

/**
 * Retrieves cookies from Chrome browser storage that match the specified criteria.
 * @param cookieSpec - The cookie specification containing search criteria
 * @param cookieSpec.name - The name of the cookie to search for
 * @param cookieSpec.domain - (optional) The domain to filter cookies by
 * @returns An array of ExportedCookie objects that match the specification
 * @throws Will catch and handle any errors during cookie querying, logging a warning
 * to the console without throwing to the caller
 * @example
 * ```typescript
 * // Get all cookies named "sessionId" from Chrome
 * const cookies = await getChromeCookie({ name: "sessionId" });
 *
 * // Get cookies named "userPref" from specific domain in Chrome
 * const domainCookies = await getChromeCookie({
 *   name: "userPref",
 *   domain: "example.com"
 * });
 * ```
 */
export async function getChromeCookie(
  cookieSpec: CookieSpec,
): Promise<ExportedCookie[]> {
  try {
    const strategy = new ChromeCookieQueryStrategy();
    const cookies = await strategy.queryCookies(
      cookieSpec.name,
      cookieSpec.domain,
    );
    return cookies;
  } catch (error: unknown) {
    logger.warn("Error querying Chrome cookies:", error);
    return [];
  }
}

/**
 * Default export of the getChromeCookie function.
 * @example
 * ```typescript
 * import getChromeCookie from './getChromeCookie';
 * const cookies = await getChromeCookie({
 *   name: "sessionId",
 *   domain: "example.com"
 * });
 * ```
 */
export default getChromeCookie;

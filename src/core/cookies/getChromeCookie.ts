import type { CookieSpec } from "../../types/CookieSpec";
import type { ExportedCookie } from "../../types/ExportedCookie";
import { ChromeCookieQueryStrategy } from "../browsers/chrome/ChromeCookieQueryStrategy";

/**
 * Retrieves cookies from Chrome browser storage that match the specified criteria.
 * @param cookieSpec - The cookie specification containing search criteria:
 *                     - name: The name of the cookie to search for
 *                     - domain: (optional) The domain to filter cookies by
 * @returns An array of ExportedCookie objects that match the specification.
 *          Returns an empty array if no matches are found or if an error occurs.
 * @throws Will catch and handle any errors during cookie querying, logging a warning
 *         to the console without throwing to the caller.
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
export async function getChromeCookie(cookieSpec: CookieSpec): Promise<ExportedCookie[]> {
  try {
    const strategy = new ChromeCookieQueryStrategy();
    const cookies = await strategy.queryCookies(cookieSpec.name, cookieSpec.domain);
    return cookies;
  } catch (error) {
    console.warn("Error querying Chrome cookies:", error);
    return [];
  }
}

/**
 * Default export of the getChromeCookie function
 */
export default getChromeCookie;

import type { CookieSpec } from "../../types/CookieSpec";
import type { ExportedCookie } from "../../types/ExportedCookie";
import { FirefoxCookieQueryStrategy } from "../browsers/firefox/FirefoxCookieQueryStrategy";

/**
 * Retrieves cookies from Firefox browser storage that match the specified criteria.
 * @param cookieSpec - The cookie specification containing search criteria:
 *                     - name: The name of the cookie to search for
 *                     - domain: (optional) The domain to filter cookies by
 * @returns An array of ExportedCookie objects that match the specification.
 *          Returns an empty array if no matches are found or if an error occurs.
 * @throws Will catch and handle any errors during cookie querying, logging a warning
 *         to the console without throwing to the caller.
 * @example
 * ```typescript
 * // Get all cookies named "sessionId" from Firefox
 * const cookies = await getFirefoxCookie({ name: "sessionId" });
 *
 * // Get cookies named "userPref" from specific domain in Firefox
 * const domainCookies = await getFirefoxCookie({
 *   name: "userPref",
 *   domain: "example.com"
 * });
 * ```
 */
export async function getFirefoxCookie(cookieSpec: CookieSpec): Promise<ExportedCookie[]> {
  try {
    const strategy = new FirefoxCookieQueryStrategy();
    const cookies = await strategy.queryCookies(cookieSpec.name, cookieSpec.domain);
    return cookies;
  } catch (error) {
    console.warn("Error querying Firefox cookies:", error);
    return [];
  }
}

/**
 * Default export of the getFirefoxCookie function
 */
export default getFirefoxCookie;

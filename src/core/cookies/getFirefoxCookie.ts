import type { CookieSpec } from "../../types/CookieSpec";
import type { ExportedCookie } from "../../types/ExportedCookie";
import logger from "../../utils/logger";
import { FirefoxCookieQueryStrategy } from "../browsers/firefox/FirefoxCookieQueryStrategy";

/**
 * Retrieves cookies from Firefox browser storage that match the specified criteria.
 *
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
 *
 * // Get authentication cookies from a specific subdomain
 * const authCookies = await getFirefoxCookie({
 *   name: "auth_token",
 *   domain: "auth.myapp.com"
 * });
 *
 * // Get tracking cookies from any .com domain
 * const trackingCookies = await getFirefoxCookie({
 *   name: "_ga",
 *   domain: ".com"
 * });
 * ```
 */
export async function getFirefoxCookie(
  cookieSpec: CookieSpec,
): Promise<ExportedCookie[]> {
  try {
    const strategy = new FirefoxCookieQueryStrategy();
    const cookies = await strategy.queryCookies(
      cookieSpec.name,
      cookieSpec.domain,
    );
    return cookies;
  } catch (error: unknown) {
    logger.warn(
      "Error querying Firefox cookies:",
      error instanceof Error ? error.message : String(error),
    );
    return [];
  }
}

/**
 * Default export of the getFirefoxCookie function
 *
 * @example
 * ```typescript
 * import getFirefoxCookie from './getFirefoxCookie';
 *
 * // Get all session cookies
 * const sessionCookies = await getFirefoxCookie({ name: "PHPSESSID" });
 *
 * // Get cookies from multiple domains
 * const promises = [
 *   getFirefoxCookie({ name: "token", domain: "api.example.com" }),
 *   getFirefoxCookie({ name: "token", domain: "auth.example.com" })
 * ];
 * const [apiCookies, authCookies] = await Promise.all(promises);
 * ```
 */
export default getFirefoxCookie;

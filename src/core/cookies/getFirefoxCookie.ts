import type { CookieSpec, ExportedCookie } from "../../types/schemas";
import logger from "../../utils/logger";
import { FirefoxCookieQueryStrategy } from "../browsers/firefox/FirefoxCookieQueryStrategy";

/**
 * Retrieves cookies from Firefox browser storage that match the specified criteria.
 * @param cookieSpec - The cookie specification containing search criteria
 * @param cookieSpec.name - The name of the cookie to search for
 * @param cookieSpec.domain - (optional) The domain to filter cookies by
 * @returns An array of ExportedCookie objects that match the specification
 * @throws Will catch and handle any errors during cookie querying, logging a warning
 * to the console without throwing to the caller
 * @example
 * ```typescript
 * import { getFirefoxCookie } from "@mherod/get-cookie";
 *
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
 * Default export of the getFirefoxCookie function.
 * @example
 * ```typescript
 * import { getFirefoxCookie } from "@mherod/get-cookie";
 * const sessionCookies = await getFirefoxCookie({
 *   name: "PHPSESSID",
 *   domain: "example.com"
 * });
 * ```
 */
export default getFirefoxCookie;

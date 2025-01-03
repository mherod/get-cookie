import type { CookieSpec } from "../../types/CookieSpec";
import type { ExportedCookie } from "../../types/ExportedCookie";
import logger from "../../utils/logger";

import { queryCookies } from "./queryCookies";

/**
 * Retrieves browser cookies that match the specified cookie name and domain criteria.
 * This function provides a way to search and filter cookies based on given specifications.
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
 * // Get all cookies named "sessionId"
 * const cookies = await getCookie({ name: "sessionId" });
 * // Returns: [{ name: "sessionId", value: "abc123", domain: ".example.com", ... }]
 *
 * // Get cookies named "userPref" from specific domain
 * const domainCookies = await getCookie({
 *   name: "userPref",
 *   domain: "example.com"
 * });
 * // Returns: [{ name: "userPref", value: "darkMode", domain: "example.com", ... }]
 *
 * // Get cookies with partial domain match
 * const subdomainCookies = await getCookie({
 *   name: "tracking",
 *   domain: ".example.com"
 * });
 * // Returns cookies from example.com and its subdomains
 * ```
 */
export async function getCookie(
  cookieSpec: CookieSpec,
): Promise<ExportedCookie[]> {
  try {
    const cookies = await queryCookies(cookieSpec);
    return cookies;
  } catch (error: unknown) {
    logger.warn(
      "Error querying cookies:",
      error instanceof Error ? error.message : String(error),
    );
    return [];
  }
}

/**
 * Default export of the getCookie function
 *
 * @example
 * ```typescript
 * import getCookie from './getCookie';
 *
 * // Get authentication cookies
 * const authCookies = await getCookie({
 *   name: "auth-token",
 *   domain: "api.example.com"
 * });
 *
 * // Get all preference cookies across domains
 * const prefCookies = await getCookie({ name: "preferences" });
 * ```
 */
export default getCookie;
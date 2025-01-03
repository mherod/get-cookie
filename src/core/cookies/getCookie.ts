import type { CookieSpec } from "../../types/CookieSpec";
import type { ExportedCookie } from "../../types/ExportedCookie";

import { queryCookies } from "./queryCookies";

/**
 * Retrieves browser cookies that match the specified cookie name and domain criteria.
 * This function provides a way to search and filter cookies based on given specifications.
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
 * 
 * // Get cookies named "userPref" from specific domain
 * const domainCookies = await getCookie({ 
 *   name: "userPref",
 *   domain: "example.com"
 * });
 * ```
 */
export async function getCookie(cookieSpec: CookieSpec): Promise<ExportedCookie[]> {
  try {
    const cookies = await queryCookies(cookieSpec);
    return cookies;
  } catch (error) {
    console.warn("Error querying cookies:", error);
    return [];
  }
}

/**
 * Default export of the getCookie function
 */
export default getCookie;

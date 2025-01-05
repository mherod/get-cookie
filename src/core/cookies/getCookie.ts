import type { CookieSpec, ExportedCookie } from "../../types/schemas";
import logger from "../../utils/logger";

import { queryCookies } from "./queryCookies";

/**
 * Retrieves browser cookies that match the specified cookie name and domain criteria.
 * This function provides a way to search and filter cookies based on given specifications.
 * @param cookieSpecOrDomain - Either a domain string or a cookie specification containing search criteria
 * @param cookieSpecOrDomain.name - When using object form: The name of the cookie to search for
 * @param cookieSpecOrDomain.domain - When using object form: The domain to filter cookies by
 * @returns An array of ExportedCookie objects that match the specification
 * @throws Will catch and handle any errors during cookie querying, logging a warning
 * to the console without throwing to the caller
 * @example
 * ```typescript
 * import { getCookie } from "@mherod/get-cookie";
 *
 * // Get all cookies for a domain using string parameter
 * const cookies = await getCookie("example.com");
 * // Returns: [{ name: "sessionId", value: "abc123", domain: ".example.com", ... }]
 *
 * // Get cookies named "userPref" from specific domain using object parameter
 * const domainCookies = await getCookie({
 *   name: "userPref",
 *   domain: "example.com"
 * });
 * // Returns: [{ name: "userPref", value: "darkMode", domain: "example.com", ... }]
 * ```
 */
export async function getCookie(
  cookieSpecOrDomain: CookieSpec | string,
): Promise<ExportedCookie[]> {
  try {
    const cookieSpec: CookieSpec =
      typeof cookieSpecOrDomain === "string"
        ? { name: "%", domain: cookieSpecOrDomain }
        : cookieSpecOrDomain;

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
 * Default export of the getCookie function.
 * @example
 * ```typescript
 * import { getCookie } from "@mherod/get-cookie";
 *
 * // Using string parameter
 * const allCookies = await getCookie("example.com");
 *
 * // Using object parameter
 * const authCookies = await getCookie({
 *   name: "auth-token",
 *   domain: "api.example.com"
 * });
 * ```
 */
export default getCookie;

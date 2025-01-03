import type { RenderOptions } from "../../types/CookieRender";
import type { CookieSpec } from "../../types/CookieSpec";
import logger from "../../utils/logger";

import { getCookie } from "./getCookie";
import { renderCookies } from "./renderCookies";

/**
 * Retrieves and renders cookies in a merged format.
 *
 * @param cookieSpec - The cookie specification containing search criteria:
 *                     - name: The name of the cookie to search for
 *                     - domain: (optional) The domain to filter cookies by
 * @param options - Options for rendering the cookies:
 *                 - showFilePaths: Whether to include file paths in the output
 *                 - separator: Custom separator for cookie values
 * @returns A string containing all cookie values merged with the specified separator.
 *          Returns an empty string if no cookies are found or if an error occurs.
 * @example
 * ```typescript
 * // Basic usage - get all cookies named "sessionId"
 * const cookies = await getMergedRenderedCookies({ name: "sessionId" });
 *
 * // Get cookies with domain filter
 * const domainCookies = await getMergedRenderedCookies({
 *   name: "userPref",
 *   domain: "example.com"
 * });
 *
 * // Get cookies with custom separator and file paths
 * const detailedCookies = await getMergedRenderedCookies(
 *   { name: "tracking" },
 *   {
 *     separator: " | ",
 *     showFilePaths: true
 *   }
 * );
 *
 * // Get cookies with partial domain match
 * const subdomainCookies = await getMergedRenderedCookies({
 *   name: "auth",
 *   domain: ".example.com" // Matches example.com and subdomains
 * });
 * ```
 */
export async function getMergedRenderedCookies(
  cookieSpec: CookieSpec,
  options: Omit<RenderOptions, "format"> = {},
): Promise<string> {
  try {
    const cookies = await getCookie(cookieSpec);
    return renderCookies(cookies, { ...options, format: "merged" }) as string;
  } catch (error: unknown) {
    logger.warn(
      "Error getting merged rendered cookies:",
      error instanceof Error ? error.message : String(error),
    );
    return "";
  }
}

/**
 * Default export of the getMergedRenderedCookies function
 *
 * @example
 * ```typescript
 * import getMergedRenderedCookies from './getMergedRenderedCookies';
 *
 * // Get all authentication cookies across domains
 * const authCookies = await getMergedRenderedCookies({ name: "auth" });
 *
 * // Get cookies with specific options
 * const formattedCookies = await getMergedRenderedCookies(
 *   { name: "preferences" },
 *   { separator: "\n", showFilePaths: true }
 * );
 * ```
 */
export default getMergedRenderedCookies;

import type { RenderOptions } from "../../types/CookieRender";
import type { CookieSpec } from "../../types/CookieSpec";

import { getCookie } from "./getCookie";
import { renderCookies } from "./renderCookies";

/**
 * Retrieves and renders cookies in a merged format.
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
 * // Get all cookies named "sessionId" merged into a single string
 * const cookies = await getMergedRenderedCookies({ name: "sessionId" });
 *
 * // Get cookies named "userPref" from specific domain, merged with custom separator
 * const domainCookies = await getMergedRenderedCookies({
 *   name: "userPref",
 *   domain: "example.com"
 * }, { separator: ", " });
 * ```
 */
export async function getMergedRenderedCookies(
  cookieSpec: CookieSpec,
  options: Omit<RenderOptions, "format"> = {}
): Promise<string> {
  try {
    const cookies = await getCookie(cookieSpec);
    return renderCookies(cookies, { ...options, format: "merged" }) as string;
  } catch (error) {
    console.warn("Error getting merged rendered cookies:", error);
    return "";
  }
}

/**
 * Default export of the getMergedRenderedCookies function
 */
export default getMergedRenderedCookies;

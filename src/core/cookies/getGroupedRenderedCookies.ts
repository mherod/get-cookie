import type { RenderOptions } from "../../types/CookieRender";
import type { CookieSpec } from "../../types/CookieSpec";

import { getCookie } from "./getCookie";
import { renderCookies } from "./renderCookies";

/**
 * Retrieves and renders cookies in a grouped format based on their source files.
 * @param cookieSpec - The cookie specification containing search criteria:
 *                     - name: The name of the cookie to search for
 *                     - domain: (optional) The domain to filter cookies by
 * @param options - Options for rendering the cookies:
 *                 - showFilePaths: Whether to include file paths in the output
 *                 - separator: Custom separator for cookie values
 * @returns An array of strings, each representing a group of cookies from a source file.
 *          Returns an empty array if no cookies are found or if an error occurs.
 * @example
 * ```typescript
 * // Get all cookies named "sessionId" grouped by source file
 * const cookies = await getGroupedRenderedCookies({ name: "sessionId" });
 *
 * // Get cookies named "userPref" from specific domain, grouped by source file
 * const domainCookies = await getGroupedRenderedCookies({
 *   name: "userPref",
 *   domain: "example.com"
 * });
 * ```
 */
export async function getGroupedRenderedCookies(
  cookieSpec: CookieSpec,
  options: Omit<RenderOptions, "format"> = {}
): Promise<string[]> {
  try {
    const cookies = await getCookie(cookieSpec);
    return renderCookies(cookies, { ...options, format: "grouped" }) as string[];
  } catch (error) {
    console.warn("Error getting grouped rendered cookies:", error);
    return [];
  }
}

/**
 * Default export of the getGroupedRenderedCookies function
 */
export default getGroupedRenderedCookies;

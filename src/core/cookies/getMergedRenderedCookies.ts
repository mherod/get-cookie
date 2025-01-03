import type { RenderOptions } from "../../types/CookieRender";
import type { CookieSpec } from "../../types/CookieSpec";
import logger from "../../utils/logger";

import { getCookie } from "./getCookie";
import { renderCookies } from "./renderCookies";

/**
 * Retrieves and renders cookies in a merged format.
 * @param cookieSpec - The cookie specification containing search criteria
 * @param cookieSpec.name - The name of the cookie to search for
 * @param cookieSpec.domain - (optional) The domain to filter cookies by
 * @param options - Options for rendering the cookies
 * @param options.showFilePaths - Whether to include file paths in the output
 * @param options.separator - Custom separator for cookie values
 * @returns A string containing all cookie values merged with the specified separator
 * @example
 * ```typescript
 * const cookies = await getMergedRenderedCookies({
 *   name: "sessionId",
 *   domain: "example.com"
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
 * Default export of the getMergedRenderedCookies function.
 * @example
 * ```typescript
 * import { getMergedRenderedCookies } from './getMergedRenderedCookies';
 * const cookies = await getMergedRenderedCookies({
 *   name: 'sessionId',
 *   domain: 'example.com'
 * });
 * ```
 */
export default getMergedRenderedCookies;

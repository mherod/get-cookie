import type {
  RenderOptions,
  CookieSpec,
  ExportedCookie,
} from "../../types/schemas";
import { ExportedCookieSchema } from "../../types/schemas";
import logger from "../../utils/logger";

import { getCookie } from "./getCookie";
import { renderCookies } from "./renderCookies";

/**
 * Retrieves and renders cookies in a merged format
 * @param cookieSpec - The cookie specification to query
 * @param options - Optional rendering options
 * @returns Promise resolving to rendered cookie string
 * @example
 * ```typescript
 * const cookieString = await getMergedRenderedCookies(
 *   { name: 'session', domain: 'example.com' },
 *   { separator: '; ' }
 * );
 * console.log(cookieString); // "session=abc123; auth=xyz789"
 * ```
 */
export async function getMergedRenderedCookies(
  cookieSpec: CookieSpec,
  options?: Omit<RenderOptions, "format">,
): Promise<string> {
  try {
    const cookies = await getCookie(cookieSpec);
    if (!Array.isArray(cookies)) {
      return "";
    }

    // Validate each cookie against the schema
    const validatedCookies = cookies.filter(
      (cookie): cookie is ExportedCookie => {
        const result = ExportedCookieSchema.safeParse(cookie);
        if (!result.success) {
          logger.warn("Invalid cookie format:", result.error.format());
          return false;
        }
        return true;
      },
    );

    const result = renderCookies(validatedCookies, {
      ...options,
      format: "merged",
    });
    return typeof result === "string" ? result : "";
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

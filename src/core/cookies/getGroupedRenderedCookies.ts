import type {
  CookieSpec,
  ExportedCookie,
  RenderOptions,
} from "../../types/schemas";
import { ExportedCookieSchema } from "../../types/schemas";
import logger from "../../utils/logger";

import { getCookie } from "./getCookie";
import { renderCookies } from "./renderCookies";

/**
 * Retrieves and renders cookies in a grouped format based on their source files.
 * @param cookieSpec - The cookie specification containing search criteria
 * @param cookieSpec.name - The name of the cookie to search for
 * @param cookieSpec.domain - (optional) The domain to filter cookies by
 * @param options - Options for rendering the cookies
 * @param options.showFilePaths - Whether to include file paths in the output
 * @param options.separator - Custom separator for cookie values
 * @returns An array of strings, each representing a group of cookies from a source file
 * @example
 * ```typescript
 * // Basic usage - get all cookies named "sessionId" grouped by source file
 * const cookies = await getGroupedRenderedCookies({ name: "sessionId" });
 *
 * // Get cookies with domain filter and custom rendering options
 * const domainCookies = await getGroupedRenderedCookies(
 *   {
 *     name: "userPref",
 *     domain: "example.com"
 *   },
 *   {
 *     showFilePaths: true,
 *     separator: " | "
 *   }
 * );
 * ```
 */
export async function getGroupedRenderedCookies(
  cookieSpec: CookieSpec,
  options: Omit<RenderOptions, "format"> = {},
): Promise<string[]> {
  try {
    const cookies = await getCookie(cookieSpec);
    if (!Array.isArray(cookies)) {
      return [];
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

    return renderCookies(validatedCookies, {
      ...options,
      format: "grouped",
    }) as string[];
  } catch (error: unknown) {
    logger.warn(
      "Error getting grouped rendered cookies:",
      error instanceof Error ? error.message : String(error),
    );
    return [];
  }
}

/**
 * Default export of the getGroupedRenderedCookies function
 * @example
 * ```typescript
 * import getGroupedCookies from './getGroupedRenderedCookies';
 *
 * // Get all session cookies with custom separator
 * const sessionCookies = await getGroupedCookies(
 *   { name: "session_*" },
 *   { separator: "\n" }
 * );
 *
 * // Get cookies from multiple domains
 * const multiDomainCookies = await getGroupedCookies({
 *   name: "tracking",
 *   domain: ["site1.com", "site2.com"]
 * });
 * ```
 */
export default getGroupedRenderedCookies;

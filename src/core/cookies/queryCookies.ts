import type { CookieSpec, ExportedCookie } from "../../types/schemas";
import { ChromeCookieQueryStrategy } from "../browsers/chrome/ChromeCookieQueryStrategy";
import { FirefoxCookieQueryStrategy } from "../browsers/firefox/FirefoxCookieQueryStrategy";
import { SafariCookieQueryStrategy } from "../browsers/safari/SafariCookieQueryStrategy";

/**
 * Queries cookies from all available browser strategies (Chrome, Firefox, Safari).
 * This function acts as a unified interface to retrieve cookies across different browsers.
 * @param cookieSpec - The cookie specification to query
 * @param cookieSpec.name - The name pattern to match cookies against (can include '%' as wildcard)
 * @param cookieSpec.domain - The domain to match cookies against
 * @returns Promise resolving to array of exported cookies from all available browsers
 * @remarks
 * - Returns empty array if cookieSpec is invalid or missing required fields
 * - Aggregates results from all available browser strategies
 * - Failed browser queries are gracefully handled and excluded from results
 * - Both name and domain fields are required and must be strings
 * @example
 * ```typescript
 * const cookies = await queryCookies({
 *   name: 'sessionId',
 *   domain: 'example.com'
 * });
 * console.log(cookies); // Array of matching cookies from all browsers
 * ```
 */
export async function queryCookies(
  cookieSpec: CookieSpec,
): Promise<ExportedCookie[]> {
  if (!cookieSpec.name || !cookieSpec.domain) {
    return [];
  }

  const { name, domain } = cookieSpec;
  if (typeof name !== "string" || typeof domain !== "string") {
    return [];
  }

  /**
   * Initialize all available browser-specific strategies
   * The order of strategies can affect performance but not functionality
   * Each strategy is responsible for its own error handling
   */
  const strategies = [
    new ChromeCookieQueryStrategy(),
    new FirefoxCookieQueryStrategy(),
    new SafariCookieQueryStrategy(),
  ];

  /**
   * Query all strategies in parallel and handle failures gracefully
   * Using Promise.allSettled ensures that failures in one strategy
   * don't prevent results from other strategies
   */
  const results = await Promise.allSettled(
    strategies.map(async (strategy) => strategy.queryCookies(name, domain)),
  );

  /**
   * Filter out failed promises and flatten successful results
   * Using PromiseFulfilledResult<ExportedCookie[]> ensures that only successful results are included
   */
  return results
    .filter(
      (result): result is PromiseFulfilledResult<ExportedCookie[]> =>
        result.status === "fulfilled",
    )
    .flatMap((result) => result.value);
}

/**
 * Default export of the queryCookies function.
 * This is the recommended way to import the function for most use cases.
 * @example
 * ```typescript
 * import queryCookies from './queryCookies';
 *
 * // Query cookies with specific name
 * const sessionCookies = await queryCookies({
 *   name: 'sessionId',
 *   domain: 'example.com'
 * });
 *
 * // Query all cookies for a domain using wildcard
 * const allCookies = await queryCookies({
 *   name: '%',
 *   domain: 'example.com'
 * });
 * ```
 */
export default queryCookies;

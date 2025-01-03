import type { CookieSpec } from "../../types/CookieSpec";
import type { ExportedCookie } from "../../types/ExportedCookie";
import { ChromeCookieQueryStrategy } from "../browsers/chrome/ChromeCookieQueryStrategy";
import { FirefoxCookieQueryStrategy } from "../browsers/firefox/FirefoxCookieQueryStrategy";

/**
 * Queries cookies from both Chrome and Firefox browsers.
 * @param cookieSpec - The cookie specification containing search criteria
 * @param cookieSpec.name - The name of the cookie to search for
 * @param cookieSpec.domain - (optional) The domain to filter cookies by
 * @returns An array of ExportedCookie objects that match the specification
 * @example
 * ```typescript
 * const cookies = await queryCookies({
 *   name: 'sessionId',
 *   domain: 'example.com'
 * });
 * ```
 */
export async function queryCookies(
  cookieSpec: CookieSpec,
): Promise<ExportedCookie[]> {
  const strategies = [
    new ChromeCookieQueryStrategy(),
    new FirefoxCookieQueryStrategy(),
  ];

  const results = await Promise.allSettled(
    strategies.map((strategy) =>
      strategy.queryCookies(cookieSpec.name, cookieSpec.domain),
    ),
  );

  return results
    .filter(
      (result): result is PromiseFulfilledResult<ExportedCookie[]> =>
        result.status === "fulfilled",
    )
    .flatMap((result) => result.value);
}

/**
 * Default export of the queryCookies function.
 * @example
 * ```typescript
 * import { queryCookies } from './queryCookies';
 * const cookies = await queryCookies({
 *   name: 'sessionId',
 *   domain: 'example.com'
 * });
 * ```
 */
export default queryCookies;

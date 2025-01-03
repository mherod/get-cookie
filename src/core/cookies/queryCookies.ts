import type { CookieSpec } from "../../types/CookieSpec";
import type { ExportedCookie } from "../../types/ExportedCookie";
import { ChromeCookieQueryStrategy } from "../browsers/chrome/ChromeCookieQueryStrategy";
import { FirefoxCookieQueryStrategy } from "../browsers/firefox/FirefoxCookieQueryStrategy";

/**
 * Queries cookies from both Chrome and Firefox browsers.
 *
 * @param cookieSpec - The cookie specification containing search criteria:
 *                     - name: The name of the cookie to search for
 *                     - domain: (optional) The domain to filter cookies by
 * @returns An array of ExportedCookie objects that match the specification.
 *          Returns an empty array if no matches are found or if an error occurs.
 * @example
 * ```typescript
 * // Get all cookies named "sessionId" from all browsers
 * const cookies = await queryCookies({ name: "sessionId" });
 *
 * // Get cookies named "userPref" from specific domain in all browsers
 * const domainCookies = await queryCookies({
 *   name: "userPref",
 *   domain: "example.com"
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
 * Default export of the queryCookies function
 *
 * @example
 * // Import the function
 * import queryCookies from '@core/cookies/queryCookies';
 *
 * // Query cookies from Chrome
 * const cookies = await queryCookies(
 *   { name: 'session', domain: 'example.com' },
 *   { strategy: new ChromeCookieQueryStrategy() }
 * );
 *
 * // Query cookies with multiple specs
 * const multiCookies = await queryCookies(
 *   [
 *     { name: 'auth', domain: 'api.example.com' },
 *     { name: 'theme', domain: 'example.com' }
 *   ],
 *   {
 *     strategy: new CompositeCookieQueryStrategy([
 *       new ChromeCookieQueryStrategy(),
 *       new FirefoxCookieQueryStrategy()
 *     ]),
 *     limit: 10,
 *     removeExpired: true
 *   }
 * );
 */
export default queryCookies;

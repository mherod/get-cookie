import type { RenderOptions } from "../../types/CookieRender";
import type { CookieSpec } from "../../types/CookieSpec";
import type { ExportedCookie } from "../../types/ExportedCookie";

/**
 * Dynamic import for the getCookie function
 *
 * @example
 * ```typescript
 * const getCookieFn = await getCookie();
 * const cookies = await getCookieFn({ domain: 'example.com' });
 * // Returns: [{ name: 'sessionId', value: 'abc123', domain: 'example.com' }, ...]
 * ```
 *
 * @internal
 * @returns Promise resolving to the getCookie function
 */
export const getCookie = (): Promise<
  (cookieSpec: CookieSpec) => Promise<ExportedCookie[]>
> => import("./getCookie").then((module) => module.getCookie);

/**
 * Dynamic import for Chrome-specific cookie retrieval
 *
 * @example
 * ```typescript
 * const chromeCookieFn = await getChromeCookie();
 * const cookies = await chromeCookieFn({ domain: 'example.com', secure: true });
 * // Returns Chrome-format cookies: [{ name: 'auth', value: 'xyz789', secure: true }, ...]
 * ```
 *
 * @internal
 * @returns Promise resolving to the getChromeCookie function
 */
export const getChromeCookie = (): Promise<
  (cookieSpec: CookieSpec) => Promise<ExportedCookie[]>
> => import("./getChromeCookie").then((module) => module.getChromeCookie);

/**
 * Dynamic import for Firefox-specific cookie retrieval
 *
 * @example
 * ```typescript
 * const firefoxCookieFn = await getFirefoxCookie();
 * const cookies = await firefoxCookieFn({ path: '/api' });
 * // Returns Firefox-format cookies: [{ name: 'token', value: 'def456', path: '/api' }, ...]
 * ```
 *
 * @internal
 * @returns Promise resolving to the getFirefoxCookie function
 */
export const getFirefoxCookie = (): Promise<
  (cookieSpec: CookieSpec) => Promise<ExportedCookie[]>
> => import("./getFirefoxCookie").then((module) => module.getFirefoxCookie);

/**
 * Dynamic import for retrieving grouped and rendered cookies
 *
 * @example
 * ```typescript
 * const groupedCookiesFn = await getGroupedRenderedCookies();
 * const cookieStrings = await groupedCookiesFn({ domain: 'example.com' });
 * // Returns: ['sessionId=abc123; Domain=example.com', 'auth=xyz789; Domain=example.com']
 * ```
 *
 * @internal
 * @returns Promise resolving to the getGroupedRenderedCookies function
 */
export const getGroupedRenderedCookies = (): Promise<
  (cookieSpec: CookieSpec) => Promise<string[]>
> =>
  import("./getGroupedRenderedCookies").then(
    (module) => module.getGroupedRenderedCookies,
  );

/**
 * Dynamic import for retrieving merged and rendered cookies
 *
 * @example
 * ```typescript
 * const mergedCookiesFn = await getMergedRenderedCookies();
 * const cookieString = await mergedCookiesFn(
 *   { domain: 'example.com' },
 *   { separator: '; ' }
 * );
 * // Returns: "sessionId=abc123; auth=xyz789"
 * ```
 *
 * @internal
 * @returns Promise resolving to the getMergedRenderedCookies function
 */
export const getMergedRenderedCookies = (): Promise<
  (
    cookieSpec: CookieSpec,
    options?: Omit<RenderOptions, "format">,
  ) => Promise<string>
> =>
  import("./getMergedRenderedCookies").then(
    (module) => module.getMergedRenderedCookies,
  );
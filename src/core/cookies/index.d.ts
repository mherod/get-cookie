import type { CookieSpec } from "../../types/CookieSpec";
import type { ExportedCookie } from "../../types/ExportedCookie";

declare module "./getCookie" {
  /**
   * Retrieves browser cookies that match the specified cookie name and domain criteria
   * @param cookieSpec - The cookie specification containing search criteria
   * @returns A promise that resolves to an array of exported cookies
   * @example
   * ```typescript
   * import { getCookie } from 'get-cookie';
   *
   * // Get all cookies for a domain
   * const cookies = await getCookie({
   *   name: '*',
   *   domain: 'example.com'
   * });
   *
   * // Get specific cookie
   * const sessionCookie = await getCookie({
   *   name: 'sessionId',
   *   domain: 'api.example.com'
   * });
   * ```
   */
  export function getCookie(cookieSpec: CookieSpec): Promise<ExportedCookie[]>;
}

declare module "./getChromeCookie" {
  /**
   * Retrieves Chrome browser cookies that match the specified cookie name and domain criteria
   * @param cookieSpec - The cookie specification containing search criteria
   * @returns A promise that resolves to an array of exported cookies
   * @example
   * ```typescript
   * import { getChromeCookie } from 'get-cookie';
   *
   * // Get all Chrome cookies for a domain
   * const cookies = await getChromeCookie({
   *   name: '*',
   *   domain: 'example.com'
   * });
   *
   * // Get specific Chrome cookie
   * const authCookie = await getChromeCookie({
   *   name: 'auth',
   *   domain: 'api.example.com'
   * });
   * ```
   */
  export function getChromeCookie(
    cookieSpec: CookieSpec,
  ): Promise<ExportedCookie[]>;
}

declare module "./getFirefoxCookie" {
  /**
   * Retrieves Firefox browser cookies that match the specified cookie name and domain criteria
   * @param cookieSpec - The cookie specification containing search criteria
   * @returns A promise that resolves to an array of exported cookies
   * @example
   * ```typescript
   * import { getFirefoxCookie } from 'get-cookie';
   *
   * // Get all Firefox cookies for a domain
   * const cookies = await getFirefoxCookie({
   *   name: '*',
   *   domain: 'example.com'
   * });
   *
   * // Get specific Firefox cookie
   * const preferenceCookie = await getFirefoxCookie({
   *   name: 'prefs',
   *   domain: 'app.example.com'
   * });
   * ```
   */
  export function getFirefoxCookie(
    cookieSpec: CookieSpec,
  ): Promise<ExportedCookie[]>;
}

declare module "./getGroupedRenderedCookies" {
  /**
   * Retrieves and renders cookies in a grouped format
   * @param cookieSpec - The cookie specification containing search criteria
   * @returns A promise that resolves to an array of rendered cookie strings
   * @example
   * ```typescript
   * import { getGroupedRenderedCookies } from 'get-cookie';
   *
   * // Get cookies grouped by source file
   * const cookieStrings = await getGroupedRenderedCookies({
   *   name: '*',
   *   domain: 'example.com'
   * });
   * // Returns: [
   *   'Cookies.binarycookies: sessionId=abc123; theme=dark',
   *   'Cookies.sqlite: auth=xyz789'
   * ]
   * ```
   */
  export function getGroupedRenderedCookies(
    cookieSpec: CookieSpec,
  ): Promise<string[]>;
}

declare module "./getMergedRenderedCookies" {
  /**
   * Retrieves and renders cookies in a merged format
   * @param cookieSpec - The cookie specification containing search criteria
   * @param options - Optional rendering options
   * @returns A promise that resolves to a single rendered cookie string
   * @example
   * ```typescript
   * import { getMergedRenderedCookies } from 'get-cookie';
   *
   * // Get all cookies as a single string
   * const cookieString = await getMergedRenderedCookies({
   *   name: '*',
   *   domain: 'example.com'
   * });
   * // Returns: "sessionId=abc123; theme=dark; auth=xyz789"
   *
   * // With custom separator
   * const customString = await getMergedRenderedCookies(
   *   { name: '*', domain: 'example.com' },
   *   { separator: ' && ' }
   * );
   * // Returns: "sessionId=abc123 && theme=dark && auth=xyz789"
   * ```
   */
  export function getMergedRenderedCookies(
    cookieSpec: CookieSpec,
    options?: Omit<RenderOptions, "format">,
  ): Promise<string>;
}

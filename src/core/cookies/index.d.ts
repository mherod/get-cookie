import type { CookieSpec } from '../../types/CookieSpec';
import type { ExportedCookie } from '../../types/ExportedCookie';

declare module './getCookie' {
  /**
   * Retrieves browser cookies that match the specified cookie name and domain criteria
   * @param cookieSpec - The cookie specification containing search criteria
   * @returns A promise that resolves to an array of exported cookies
   */
  export function getCookie(cookieSpec: CookieSpec): Promise<ExportedCookie[]>;
}

declare module './getChromeCookie' {
  /**
   * Retrieves Chrome browser cookies that match the specified cookie name and domain criteria
   * @param cookieSpec - The cookie specification containing search criteria
   * @returns A promise that resolves to an array of exported cookies
   */
  export function getChromeCookie(cookieSpec: CookieSpec): Promise<ExportedCookie[]>;
}

declare module './getFirefoxCookie' {
  /**
   * Retrieves Firefox browser cookies that match the specified cookie name and domain criteria
   * @param cookieSpec - The cookie specification containing search criteria
   * @returns A promise that resolves to an array of exported cookies
   */
  export function getFirefoxCookie(cookieSpec: CookieSpec): Promise<ExportedCookie[]>;
}

declare module './getGroupedRenderedCookies' {
  /**
   * Retrieves and renders cookies in a grouped format
   * @param cookieSpec - The cookie specification containing search criteria
   * @returns A promise that resolves to an array of rendered cookie strings
   */
  export function getGroupedRenderedCookies(cookieSpec: CookieSpec): Promise<string[]>;
}

declare module './getMergedRenderedCookies' {
  /**
   * Retrieves and renders cookies in a merged format
   * @param cookieSpec - The cookie specification containing search criteria
   * @returns A promise that resolves to a single rendered cookie string
   */
  export function getMergedRenderedCookies(cookieSpec: CookieSpec): Promise<string>;
}

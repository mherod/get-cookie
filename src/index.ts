import type { CookieSpec } from './types/CookieSpec';
import type { ExportedCookie } from './types/ExportedCookie';
import type FetchResponse from './types/FetchResponse';

/**
 * Dynamic import for the getCookie function
 * @returns Promise resolving to the getCookie function
 */
const getCookie = (): Promise<(cookieSpec: CookieSpec) => Promise<ExportedCookie[]>> =>
  import('./core/cookies/getCookie').then((module) => module.getCookie);

/**
 * Dynamic import for Chrome-specific cookie retrieval
 * @returns Promise resolving to the getChromeCookie function
 */
const getChromeCookie = (): Promise<(cookieSpec: CookieSpec) => Promise<ExportedCookie[]>> =>
  import('./core/cookies/getChromeCookie').then((module) => module.getChromeCookie);

/**
 * Dynamic import for Firefox-specific cookie retrieval
 * @returns Promise resolving to the getFirefoxCookie function
 */
const getFirefoxCookie = (): Promise<(cookieSpec: CookieSpec) => Promise<ExportedCookie[]>> =>
  import('./core/cookies/getFirefoxCookie').then((module) => module.getFirefoxCookie);

/**
 * Dynamic import for retrieving grouped and rendered cookies
 * @returns Promise resolving to the getGroupedRenderedCookies function
 */
const getGroupedRenderedCookies = (): Promise<(cookieSpec: CookieSpec) => Promise<string[]>> =>
  import('./core/cookies/getGroupedRenderedCookies').then(
    (module) => module.getGroupedRenderedCookies,
  );

/**
 * Dynamic import for retrieving merged and rendered cookies
 * @returns Promise resolving to the getMergedRenderedCookies function
 */
const getMergedRenderedCookies = (): Promise<(cookieSpec: CookieSpec) => Promise<string>> =>
  import('./core/cookies/getMergedRenderedCookies').then(
    (module) => module.getMergedRenderedCookies,
  );

/**
 * Dynamic import for fetch functionality with cookie support
 * @returns Promise resolving to the fetchWithCookies function
 */
const fetchWithCookies = (): Promise<(url: string | URL, options?: RequestInit) => Promise<FetchResponse>> =>
  import('./core/fetch/fetchWithCookies').then((module) => module.fetchWithCookies);

/**
 * Export all functions
 */
export {
  getCookie,
  getChromeCookie,
  getFirefoxCookie,
  getGroupedRenderedCookies,
  getMergedRenderedCookies,
  fetchWithCookies,
};

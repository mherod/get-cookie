/**
 * Core cookie retrieval and manipulation functions
 */
export {
  getCookie,
  getChromeCookie,
  getFirefoxCookie,
  getGroupedRenderedCookies,
  getMergedRenderedCookies,
} from "./core/cookies";

/**
 * Type definitions for cookie-related interfaces and configurations
 */
export type {
  CookieSpec,
  ExportedCookie,
  RenderOptions,
  BrowserName,
  CookieQueryStrategy,
  MultiCookieSpec,
} from "./types/schemas";

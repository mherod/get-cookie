/**
 * Core cookie retrieval function (main entry point)
 */

/**
 * Composite strategy that queries cookies from multiple browser strategies in parallel
 */
export { CompositeCookieQueryStrategy } from "./core/browsers/CompositeCookieQueryStrategy";

/**
 * Browser-specific cookie query strategies
 */
export { ChromeCookieQueryStrategy } from "./core/browsers/chrome/ChromeCookieQueryStrategy";
/**
 * Chromium-based browser cookie query strategy for browsers like Edge, Brave, etc.
 */
export { ChromiumCookieQueryStrategy } from "./core/browsers/chromium/ChromiumCookieQueryStrategy";
/**
 * Firefox browser cookie query strategy for extracting cookies from Firefox profiles
 */
export { FirefoxCookieQueryStrategy } from "./core/browsers/firefox/FirefoxCookieQueryStrategy";
/**
 * Safari browser cookie query strategy for extracting cookies from Safari binary cookie files
 */
export { SafariCookieQueryStrategy } from "./core/browsers/safari/SafariCookieQueryStrategy";
/**
 * Main function to retrieve cookies by name and domain from any supported browser
 */
export { getCookie } from "./core/cookies/getCookie";

/**
 * Batch cookie retrieval functions for efficient parallel fetching
 */
export {
  batchGetCookies,
  batchGetCookiesWithResults,
  type BatchGetCookiesOptions,
  type BatchCookieResult,
} from "./core/cookies/batchGetCookies";

/**
 * Type definitions for cookie-related interfaces and configurations
 */
export type {
  BrowserName,
  CookieQueryStrategy,
  CookieSpec,
  ExportedCookie,
  MultiCookieSpec,
  RenderOptions,
} from "./types/schemas";

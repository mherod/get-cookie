/**
 * Core cookie retrieval function (main entry point)
 */
export { getCookie } from "./core/cookies/getCookie";

/**
 * Browser-specific cookie query strategies
 */
export { ChromeCookieQueryStrategy } from "./core/browsers/chrome/ChromeCookieQueryStrategy";
export { ChromiumCookieQueryStrategy } from "./core/browsers/chromium/ChromiumCookieQueryStrategy";
export { FirefoxCookieQueryStrategy } from "./core/browsers/firefox/FirefoxCookieQueryStrategy";
export { SafariCookieQueryStrategy } from "./core/browsers/safari/SafariCookieQueryStrategy";
export { CompositeCookieQueryStrategy } from "./core/browsers/CompositeCookieQueryStrategy";

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

import type { RenderOptions } from "../../types/CookieRender";
import type { CookieSpec } from "../../types/CookieSpec";
import type { ExportedCookie } from "../../types/ExportedCookie";

/**
 * Dynamic import for the getCookie function
 * @returns Promise resolving to the getCookie function
 */
export const getCookie = (): Promise<
  (cookieSpec: CookieSpec) => Promise<ExportedCookie[]>
> => import("./getCookie").then((module) => module.getCookie);

/**
 * Dynamic import for Chrome-specific cookie retrieval
 * @returns Promise resolving to the getChromeCookie function
 */
export const getChromeCookie = (): Promise<
  (cookieSpec: CookieSpec) => Promise<ExportedCookie[]>
> => import("./getChromeCookie").then((module) => module.getChromeCookie);

/**
 * Dynamic import for Firefox-specific cookie retrieval
 * @returns Promise resolving to the getFirefoxCookie function
 */
export const getFirefoxCookie = (): Promise<
  (cookieSpec: CookieSpec) => Promise<ExportedCookie[]>
> => import("./getFirefoxCookie").then((module) => module.getFirefoxCookie);

/**
 * Dynamic import for retrieving grouped and rendered cookies
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

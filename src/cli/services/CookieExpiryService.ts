import { isAfter } from "date-fns";

import type { ExportedCookie } from "../../types/schemas";

/**
 * Service class for handling cookie expiry checks
 * @example
 * // Filter expired cookies
 * const validCookies = CookieExpiryService.filterExpired(cookieList);
 */
export class CookieExpiryService {
  private constructor() {} // Prevent instantiation

  /**
   * Filters out expired cookies from the given list
   * @param cookies - List of cookies to filter
   * @returns List of non-expired cookies
   * @example
   * // Filter expired cookies from a list
   * const validCookies = CookieExpiryService.filterExpired(cookieList);
   */
  public static filterExpired(cookies: ExportedCookie[]): ExportedCookie[] {
    const now = new Date();
    return cookies.filter(cookie => {
      if (cookie.expiry === "Infinity") {
        return true;
      }
      if (cookie.expiry instanceof Date) {
        return isAfter(cookie.expiry, now);
      }
      if (typeof cookie.expiry === "number") {
        return isAfter(new Date(cookie.expiry * 1000), now);
      }
      return true;
    });
  }
}

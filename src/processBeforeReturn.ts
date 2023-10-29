import ExportedCookie from "./ExportedCookie";
import { uniqBy } from "lodash";
import CookieQueryStrategy from "./browsers/CookieQueryStrategy";
import { CookieQueryOptions } from "./cookieQueryOptions";

export function processBeforeReturn<T extends CookieQueryStrategy>(
  cookies: ExportedCookie[],
  options?: CookieQueryOptions<T>,
): ExportedCookie[] {
  if (options?.removeExpired) {
    return cookies.filter((c: ExportedCookie) => {
      const expiry: Date | "Infinity" | undefined = c.expiry;
      if (expiry === undefined) {
        return true;
      } else if (expiry === "Infinity") {
        return true;
      } else {
        return expiry.getTime() > Date.now();
      }
    });
  }
  if (options?.limit) {
    return cookies.slice(0, options.limit);
  }
  return uniqBy(cookies, JSON.stringify);
}

import ExportedCookie from "./ExportedCookie";
import { uniqBy } from "lodash";
import CookieQueryStrategy from "./browsers/CookieQueryStrategy";
import { CookieQueryOptions } from "./cookieQueryOptions";

export function processBeforeReturn<T extends CookieQueryStrategy>(
  cookies: ExportedCookie[],
  options?: CookieQueryOptions<T>,
): ExportedCookie[] {
  let processedCookies: ExportedCookie[] = cookies;

  if (options && options.removeExpired) {
    const now: number = Date.now();
    processedCookies = processedCookies.filter((c: ExportedCookie) => {
      const expiry: Date | "Infinity" | undefined = c.expiry;
      return (
        expiry === undefined || expiry === "Infinity" || expiry.getTime() > now
      );
    });
  }

  if (options && options.limit) {
    processedCookies = processedCookies.slice(0, options.limit);
  }

  return uniqBy(processedCookies, (cookie: ExportedCookie) =>
    JSON.stringify(cookie),
  );
}

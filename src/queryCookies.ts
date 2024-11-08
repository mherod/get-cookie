import { uniqBy } from "lodash";
import { parsedArgs } from "./argv";
import CompositeCookieQueryStrategy from "./browsers/CompositeCookieQueryStrategy";
import CookieQueryStrategy from "./browsers/CookieQueryStrategy";
import isValidJwt from "./isValidJwt";
import CookieSpec from "./CookieSpec";
import ExportedCookie from "./ExportedCookie";
import { CookieQueryOptions } from "./cookieQueryOptions";
import consola from "./logger";

export async function queryCookies(
  { name, domain }: CookieSpec,
  options?: CookieQueryOptions<CookieQueryStrategy>,
): Promise<ExportedCookie[]> {
  const strategy: CookieQueryStrategy =
    options?.strategy || new CompositeCookieQueryStrategy();

  consola.debug(`Using strategy: ${strategy.browserName}`);

  const results: ExportedCookie[] = await strategy.queryCookies(name, domain);
  const allCookies: ExportedCookie[] = uniqBy(results, JSON.stringify);

  const filterCookies = (
    cookies: ExportedCookie[],
    filterFn: (value: string) => boolean,
  ): ExportedCookie[] => {
    const filteredCookies: ExportedCookie[] = [];
    for (const cookie of cookies) {
      if (filterFn(cookie.value)) {
        filteredCookies.push(cookie);
      }
    }
    return filteredCookies;
  };

  const jwtCookies: ExportedCookie[] = parsedArgs.requireJwt
    ? filterCookies(allCookies, isValidJwt)
    : allCookies;

  return parsedArgs.single ? [jwtCookies[0]] : jwtCookies;
}

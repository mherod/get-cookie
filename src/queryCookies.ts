import { uniqBy } from "lodash";
import { parsedArgs } from "./argv";
import CompositeCookieQueryStrategy from "./browsers/CompositeCookieQueryStrategy";
import CookieQueryStrategy from "./browsers/CookieQueryStrategy";
import isValidJwt from "./isValidJwt";
import CookieSpec from "./CookieSpec";
import ExportedCookie from "./ExportedCookie";

export async function queryCookies(
  {
    name,
    domain,
    limit,
  }: //
  CookieSpec & {
    limit?: number;
  },
  strategy: CookieQueryStrategy = new CompositeCookieQueryStrategy(),
): Promise<ExportedCookie[]> {
  //
  const results: ExportedCookie[] = await strategy.queryCookies(name, domain);
  const allCookies: ExportedCookie[] = uniqBy(results, JSON.stringify);

  if (parsedArgs["require-jwt"]) {
    const jwtCookies = [];
    for (const result of allCookies) {
      const value: string = result.value;
      if (isValidJwt(value)) {
        jwtCookies.push(result);
      }
    }
    return parsedArgs["single"] ? [jwtCookies[0]] : jwtCookies;
  } else {
    return parsedArgs["single"] ? [allCookies[0]] : allCookies;
  }
}

import CompositeCookieQueryStrategy from "./browsers/CompositeCookieQueryStrategy";
import { uniqBy } from "lodash";
import { env } from "./global";
import isValidJwt from "./isValidJwt";
import { ExportedCookie } from "./CookieRow";
import AbstractCookieQueryStrategy from "./browsers/AbstractCookieQueryStrategy";

export async function queryCookies(
  {
    name,
    domain
  }: {
    name: string;
    domain: string;
  },
  strategy: AbstractCookieQueryStrategy = new CompositeCookieQueryStrategy()
) {
  const results: ExportedCookie[] = await strategy.queryCookies(name, domain);
  const results1: ExportedCookie[] = uniqBy(results, JSON.stringify);
  const jwtCookies = [];
  for (const result of results1) {
    const value = result.value;
    if (isValidJwt(value)) {
      jwtCookies.push(result);
    }
  }
  const resultsUniq = env.REQUIRE_JWT ? jwtCookies : results1;
  return env.SINGLE ? [resultsUniq[0]] : resultsUniq;
}

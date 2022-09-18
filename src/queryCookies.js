import CompositeCookieQueryStrategy from "./browsers/CompositeCookieQueryStrategy";
import { uniq } from "lodash";
import { env } from "./global";

export async function queryCookies(name, domain) {
  const strategy = new CompositeCookieQueryStrategy();
  const results1 = await strategy.queryCookies(name, domain);
  const results2 = uniq(results1);
  return env.SINGLE ? [results2[0]] : results2;
}

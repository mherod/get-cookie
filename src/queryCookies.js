import CompositeCookieQueryStrategy from "./browsers/CompositeCookieQueryStrategy";
import { uniq } from "lodash";
import { env } from "./global";
import isValidJwt from "./isValidJwt";

export async function queryCookies(
  { name, domain },
  strategy = new CompositeCookieQueryStrategy()
) {
  const results = await strategy.queryCookies(name, domain);
  const results1 = uniq(results).map((cookie) => {
    return {
      name: name,
      domain: domain,
      value: cookie,
    };
  });
  const jwtCookies = [];
  for (const result of results1) {
    const value = result.value;
    if (isValidJwt(value)) {
      jwtCookies.push(result);
    }
  }
  const results2 = env.REQUIRE_JWT ? jwtCookies : results1;
  const resultsUniq = uniq(results2).map((cookie) => cookie.value);
  return env.SINGLE ? [resultsUniq[0]] : resultsUniq;
}

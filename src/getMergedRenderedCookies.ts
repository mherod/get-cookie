import { groupBy } from "lodash";
import { queryCookies } from "./queryCookies";
import { resultsRendered } from "./resultsRendered";
import CompositeCookieQueryStrategy from "./browsers/CompositeCookieQueryStrategy";
import CookieSpec from "./CookieSpec";
import ExportedCookie from "./ExportedCookie";

export async function getMergedRenderedCookies({
  name,
  domain,
}: CookieSpec): Promise<string> {
  const cookies: ExportedCookie[] = await queryCookies(
    {
      name,
      domain,
    },
    new CompositeCookieQueryStrategy()
    //
  );
  if (cookies.length == 0) {
    throw new Error("Cookie not found");
  }
  const results: ExportedCookie[] = await queryCookies({ name, domain });
  return resultsRendered(results);
}

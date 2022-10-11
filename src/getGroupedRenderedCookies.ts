import { groupBy } from "lodash";
import { queryCookies } from "./queryCookies";
import { resultsRendered } from "./resultsRendered";
import CompositeCookieQueryStrategy from "./browsers/CompositeCookieQueryStrategy";
import CookieSpec from "./CookieSpec";
import ExportedCookie from "./ExportedCookie";

export async function getGroupedRenderedCookies({
  name,
  domain,
}: CookieSpec): Promise<string[]> {
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
  const groupedByFile = groupBy(results, (r: ExportedCookie) => r.meta?.file);
  return Object.keys(groupedByFile).map((file: string) => {
    const results: ExportedCookie[] = groupedByFile[file];
    return resultsRendered(results);
  });
}

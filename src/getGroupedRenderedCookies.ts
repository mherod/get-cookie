import { groupBy } from "lodash";
import { resultsRendered } from "./resultsRendered";
import { MultiCookieSpec } from "./CookieSpec";
import ExportedCookie from "./ExportedCookie";
import { comboQueryCookieSpec } from "./comboQueryCookieSpec";

export async function getGroupedRenderedCookies(
  cookieSpec: MultiCookieSpec,
): Promise<string[]> {
  const cookies: ExportedCookie[] = await comboQueryCookieSpec(cookieSpec);
  if (cookies.length == 0) {
    throw new Error("Cookie not found");
  }
  const groupedByFile = groupBy(cookies, (r: ExportedCookie) => r.meta?.file);
  return Object.keys(groupedByFile).map((file: string) => {
    const results: ExportedCookie[] = groupedByFile[file];
    return resultsRendered(results);
  });
}

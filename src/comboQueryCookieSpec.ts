import { MultiCookieSpec } from "./CookieSpec";
import ExportedCookie from "./ExportedCookie";
import { queryCookies } from "./queryCookies";
import { uniqBy } from "lodash";

export async function comboQueryCookieSpec(
  cookieSpec: MultiCookieSpec
): Promise<ExportedCookie[]> {
  const cookies: ExportedCookie[] = [];
  if (Array.isArray(cookieSpec)) {
    const results: Awaited<ExportedCookie[]>[] = await Promise.all(
      cookieSpec.map((cs) => {
        return queryCookies(cs);
      })
    );
    for (const exportedCookie of results.flat()) {
      cookies.push(exportedCookie);
    }
  } else {
    const singleQuery: ExportedCookie[] = await queryCookies(cookieSpec);
    cookies.push(...singleQuery);
  }
  return uniqBy(cookies, JSON.stringify);
}

import CookieSpec from "./CookieSpec";
import ExportedCookie from "./ExportedCookie";
import { queryCookies } from "./queryCookies";
import { uniqBy } from "lodash";

export async function comboQueryCookieSpec(
  cookieSpec: CookieSpec | CookieSpec[]
): Promise<ExportedCookie[]> {
  const cookies: ExportedCookie[] = [];
  if (Array.isArray(cookieSpec)) {
    const cookieSpecs = <CookieSpec[]>cookieSpec;
    for (const cookieSpec1 of cookieSpecs) {
      const cookies1: ExportedCookie[] = await queryCookies(cookieSpec1);
      cookies.push(...cookies1);
    }
  } else {
    const singleQuery = await queryCookies(cookieSpec);
    cookies.push(...singleQuery);
  }
  return uniqBy(cookies, JSON.stringify);
}

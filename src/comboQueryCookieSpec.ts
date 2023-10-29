import { MultiCookieSpec } from "./CookieSpec";
import ExportedCookie from "./ExportedCookie";
import { queryCookies } from "./queryCookies";
import { uniqBy } from "lodash";
import { flatMapAsync } from "./util/flatMapAsync";

export async function comboQueryCookieSpec(
  cookieSpec: MultiCookieSpec,
): Promise<ExportedCookie[]> {
  if (Array.isArray(cookieSpec)) {
    const cookiesForMultiSpec: ExportedCookie[] = //
      await flatMapAsync(cookieSpec, async (cs) => {
        return await queryCookies(cs);
      });
    return uniqBy(cookiesForMultiSpec, JSON.stringify);
  } else {
    const cookiesForSingleSpec: ExportedCookie[] = //
      await queryCookies(cookieSpec);
    return uniqBy(cookiesForSingleSpec, JSON.stringify);
  }
}

import CookieSpec, { MultiCookieSpec } from "./CookieSpec";
import ExportedCookie from "./ExportedCookie";
import { queryCookies } from "./queryCookies";
import { flatMapAsync } from "./util";
import CookieQueryStrategy from "./browsers/CookieQueryStrategy";
import { CookieQueryOptions, mergedWithDefaults } from "./cookieQueryOptions";
import { processBeforeReturn } from "./processBeforeReturn";

export async function comboQueryCookieSpec(
  cookieSpec: MultiCookieSpec,
  options?: CookieQueryOptions<CookieQueryStrategy>
): Promise<ExportedCookie[]> {

  const optsWithDefaults: CookieQueryOptions<CookieQueryStrategy> = mergedWithDefaults(options);
  const fn = (cs: CookieSpec) => queryCookies(cs, optsWithDefaults);

  if (Array.isArray(cookieSpec)) {
    const cookiesForMultiSpec: ExportedCookie[] = await flatMapAsync(
      cookieSpec,
      async (cs: CookieSpec) => {
        return await fn(cs);
      }
    );
    return processBeforeReturn(cookiesForMultiSpec, options);
  } else {
    const cookiesForSingleSpec: ExportedCookie[] = await fn(cookieSpec);
    return processBeforeReturn(cookiesForSingleSpec, options);
  }
}

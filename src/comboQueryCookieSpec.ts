import CookieSpec, { MultiCookieSpec } from "./CookieSpec";
import ExportedCookie from "./ExportedCookie";
import { queryCookies } from "./queryCookies";
import { flatMapAsync } from "./util";
import CookieQueryStrategy from "./browsers/CookieQueryStrategy";
import { CookieQueryOptions, mergedWithDefaults } from "./cookieQueryOptions";
import { processBeforeReturn } from "./processBeforeReturn";

export async function comboQueryCookieSpec(
  cookieSpec: MultiCookieSpec,
  options?: CookieQueryOptions<CookieQueryStrategy>,
): Promise<ExportedCookie[]> {
  const optsWithDefaults: CookieQueryOptions<CookieQueryStrategy> =
    mergedWithDefaults(options);
  const queryFn = async (cs: CookieSpec): Promise<ExportedCookie[]> =>
    queryCookies(cs, optsWithDefaults);

  let cookies: ExportedCookie[];
  if (Array.isArray(cookieSpec)) {
    cookies = await flatMapAsync(cookieSpec, queryFn);
  } else {
    cookies = await queryFn(cookieSpec);
  }

  return processBeforeReturn(cookies, options);
}

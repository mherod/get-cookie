import CookieSpec from "./CookieSpec";
import ExportedCookie from "./ExportedCookie";
import { queryCookies } from "./queryCookies";
import ChromeCookieQueryStrategy from "./browsers/ChromeCookieQueryStrategy";
import { isExportedCookie } from "./IsExportedCookie";

export async function getChromeCookie(
  params: CookieSpec
): Promise<ExportedCookie | undefined> {
  const cookies = await queryCookies(
    params,
    new ChromeCookieQueryStrategy()
    //
  );
  if (cookies.length == 0) {
    throw new Error("Cookie not found");
  }
  return cookies.find(isExportedCookie);
}

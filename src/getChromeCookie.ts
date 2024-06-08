import CookieSpec from "./CookieSpec";
import ExportedCookie from "./ExportedCookie";
import { queryCookies } from "./queryCookies";
import ChromeCookieQueryStrategy from "./browsers/chrome/ChromeCookieQueryStrategy";
import { isExportedCookie } from "./ExportedCookie";

export async function getChromeCookie(
  params: CookieSpec,
): Promise<ExportedCookie | undefined> {
  const cookies: ExportedCookie[] = await queryCookies(params, {
    strategy: new ChromeCookieQueryStrategy(),
  });

  if (cookies.length === 0) {
    throw new Error("Cookie not found");
  }

  return cookies.find(isExportedCookie);
}

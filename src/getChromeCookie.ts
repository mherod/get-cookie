import CookieSpec from "./CookieSpec";
import ExportedCookie from "./ExportedCookie";
import { queryCookies } from "./queryCookies";
import ChromeCookieQueryStrategy from "./browsers/ChromeCookieQueryStrategy";

export async function getChromeCookie(
  params: CookieSpec
): Promise<ExportedCookie | undefined> {
  const cookies = await queryCookies(
    params,
    new ChromeCookieQueryStrategy()
    //
  );
  if (Array.isArray(cookies) && cookies.length > 0) {
    return cookies.find((cookie) => cookie != null);
  } else {
    throw new Error("Cookie not found");
  }
}

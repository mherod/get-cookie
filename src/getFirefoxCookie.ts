import CookieSpec from "./CookieSpec";
import ExportedCookie from "./ExportedCookie";
import { queryCookies } from "./queryCookies";
import FirefoxCookieQueryStrategy from "./browsers/FirefoxCookieQueryStrategy";

export async function getFirefoxCookie(
  params: CookieSpec,
): Promise<ExportedCookie | undefined> {
  const cookies: ExportedCookie[] = await queryCookies(
    params,
    new FirefoxCookieQueryStrategy(),
    //
  );
  if (Array.isArray(cookies) && cookies.length > 0) {
    return cookies.find((cookie) => cookie != null);
  } else {
    throw new Error("Cookie not found");
  }
}

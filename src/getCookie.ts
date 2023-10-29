import CookieSpec from "./CookieSpec";
import ExportedCookie from "./ExportedCookie";
import { queryCookies } from "./queryCookies";
import CompositeCookieQueryStrategy from "./browsers/CompositeCookieQueryStrategy";

export async function getCookie(
  params: CookieSpec,
): Promise<ExportedCookie | undefined> {
  //
  const cookies: ExportedCookie[] = await queryCookies(
    params,
    {
      strategy: new CompositeCookieQueryStrategy(),
    },
    //
  );
  if (Array.isArray(cookies) && cookies.length > 0) {
    return cookies.find((cookie) => cookie != null);
  } else {
    throw new Error("Cookie not found");
  }
}

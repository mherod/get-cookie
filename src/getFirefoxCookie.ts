import CookieSpec from "./CookieSpec";
import ExportedCookie from "./ExportedCookie";
import { queryCookies } from "./queryCookies";
import FirefoxCookieQueryStrategy from "./browsers/firefox/FirefoxCookieQueryStrategy";

export async function getFirefoxCookie(
  params: CookieSpec,
): Promise<ExportedCookie | undefined> {
  const cookies: ExportedCookie[] = await queryCookies(
    params,
    {
      strategy: new FirefoxCookieQueryStrategy(),
    },
  );

  if (!Array.isArray(cookies) || cookies.length === 0) {
    throw new Error("Cookie not found");
  }

  const validCookie: ExportedCookie | undefined = cookies.find((cookie) => cookie != null);
  if (!validCookie) {
    throw new Error("Cookie not found");
  }

  return validCookie;
}

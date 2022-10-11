import { resultsRendered } from "./resultsRendered";
import CookieSpec from "./CookieSpec";
import { comboQueryCookieSpec } from "./comboQueryCookieSpec";

export async function getMergedRenderedCookies(
  cookieSpec: CookieSpec | CookieSpec[]
): Promise<string> {
  const cookies = await comboQueryCookieSpec(cookieSpec);
  if (cookies.length == 0) {
    throw new Error("Cookie not found");
  }
  return resultsRendered(cookies);
}

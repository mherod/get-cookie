import { resultsRendered } from "./resultsRendered";
import { comboQueryCookieSpec } from "./comboQueryCookieSpec";
import { MultiCookieSpec } from "./CookieSpec";
import ExportedCookie from "./ExportedCookie";
import CookieQueryStrategy from "./browsers/CookieQueryStrategy";
import CompositeCookieQueryStrategy from "./browsers/CompositeCookieQueryStrategy";

export async function getMergedRenderedCookies(
  cookieSpec: MultiCookieSpec,
  strategy: CookieQueryStrategy = new CompositeCookieQueryStrategy(),
): Promise<string> {
  const cookies: ExportedCookie[] = await comboQueryCookieSpec(cookieSpec, {
    strategy,
  });
  if (cookies.length > 0) {
    return resultsRendered(cookies);
  }
  return "";
}

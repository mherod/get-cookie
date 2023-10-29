import { resultsRendered } from "./resultsRendered";
import { comboQueryCookieSpec } from "./comboQueryCookieSpec";
import { MultiCookieSpec } from "./CookieSpec";
import ExportedCookie from "./ExportedCookie";
import consola from "consola";
import CookieQueryStrategy from "./browsers/CookieQueryStrategy";
import CompositeCookieQueryStrategy from "./browsers/CompositeCookieQueryStrategy";

export async function getMergedRenderedCookies(
  cookieSpec: MultiCookieSpec,
  strategy: CookieQueryStrategy = new CompositeCookieQueryStrategy(),
): Promise<string> {
  const cookies: ExportedCookie[] = await comboQueryCookieSpec(cookieSpec, {
    strategy,
  });
  return cookies.length > 0 ? resultsRendered(cookies) : "";
}

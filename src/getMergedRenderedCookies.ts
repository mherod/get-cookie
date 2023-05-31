import { resultsRendered } from "./resultsRendered";
import { comboQueryCookieSpec } from "./comboQueryCookieSpec";
import { MultiCookieSpec } from "./CookieSpec";
import ExportedCookie from "./ExportedCookie";
import consola from "consola";

export async function getMergedRenderedCookies(
  cookieSpec: MultiCookieSpec
): Promise<string> {
  const cookies: ExportedCookie[] = await comboQueryCookieSpec(cookieSpec);
  return cookies.length > 0 ? resultsRendered(cookies) : "";
}

import { resultsRendered } from "./resultsRendered";
import { comboQueryCookieSpec } from "./comboQueryCookieSpec";
import { MultiCookieSpec } from "./CookieSpec";
import ExportedCookie from "./ExportedCookie";

export async function getMergedRenderedCookies(
  cookieSpec: MultiCookieSpec
): Promise<string> {
  const cookies: ExportedCookie[] = await comboQueryCookieSpec(cookieSpec);
  if (cookies.length > 0) {
    return resultsRendered(cookies);
  }
  return "";
}

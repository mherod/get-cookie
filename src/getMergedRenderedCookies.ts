import { resultsRendered } from "./resultsRendered";
import { comboQueryCookieSpec } from "./comboQueryCookieSpec";
import { MultiCookieSpec } from "./CookieSpec";
import ExportedCookie from "./ExportedCookie";
import consola from "consola";

export async function getMergedRenderedCookies(
  cookieSpec: MultiCookieSpec
): Promise<string> {
  consola.info("cookieSpec", cookieSpec);
  const cookies: ExportedCookie[] = await comboQueryCookieSpec(cookieSpec);
  if (cookies.length > 0) {
    consola.info("cookies", cookies);
    return resultsRendered(cookies);
  } else {
    consola.info("cookies", cookies);
    return "";
  }
}

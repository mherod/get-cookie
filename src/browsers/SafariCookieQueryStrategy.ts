import CookieQueryStrategy from "./CookieQueryStrategy";
import ExportedCookie from "../ExportedCookie";

export default class SafariCookieQueryStrategy implements CookieQueryStrategy {
  browserName = "Safari";

  async queryCookies(name: string, domain: string): Promise<ExportedCookie[]> {
    // TODO: implement
    return [];
  }
}

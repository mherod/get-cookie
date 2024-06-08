import CookieQueryStrategy from "../CookieQueryStrategy";
import ExportedCookie from "../../ExportedCookie";

export default class SafariCookieQueryStrategy implements CookieQueryStrategy {
  browserName: string = "Safari";

  async queryCookies(name: string, domain: string): Promise<ExportedCookie[]> {
    // TODO: implement
    return [];
  }
}

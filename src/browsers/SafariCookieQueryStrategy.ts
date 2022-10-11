import CookieQueryStrategy from "./CookieQueryStrategy";
import ExportedCookie from "../ExportedCookie";

export default class SafariCookieQueryStrategy implements CookieQueryStrategy {
  async queryCookies(name: string, domain: string): Promise<ExportedCookie[]> {
    return [];
  }
}

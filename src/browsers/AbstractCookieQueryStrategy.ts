import {ExportedCookie} from "../CookieRow";

export default class AbstractCookieQueryStrategy {
  async queryCookies(name: string, domain: string): Promise<ExportedCookie[]> {
    if (process.env.NODE_ENV === "development") {
      console.log("queryCookie", name, domain);
    }
    return [];
  }
}

import ExportedCookie from "../../ExportedCookie";
import CookieQueryStrategy from "../CookieQueryStrategy";

export default class MockCookieQueryStrategy implements CookieQueryStrategy {
  browserName: string = "mock";

  private cookies: ExportedCookie[];

  constructor(cookies: ExportedCookie[]) {
    this.cookies = cookies;
  }

  async queryCookies(name: string, domain: string): Promise<ExportedCookie[]> {
    const filteredCookies: ExportedCookie[] = [];
    for (const cookie of this.cookies) {
      if (cookie.name === name && cookie.domain === domain) {
        filteredCookies.push(cookie);
      }
    }
    return filteredCookies;
  }
}

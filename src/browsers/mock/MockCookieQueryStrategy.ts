import ExportedCookie from "../../ExportedCookie";
import CookieQueryStrategy from "../CookieQueryStrategy";

export default class MockCookieQueryStrategy implements CookieQueryStrategy {
  browserName: string = "mock";

  private cookies: ExportedCookie[] = [];

  constructor(cookies: ExportedCookie[]) {
    this.cookies = cookies;
  }

  async queryCookies(name: string, domain: string): Promise<ExportedCookie[]> {
    return this.cookies.filter((c) => {
      return c.name === name && c.domain === domain;
    });
  }
}

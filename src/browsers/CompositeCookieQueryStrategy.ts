import ChromeCookieQueryStrategy from "./ChromeCookieQueryStrategy";
import FirefoxCookieQueryStrategy from "./FirefoxCookieQueryStrategy";
import SafariCookieQueryStrategy from "./SafariCookieQueryStrategy";
import AbstractCookieQueryStrategy from "./AbstractCookieQueryStrategy";
import {ExportedCookie} from "../CookieRow";

export default class CompositeCookieQueryStrategy extends AbstractCookieQueryStrategy {
  #strategies;

  constructor() {
    super();
    this.#strategies = [
      ChromeCookieQueryStrategy,
      FirefoxCookieQueryStrategy,
      SafariCookieQueryStrategy,
    ].map((strategy) => {
      return new strategy();
    });
  }

  async queryCookies(name: string, domain: string): Promise<ExportedCookie[]> {
    const results = await Promise.all(
      this.#strategies.map(async (strategy) => {
        // @ts-ignore
        const cookies: Promise<ExportedCookie[]> = strategy.queryCookies(name, domain);
        return cookies.catch(() => []);
      })
    );
    return results.flat();
  }
}

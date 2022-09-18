import ChromeCookieQueryStrategy from "./ChromeCookieQueryStrategy";
import FirefoxCookieQueryStrategy from "./FirefoxCookieQueryStrategy";
import SafariCookieQueryStrategy from "./SafariCookieQueryStrategy";
import AbstractCookieQueryStrategy from "./AbstractCookieQueryStrategy";

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

  async queryCookies(name, domain) {
    const results = await Promise.all(
      this.#strategies.map(async (strategy) => {
        return strategy.queryCookies(name, domain).catch(() => []);
      })
    );
    return results.flat();
  }
}

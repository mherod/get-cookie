import ChromeCookieQueryStrategy from "./ChromeCookieQueryStrategy";
import FirefoxCookieQueryStrategy from "./FirefoxCookieQueryStrategy";
import SafariCookieQueryStrategy from "./SafariCookieQueryStrategy";
import AbstractCookieQueryStrategy from "./AbstractCookieQueryStrategy";

const compositeCookieQueryStrategy = [
  ChromeCookieQueryStrategy,
  FirefoxCookieQueryStrategy,
  SafariCookieQueryStrategy,
].map((strategy) => {
  return new strategy();
});

export default class CompositeCookieQueryStrategy extends AbstractCookieQueryStrategy {
  async queryCookies(name, domain) {
    const results = await Promise.all(
      compositeCookieQueryStrategy.map(async (strategy) => {
        return strategy.queryCookies(name, domain).catch(() => []);
      })
    );
    return results.flat();
  }
}

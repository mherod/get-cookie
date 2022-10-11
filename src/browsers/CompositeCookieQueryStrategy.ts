import ChromeCookieQueryStrategy from "./ChromeCookieQueryStrategy";
import FirefoxCookieQueryStrategy from "./FirefoxCookieQueryStrategy";
import SafariCookieQueryStrategy from "./SafariCookieQueryStrategy";
import CookieQueryStrategy from "./CookieQueryStrategy";
import ExportedCookie from "../ExportedCookie";
import LRUCache from "lru-cache";
import MemoryCookieStoreQueryStrategy from "./MemoryCookieJarQueryStrategy";

const cache = new LRUCache<string, ExportedCookie[]>({
  ttl: 1000 * 2,
  max: 10,
});

export default class CompositeCookieQueryStrategy
  implements CookieQueryStrategy
{
  #strategies;

  constructor() {
    this.#strategies = [
      MemoryCookieStoreQueryStrategy,
      ChromeCookieQueryStrategy,
      FirefoxCookieQueryStrategy,
      SafariCookieQueryStrategy,
    ].map((strategy) => {
      return new strategy();
    });
  }

  async queryCookies(name: string, domain: string): Promise<ExportedCookie[]> {
    const key = `${name}:${domain}`;
    const cached = cache.get(key);
    if (cached) {
      return cached;
    }
    const results = await Promise.all(
      this.#strategies.map(async (strategy) => {
        // @ts-ignore
        const cookies: Promise<ExportedCookie[]> = strategy.queryCookies(
          name,
          domain
        );
        return cookies.catch(() => []);
      })
    );
    const flat: ExportedCookie[] = results.flat();
    cache.set(`${name}:${domain}`, flat);
    return flat;
  }
}

import ChromeCookieQueryStrategy from "./ChromeCookieQueryStrategy";
import FirefoxCookieQueryStrategy from "./FirefoxCookieQueryStrategy";
import SafariCookieQueryStrategy from "./SafariCookieQueryStrategy";
import CookieQueryStrategy from "./CookieQueryStrategy";
import ExportedCookie from "../ExportedCookie";
import LRUCache from "lru-cache";
import { merge } from "lodash";
import { parsedArgs } from "../argv";
import consola from "consola";
import { flatMapAsync } from "../util/flatMapAsync";

const cache: LRUCache<string, ExportedCookie[]> = new LRUCache<
  string,
  ExportedCookie[]
>({
  ttl: 1000 * 10, // 10 seconds
  max: 10,
});

export default class CompositeCookieQueryStrategy
  implements CookieQueryStrategy
{
  browserName = "all";

  private readonly strategies;

  constructor() {
    this.strategies = [
      // CookieStoreQueryStrategy,
      ChromeCookieQueryStrategy,
      FirefoxCookieQueryStrategy,
      SafariCookieQueryStrategy,
    ].map((strategy) => {
      return new strategy();
    });
  }

  async queryCookies(name: string, domain: string): Promise<ExportedCookie[]> {
    // domain = domain.match(/(\w+.+\w+)/gi)?.pop() ?? domain;
    const key = `${name}:${domain}`;
    if (cache.has(key)) {
      const cached = cache.get(key);
      if (cached) {
        return cached;
      }
    }
    if (parsedArgs.verbose) {
      consola.log("Querying cookies:", name, domain);
    }
    const results = await flatMapAsync(this.strategies, async (strategy) => {
      return strategy
        .queryCookies(name, domain)
        .then((cookies: ExportedCookie[]) => {
          return cookies.map((cookie: ExportedCookie) => {
            return merge(cookie, {
              meta: {
                browser: strategy.browserName,
              },
            });
          });
        })
        .catch((e) => {
          consola.error(`Error querying ${strategy.browserName} cookies`, e);
          return [];
        });
    });
    cache.set(`${name}:${domain}`, results);
    return results;
  }
}

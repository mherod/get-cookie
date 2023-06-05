import ChromeCookieQueryStrategy from "./ChromeCookieQueryStrategy";
import FirefoxCookieQueryStrategy from "./FirefoxCookieQueryStrategy";
import SafariCookieQueryStrategy from "./SafariCookieQueryStrategy";
import CookieQueryStrategy from "./CookieQueryStrategy";
import ExportedCookie from "../ExportedCookie";
import LRUCache from "lru-cache";
import { red } from "colorette";
import { merge } from "lodash";
import { parsedArgs } from "../argv";

const cache: LRUCache<string, ExportedCookie[]> = new LRUCache<
  string,
  ExportedCookie[]
>({
  ttl: 1000 * 10,
  max: 10,
});

export default class CompositeCookieQueryStrategy
  implements CookieQueryStrategy
{
  browserName = "all";

  #strategies;

  constructor() {
    this.#strategies = [
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
    const cached = cache.get(key);
    if (cached) {
      return cached;
    }
    if (parsedArgs.verbose) {
      console.log("Querying cookies:", name, domain);
    }
    const results: ExportedCookie[][] = await Promise.all(
      this.#strategies.map(async (strategy: CookieQueryStrategy) => {
        // @ts-ignore
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
            console.log(
              red(`Error querying ${strategy.browserName} cookies`),
              e
            );
            return [];
          });
      })
    );
    const flat: ExportedCookie[] = results.flat();
    cache.set(`${name}:${domain}`, flat);
    return flat;
  }
}

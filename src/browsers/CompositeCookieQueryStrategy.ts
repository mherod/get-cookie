import ChromeCookieQueryStrategy from "./chrome/ChromeCookieQueryStrategy";
import FirefoxCookieQueryStrategy from "./firefox/FirefoxCookieQueryStrategy";
import SafariCookieQueryStrategy from "./safari/SafariCookieQueryStrategy";
import CookieQueryStrategy from "./CookieQueryStrategy";
import ExportedCookie from "../ExportedCookie";
import LRUCache from "lru-cache";
import { merge } from "lodash";
import { flatMapAsync } from "../util/flatMapAsync";
import consola from "../logger";

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
  browserName: string = "all";

  private readonly strategies: CookieQueryStrategy[];

  constructor() {
    this.strategies = [
      ChromeCookieQueryStrategy,
      FirefoxCookieQueryStrategy,
      SafariCookieQueryStrategy,
    ].map((Strategy) => new Strategy());
  }

  async queryCookies(name: string, domain: string): Promise<ExportedCookie[]> {
    const key: string = `${name}:${domain}`;
    consola.info(`Querying cookies for name: ${name}, domain: ${domain}`);
    if (cache.has(key)) {
      const cached: ExportedCookie[] | undefined = cache.get(key);
      if (cached) {
        consola.info(
          `Cache hit for key: ${key}, returning ${cached.length} cookies`,
        );
        return cached;
      }
    }
    const results: ExportedCookie[] = await flatMapAsync(
      this.strategies,
      async (strategy) => {
        try {
          const cookies: ExportedCookie[] = await strategy.queryCookies(
            name,
            domain,
          );
          return cookies.map((cookie: ExportedCookie) =>
            merge(cookie, {
              meta: {
                browser: strategy.browserName,
              },
            }),
          );
        } catch (e) {
          consola.error(
            `Error querying cookies for ${name} on ${domain} using ${strategy.browserName}`,
            e,
          );
          return [];
        }
      },
    );
    cache.set(key, results);
    consola.info(
      `Query result size for key: ${key} is ${results.length} cookies`,
    );
    return results;
  }
}

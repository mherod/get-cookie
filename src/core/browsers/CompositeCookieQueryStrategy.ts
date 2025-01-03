import { flatMapAsync } from "@utils/flatMapAsync";
import logger from "@utils/logger";

import type { CookieQueryStrategy } from "../../types/CookieQueryStrategy";
import type { ExportedCookie } from "../../types/ExportedCookie";

import { ChromeCookieQueryStrategy } from "./chrome/ChromeCookieQueryStrategy";
import { FirefoxCookieQueryStrategy } from "./firefox/FirefoxCookieQueryStrategy";
import { SafariCookieQueryStrategy } from "./safari/SafariCookieQueryStrategy";

type CookieStrategyConstructor = new () => CookieQueryStrategy;

/**
 * A composite strategy that combines multiple cookie query strategies
 * This allows querying cookies from multiple browsers simultaneously
 *
 * @example
 */
export class CompositeCookieQueryStrategy implements CookieQueryStrategy {
  /**
   *
   */
  public browserName = "all";

  private readonly strategies: CookieStrategyConstructor[];

  /**
   * Initializes with an empty array of strategies that can be added later
   */
  public constructor() {
    this.strategies = [
      ChromeCookieQueryStrategy,
      FirefoxCookieQueryStrategy,
      SafariCookieQueryStrategy,
    ];
  }

  /**
   * Queries cookies from all registered strategies
   *
   * @param name - The name pattern to match cookies against
   * @param domain - The domain pattern to match cookies against
   * @returns A promise that resolves to an array of exported cookies from all strategies
   */
  public async queryCookies(
    name: string,
    domain: string,
  ): Promise<ExportedCookie[]> {
    logger.info(`Querying cookies for name: ${name}, domain: ${domain}`);

    return flatMapAsync(this.strategies, async (Strategy) => {
      try {
        const strategy = new Strategy();
        const cookies = await strategy.queryCookies(name, domain);
        return cookies;
      } catch (error) {
        if (error instanceof Error) {
          logger.error(`Error querying ${Strategy.name}: ${error.message}`);
        } else {
          logger.error(`Error querying ${Strategy.name}: Unknown error`);
        }
        return [];
      }
    });
  }
}

import { ChromeCookieQueryStrategy } from "@core/browsers/chrome/ChromeCookieQueryStrategy";
import { CompositeCookieQueryStrategy } from "@core/browsers/CompositeCookieQueryStrategy";
import { FirefoxCookieQueryStrategy } from "@core/browsers/firefox/FirefoxCookieQueryStrategy";
import { SafariCookieQueryStrategy } from "@core/browsers/safari/SafariCookieQueryStrategy";

export type CookieQueryStrategy = CompositeCookieQueryStrategy | ChromeCookieQueryStrategy | FirefoxCookieQueryStrategy | SafariCookieQueryStrategy;

/**
 * Factory class for creating browser-specific cookie query strategies
 */
export class CookieStrategyFactory {
  private static readonly strategies = new Map<string, new () => CookieQueryStrategy>([
    ["safari", SafariCookieQueryStrategy],
    ["firefox", FirefoxCookieQueryStrategy],
    ["chrome", ChromeCookieQueryStrategy],
  ]);

  private static readonly strategyCache = new Map<string, CookieQueryStrategy>();

  private constructor() {} // Prevent instantiation

  /**
   * Creates a cookie query strategy based on the specified browsers
   * @param browsers - List of browsers to create strategy for
   * @returns A cookie query strategy instance
   * @example
   * // Create a strategy for Safari
   * const strategy = CookieStrategyFactory.createStrategy(['safari']);
   */
  public static createStrategy(browsers: string[]): CookieQueryStrategy {
    const browserType = browsers[0];
    const cacheKey = browsers.length === 0 ? "all" : browserType;

    const cachedStrategy = this.strategyCache.get(cacheKey);
    if (cachedStrategy) {
      return cachedStrategy;
    }

    const StrategyClass = this.strategies.get(browserType);
    let strategy: CookieQueryStrategy;

    if (StrategyClass) {
      strategy = new StrategyClass();
    } else {
      strategy = new CompositeCookieQueryStrategy([
        new ChromeCookieQueryStrategy(),
        new FirefoxCookieQueryStrategy(),
        new SafariCookieQueryStrategy(),
      ]);
    }

    this.strategyCache.set(cacheKey, strategy);
    return strategy;
  }
}

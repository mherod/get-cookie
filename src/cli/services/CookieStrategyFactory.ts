import { ChromeCookieQueryStrategy } from "@core/browsers/chrome/ChromeCookieQueryStrategy";
import { CompositeCookieQueryStrategy } from "@core/browsers/CompositeCookieQueryStrategy";
import { FirefoxCookieQueryStrategy } from "@core/browsers/firefox/FirefoxCookieQueryStrategy";
import { SafariCookieQueryStrategy } from "@core/browsers/safari/SafariCookieQueryStrategy";

/**
 * Represents a strategy for querying cookies from a browser
 */
export type CookieQueryStrategy =
  | CompositeCookieQueryStrategy
  | ChromeCookieQueryStrategy
  | FirefoxCookieQueryStrategy
  | SafariCookieQueryStrategy;

/**
 * Factory for creating browser-specific cookie query strategies
 */
export const CookieStrategyFactory = {
  strategies: new Map<string, new () => CookieQueryStrategy>([
    ["safari", SafariCookieQueryStrategy],
    ["firefox", FirefoxCookieQueryStrategy],
    ["chrome", ChromeCookieQueryStrategy],
  ]),

  /**
   * Creates a strategy for the specified browser
   * @param browser - The browser to create a strategy for
   * @returns A cookie query strategy for the specified browser
   */
  createStrategy(browser?: string): CookieQueryStrategy {
    if (typeof browser !== "string") {
      return new CompositeCookieQueryStrategy([
        new SafariCookieQueryStrategy(),
        new FirefoxCookieQueryStrategy(),
        new ChromeCookieQueryStrategy(),
      ]);
    }

    const Strategy = this.strategies.get(browser.toLowerCase());
    if (Strategy !== undefined) {
      return new Strategy();
    }

    return new CompositeCookieQueryStrategy([
      new SafariCookieQueryStrategy(),
      new FirefoxCookieQueryStrategy(),
      new ChromeCookieQueryStrategy(),
    ]);
  },
};

import { ChromeCookieQueryStrategy } from "@core/browsers/chrome/ChromeCookieQueryStrategy";
import { CompositeCookieQueryStrategy } from "@core/browsers/CompositeCookieQueryStrategy";
import { FirefoxCookieQueryStrategy } from "@core/browsers/firefox/FirefoxCookieQueryStrategy";
import { SafariCookieQueryStrategy } from "@core/browsers/safari/SafariCookieQueryStrategy";

import { CookieStrategyFactory } from "../CookieStrategyFactory";

describe("CookieStrategyFactory - Composite Strategy Composition", () => {
  let compositeStrategy: CompositeCookieQueryStrategy;

  beforeEach(() => {
    // Clear the strategy cache before each test
    // @ts-ignore - accessing private field for testing
    CookieStrategyFactory["strategyCache"].clear();
    compositeStrategy = CookieStrategyFactory.createStrategy([]) as CompositeCookieQueryStrategy;
  });

  it("should include all browser strategies in composite strategy", () => {
    // @ts-ignore - accessing private field for testing
    const strategies = compositeStrategy["strategies"];
    expect(strategies).toHaveLength(3);
    expect(strategies.some(s => s instanceof ChromeCookieQueryStrategy)).toBe(true);
    expect(strategies.some(s => s instanceof FirefoxCookieQueryStrategy)).toBe(true);
    expect(strategies.some(s => s instanceof SafariCookieQueryStrategy)).toBe(true);
  });

  it("should maintain strategy order in composite strategy", () => {
    // @ts-ignore - accessing private field for testing
    const strategies = compositeStrategy["strategies"];
    expect(strategies[0]).toBeInstanceOf(ChromeCookieQueryStrategy);
    expect(strategies[1]).toBeInstanceOf(FirefoxCookieQueryStrategy);
    expect(strategies[2]).toBeInstanceOf(SafariCookieQueryStrategy);
  });
});

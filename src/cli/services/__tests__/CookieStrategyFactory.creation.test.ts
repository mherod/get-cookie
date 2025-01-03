import { ChromeCookieQueryStrategy } from "@core/browsers/chrome/ChromeCookieQueryStrategy";
import { CompositeCookieQueryStrategy } from "@core/browsers/CompositeCookieQueryStrategy";
import { FirefoxCookieQueryStrategy } from "@core/browsers/firefox/FirefoxCookieQueryStrategy";
import { SafariCookieQueryStrategy } from "@core/browsers/safari/SafariCookieQueryStrategy";

import { CookieStrategyFactory } from "../CookieStrategyFactory";

describe("CookieStrategyFactory - Strategy Creation", () => {
  beforeEach(() => {
    // Clear the strategy cache before each test
    // @ts-ignore - accessing private field for testing
    CookieStrategyFactory["strategyCache"].clear();
  });

  it("should create a Safari strategy when 'safari' is specified", () => {
    const strategy = CookieStrategyFactory.createStrategy(["safari"]);
    expect(strategy).toBeInstanceOf(SafariCookieQueryStrategy);
  });

  it("should create a Firefox strategy when 'firefox' is specified", () => {
    const strategy = CookieStrategyFactory.createStrategy(["firefox"]);
    expect(strategy).toBeInstanceOf(FirefoxCookieQueryStrategy);
  });

  it("should create a Chrome strategy when 'chrome' is specified", () => {
    const strategy = CookieStrategyFactory.createStrategy(["chrome"]);
    expect(strategy).toBeInstanceOf(ChromeCookieQueryStrategy);
  });

  it("should create a composite strategy when no browser is specified", () => {
    const strategy = CookieStrategyFactory.createStrategy([]);
    expect(strategy).toBeInstanceOf(CompositeCookieQueryStrategy);
  });

  it("should create a composite strategy when an unknown browser is specified", () => {
    const strategy = CookieStrategyFactory.createStrategy(["unknown"]);
    expect(strategy).toBeInstanceOf(CompositeCookieQueryStrategy);
  });

  it("should be case-sensitive when matching browser types", () => {
    const strategy = CookieStrategyFactory.createStrategy(["SAFARI"]);
    expect(strategy).toBeInstanceOf(CompositeCookieQueryStrategy);
  });

  it("should ignore additional browsers in the array", () => {
    const strategy = CookieStrategyFactory.createStrategy(["safari", "chrome"]);
    expect(strategy).toBeInstanceOf(SafariCookieQueryStrategy);
  });
});
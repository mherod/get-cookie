import { CompositeCookieQueryStrategy } from "@core/browsers/CompositeCookieQueryStrategy";

import { CookieStrategyFactory } from "../CookieStrategyFactory";

describe("CookieStrategyFactory - Strategy Creation", () => {
  it("should create new instances for each call", () => {
    const strategy1 = CookieStrategyFactory.createStrategy("safari");
    const strategy2 = CookieStrategyFactory.createStrategy("safari");
    expect(strategy1).not.toBe(strategy2);
  });

  it("should create new composite instances for each call", () => {
    const strategy1 = CookieStrategyFactory.createStrategy();
    const strategy2 = CookieStrategyFactory.createStrategy();
    expect(strategy1).not.toBe(strategy2);
  });

  it("should create different instances for different browsers", () => {
    const safariStrategy = CookieStrategyFactory.createStrategy("safari");
    const firefoxStrategy = CookieStrategyFactory.createStrategy("firefox");
    expect(safariStrategy.constructor.name).not.toBe(
      firefoxStrategy.constructor.name,
    );
  });

  it("should create new composite instances for unknown browsers", () => {
    const strategy1 = CookieStrategyFactory.createStrategy("unknown");
    const strategy2 = CookieStrategyFactory.createStrategy("unknown");
    expect(strategy1).not.toBe(strategy2);
    expect(strategy1).toBeInstanceOf(CompositeCookieQueryStrategy);
    expect(strategy2).toBeInstanceOf(CompositeCookieQueryStrategy);
  });
});

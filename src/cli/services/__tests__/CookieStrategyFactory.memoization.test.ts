import { CookieStrategyFactory } from "../CookieStrategyFactory";

describe("CookieStrategyFactory - Memoization", () => {
  beforeEach(() => {
    // Clear the strategy cache before each test
    // @ts-ignore - accessing private field for testing
    CookieStrategyFactory["strategyCache"].clear();
  });

  it("should return the same instance when requesting the same browser strategy", () => {
    const strategy1 = CookieStrategyFactory.createStrategy(["safari"]);
    const strategy2 = CookieStrategyFactory.createStrategy(["safari"]);
    expect(strategy1).toBe(strategy2);
  });

  it("should return the same composite instance when no browser is specified", () => {
    const strategy1 = CookieStrategyFactory.createStrategy([]);
    const strategy2 = CookieStrategyFactory.createStrategy([]);
    expect(strategy1).toBe(strategy2);
  });

  it("should return different instances for different browsers", () => {
    const safariStrategy = CookieStrategyFactory.createStrategy(["safari"]);
    const firefoxStrategy = CookieStrategyFactory.createStrategy(["firefox"]);
    expect(safariStrategy).not.toBe(firefoxStrategy);
  });

  it("should cache composite strategy instances for unknown browsers", () => {
    const strategy1 = CookieStrategyFactory.createStrategy(["unknown1"]);
    const strategy2 = CookieStrategyFactory.createStrategy(["unknown1"]);
    expect(strategy1).toBe(strategy2);
  });

  it("should use different cache entries for different unknown browsers", () => {
    const strategy1 = CookieStrategyFactory.createStrategy(["unknown1"]);
    const strategy2 = CookieStrategyFactory.createStrategy(["unknown2"]);
    expect(strategy1).not.toBe(strategy2);
  });

  it("should maintain separate cache entries for empty array and unknown browser", () => {
    const emptyStrategy = CookieStrategyFactory.createStrategy([]);
    const unknownStrategy = CookieStrategyFactory.createStrategy(["unknown"]);
    expect(emptyStrategy).not.toBe(unknownStrategy);
  });
});

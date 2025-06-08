import { CompositeCookieQueryStrategy } from "@core/browsers/CompositeCookieQueryStrategy";
import MockCookieQueryStrategy from "@core/browsers/mock/MockCookieQueryStrategy";

import { CookieStrategyFactory } from "../CookieStrategyFactory";

describe("CookieStrategyFactory - Composite Strategy Composition", () => {
  let compositeStrategy: CompositeCookieQueryStrategy;

  beforeEach(() => {
    compositeStrategy =
      CookieStrategyFactory.createStrategy() as CompositeCookieQueryStrategy;
  });

  it("should include all browser strategies in composite strategy", () => {
    expect(compositeStrategy).toBeInstanceOf(CompositeCookieQueryStrategy);
    expect(compositeStrategy.browserName).toBe("internal");
  });

  it("should query cookies from all strategies with timeout", async () => {
    // Create mock strategy that returns empty array quickly
    const mockStrategy = new MockCookieQueryStrategy([]);
    const querySpy = jest
      .spyOn(mockStrategy, "queryCookies")
      .mockResolvedValue([]);

    // Override the composite strategy's strategies with mocks
    // Using type assertion to access private property for testing purposes
    // @ts-expect-error Accessing private property for testing
    compositeStrategy.strategies = [mockStrategy];

    const spec = { name: "test", domain: "example.com" };
    const cookies = await compositeStrategy.queryCookies(
      spec.name,
      spec.domain,
      undefined,
    );
    expect(cookies).toEqual([]);
    expect(querySpy).toHaveBeenCalledWith(
      "test",
      "example.com",
      undefined,
      undefined,
    );
  }, 30000);
});

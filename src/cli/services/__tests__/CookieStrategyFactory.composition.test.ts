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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    (compositeStrategy as any).strategies = [mockStrategy];

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

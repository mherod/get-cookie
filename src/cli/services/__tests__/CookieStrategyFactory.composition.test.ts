import { CompositeCookieQueryStrategy } from "@core/browsers/CompositeCookieQueryStrategy";

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

  it("should query cookies from all strategies", async () => {
    const spec = { name: "test", domain: "example.com" };
    const cookies = await compositeStrategy.queryCookies(
      spec.name,
      spec.domain,
      undefined,
    );
    expect(cookies).toEqual([]);
  }, 10000);
});

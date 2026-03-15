import { describe, it, expect } from "@jest/globals";

import { BaseCookieQueryStrategy } from "../BaseCookieQueryStrategy";
import { ArcCookieQueryStrategy } from "../arc/ArcCookieQueryStrategy";
import { BraveCookieQueryStrategy } from "../brave/BraveCookieQueryStrategy";
import { ChromeCookieQueryStrategy } from "../chrome/ChromeCookieQueryStrategy";
import { CompositeCookieQueryStrategy } from "../CompositeCookieQueryStrategy";
import { EdgeCookieQueryStrategy } from "../edge/EdgeCookieQueryStrategy";
import { FirefoxCookieQueryStrategy } from "../firefox/FirefoxCookieQueryStrategy";
import { OperaCookieQueryStrategy } from "../opera/OperaCookieQueryStrategy";
import { OperaGXCookieQueryStrategy } from "../opera/OperaGXCookieQueryStrategy";
import { SafariCookieQueryStrategy } from "../safari/SafariCookieQueryStrategy";
import { VivaldiCookieQueryStrategy } from "../vivaldi/VivaldiCookieQueryStrategy";
import { isValidBrowserType } from "../BrowserDetector";
import {
  createBrowserStrategy,
  createCompositeStrategy,
  createSelectiveCompositeStrategy,
  createStrategy,
  getAvailableBrowsers,
} from "../StrategyFactory";

describe("createBrowserStrategy", () => {
  it("returns a Chrome strategy for 'chrome'", () => {
    const strategy = createBrowserStrategy("chrome");
    expect(strategy).toBeInstanceOf(ChromeCookieQueryStrategy);
    expect(strategy).toBeInstanceOf(BaseCookieQueryStrategy);
  });

  it("returns a Firefox strategy for 'firefox'", () => {
    const strategy = createBrowserStrategy("firefox");
    expect(strategy).toBeInstanceOf(FirefoxCookieQueryStrategy);
    expect(strategy).toBeInstanceOf(BaseCookieQueryStrategy);
  });

  it("returns a Safari strategy for 'safari'", () => {
    const strategy = createBrowserStrategy("safari");
    expect(strategy).toBeInstanceOf(SafariCookieQueryStrategy);
    expect(strategy).toBeInstanceOf(BaseCookieQueryStrategy);
  });

  it("returns an Edge strategy for 'edge'", () => {
    const strategy = createBrowserStrategy("edge");
    expect(strategy).toBeInstanceOf(EdgeCookieQueryStrategy);
    expect(strategy).toBeInstanceOf(BaseCookieQueryStrategy);
  });

  it("returns an Arc strategy for 'arc'", () => {
    const strategy = createBrowserStrategy("arc");
    expect(strategy).toBeInstanceOf(ArcCookieQueryStrategy);
    expect(strategy).toBeInstanceOf(BaseCookieQueryStrategy);
  });

  it("returns a Brave strategy for 'brave'", () => {
    const strategy = createBrowserStrategy("brave");
    expect(strategy).toBeInstanceOf(BraveCookieQueryStrategy);
    expect(strategy).toBeInstanceOf(BaseCookieQueryStrategy);
  });

  it("returns an Opera strategy for 'opera'", () => {
    const strategy = createBrowserStrategy("opera");
    expect(strategy).toBeInstanceOf(OperaCookieQueryStrategy);
    expect(strategy).toBeInstanceOf(BaseCookieQueryStrategy);
  });

  it("returns an Opera GX strategy for 'opera-gx'", () => {
    const strategy = createBrowserStrategy("opera-gx");
    expect(strategy).toBeInstanceOf(OperaGXCookieQueryStrategy);
    expect(strategy).toBeInstanceOf(BaseCookieQueryStrategy);
  });

  it("returns a Vivaldi strategy for 'vivaldi'", () => {
    const strategy = createBrowserStrategy("vivaldi");
    expect(strategy).toBeInstanceOf(VivaldiCookieQueryStrategy);
    expect(strategy).toBeInstanceOf(BaseCookieQueryStrategy);
  });
});

describe("createCompositeStrategy", () => {
  it("returns a CompositeCookieQueryStrategy", () => {
    const strategy = createCompositeStrategy();
    expect(strategy).toBeInstanceOf(CompositeCookieQueryStrategy);
  });

  // This count assertion ties createCompositeStrategy to STRATEGY_REGISTRY size.
  // If a browser is added to STRATEGY_REGISTRY (and getAvailableBrowsers grows),
  // this test fails — prompting the developer to also update createCompositeStrategy.
  it("covers the same number of browsers as the strategy registry", () => {
    const registrySize = getAvailableBrowsers().length;
    // createCompositeStrategy hardcodes strategies — this must stay in sync.
    // Currently: chrome, edge, arc, opera, opera-gx, brave, firefox, safari, vivaldi = 9.
    expect(registrySize).toBe(9);
  });
});

describe("createSelectiveCompositeStrategy", () => {
  it("returns a CompositeCookieQueryStrategy for a non-empty browser list", () => {
    const strategy = createSelectiveCompositeStrategy(["chrome", "firefox"]);
    expect(strategy).toBeInstanceOf(CompositeCookieQueryStrategy);
  });

  it("falls back to the full composite when given an empty array", () => {
    const full = createCompositeStrategy();
    const fromEmpty = createSelectiveCompositeStrategy([]);
    // Both should be CompositeCookieQueryStrategy instances
    expect(fromEmpty).toBeInstanceOf(CompositeCookieQueryStrategy);
    expect(full).toBeInstanceOf(CompositeCookieQueryStrategy);
  });
});

describe("createStrategy", () => {
  it("returns a Chrome strategy when browser is 'chrome'", () => {
    const strategy = createStrategy({ browser: "chrome" });
    expect(strategy).toBeInstanceOf(ChromeCookieQueryStrategy);
  });

  it("returns a Chrome strategy with profile when profile is supplied", () => {
    const strategy = createStrategy({
      browser: "chrome",
      profile: "Profile 1",
    });
    expect(strategy).toBeInstanceOf(ChromeCookieQueryStrategy);
  });

  it("returns a composite strategy when no browser is specified", () => {
    const strategy = createStrategy();
    expect(strategy).toBeInstanceOf(CompositeCookieQueryStrategy);
  });

  it("returns a composite strategy when an invalid browser is specified", () => {
    const strategy = createStrategy({ browser: "INVALID_BROWSER" });
    expect(strategy).toBeInstanceOf(CompositeCookieQueryStrategy);
  });

  it("does not throw when an invalid browser is specified", () => {
    expect(() => createStrategy({ browser: "netscape" })).not.toThrow();
  });

  it("returns a composite strategy when called with an empty options object", () => {
    const strategy = createStrategy({});
    expect(strategy).toBeInstanceOf(CompositeCookieQueryStrategy);
  });
});

describe("getAvailableBrowsers", () => {
  it("includes all known browser types", () => {
    const browsers = getAvailableBrowsers();
    expect(browsers).toContain("chrome");
    expect(browsers).toContain("firefox");
    expect(browsers).toContain("safari");
    expect(browsers).toContain("edge");
    expect(browsers).toContain("arc");
    expect(browsers).toContain("brave");
    expect(browsers).toContain("opera");
    expect(browsers).toContain("opera-gx");
    expect(browsers).toContain("vivaldi");
  });

  it("returns exactly 9 browsers matching the current registry", () => {
    expect(getAvailableBrowsers()).toHaveLength(9);
  });
});

describe("isValidBrowserType", () => {
  it("returns true for 'chrome'", () => {
    expect(isValidBrowserType("chrome")).toBe(true);
  });

  it("returns true for 'firefox'", () => {
    expect(isValidBrowserType("firefox")).toBe(true);
  });

  it("returns true for 'safari'", () => {
    expect(isValidBrowserType("safari")).toBe(true);
  });

  it("returns true for 'edge'", () => {
    expect(isValidBrowserType("edge")).toBe(true);
  });

  it("returns true for 'arc'", () => {
    expect(isValidBrowserType("arc")).toBe(true);
  });

  it("returns true for 'brave'", () => {
    expect(isValidBrowserType("brave")).toBe(true);
  });

  it("returns true for 'opera'", () => {
    expect(isValidBrowserType("opera")).toBe(true);
  });

  it("returns true for 'opera-gx'", () => {
    expect(isValidBrowserType("opera-gx")).toBe(true);
  });

  it("returns true for 'vivaldi'", () => {
    expect(isValidBrowserType("vivaldi")).toBe(true);
  });

  it("returns false for 'netscape'", () => {
    expect(isValidBrowserType("netscape")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isValidBrowserType("")).toBe(false);
  });

  it("returns false for 'CHROME' (case-sensitive)", () => {
    expect(isValidBrowserType("CHROME")).toBe(false);
  });
});

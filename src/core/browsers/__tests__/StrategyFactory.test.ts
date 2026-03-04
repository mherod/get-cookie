import { describe, it, expect } from "@jest/globals";

import { BaseCookieQueryStrategy } from "../BaseCookieQueryStrategy";
import { ArcCookieQueryStrategy } from "../arc/ArcCookieQueryStrategy";
import { ChromeCookieQueryStrategy } from "../chrome/ChromeCookieQueryStrategy";
import { CompositeCookieQueryStrategy } from "../CompositeCookieQueryStrategy";
import { EdgeCookieQueryStrategy } from "../edge/EdgeCookieQueryStrategy";
import { FirefoxCookieQueryStrategy } from "../firefox/FirefoxCookieQueryStrategy";
import { OperaCookieQueryStrategy } from "../opera/OperaCookieQueryStrategy";
import { OperaGXCookieQueryStrategy } from "../opera/OperaGXCookieQueryStrategy";
import { SafariCookieQueryStrategy } from "../safari/SafariCookieQueryStrategy";
import {
  createBrowserStrategy,
  createCompositeStrategy,
  createSelectiveCompositeStrategy,
  createStrategy,
  getAvailableBrowsers,
  isBrowserSupported,
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
    // Currently: chrome, edge, arc, opera, opera-gx, firefox, safari = 7.
    expect(registrySize).toBe(7);
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
    expect(browsers).toContain("opera");
    expect(browsers).toContain("opera-gx");
  });

  it("returns exactly 7 browsers matching the current registry", () => {
    expect(getAvailableBrowsers()).toHaveLength(7);
  });
});

describe("isBrowserSupported", () => {
  it("returns true for 'chrome'", () => {
    expect(isBrowserSupported("chrome")).toBe(true);
  });

  it("returns true for 'firefox'", () => {
    expect(isBrowserSupported("firefox")).toBe(true);
  });

  it("returns true for 'safari'", () => {
    expect(isBrowserSupported("safari")).toBe(true);
  });

  it("returns true for 'edge'", () => {
    expect(isBrowserSupported("edge")).toBe(true);
  });

  it("returns true for 'arc'", () => {
    expect(isBrowserSupported("arc")).toBe(true);
  });

  it("returns true for 'opera'", () => {
    expect(isBrowserSupported("opera")).toBe(true);
  });

  it("returns true for 'opera-gx'", () => {
    expect(isBrowserSupported("opera-gx")).toBe(true);
  });

  it("returns false for 'netscape'", () => {
    expect(isBrowserSupported("netscape")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isBrowserSupported("")).toBe(false);
  });

  it("returns false for 'CHROME' (case-sensitive)", () => {
    expect(isBrowserSupported("CHROME")).toBe(false);
  });
});

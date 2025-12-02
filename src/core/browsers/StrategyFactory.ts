/**
 * Factory for creating browser-specific cookie query strategies
 * @module StrategyFactory
 */

import { createTaggedLogger } from "@utils/logHelpers";

import { ArcCookieQueryStrategy } from "./arc/ArcCookieQueryStrategy";
import type { BaseCookieQueryStrategy } from "./BaseCookieQueryStrategy";
import {
  type BrowserType,
  detectBrowserFromStore,
  isValidBrowserType,
} from "./BrowserDetector";
import { ChromeCookieQueryStrategy } from "./chrome/ChromeCookieQueryStrategy";
import { CompositeCookieQueryStrategy } from "./CompositeCookieQueryStrategy";
import { EdgeCookieQueryStrategy } from "./edge/EdgeCookieQueryStrategy";
import { FirefoxCookieQueryStrategy } from "./firefox/FirefoxCookieQueryStrategy";
import { OperaCookieQueryStrategy } from "./opera/OperaCookieQueryStrategy";
import { OperaGXCookieQueryStrategy } from "./opera/OperaGXCookieQueryStrategy";
import { SafariCookieQueryStrategy } from "./safari/SafariCookieQueryStrategy";

/**
 * A strategy that can query cookies - either a single browser or composite
 */
export type AnyQueryStrategy =
  | BaseCookieQueryStrategy
  | CompositeCookieQueryStrategy;

const logger = createTaggedLogger("StrategyFactory");

/**
 * Strategy constructor type
 */
type StrategyConstructor = new (profile?: string) => BaseCookieQueryStrategy;

/**
 * Registry of browser strategies
 */
const STRATEGY_REGISTRY: Record<BrowserType, StrategyConstructor> = {
  safari: SafariCookieQueryStrategy,
  firefox: FirefoxCookieQueryStrategy,
  chrome: ChromeCookieQueryStrategy,
  edge: EdgeCookieQueryStrategy,
  arc: ArcCookieQueryStrategy,
  opera: OperaCookieQueryStrategy,
  "opera-gx": OperaGXCookieQueryStrategy,
};

/**
 * Creates a strategy for the specified browser
 * @param browser - The browser to create a strategy for
 * @returns A cookie query strategy for the specified browser
 */
export function createBrowserStrategy(
  browser: BrowserType,
): BaseCookieQueryStrategy {
  const Strategy = STRATEGY_REGISTRY[browser];
  logger.debug("Creating browser strategy", { browser });
  return new Strategy();
}

/**
 * Creates a composite strategy with all browser strategies
 * @returns A composite strategy that queries all browsers
 */
export function createCompositeStrategy(): CompositeCookieQueryStrategy {
  logger.debug("Creating composite strategy with all browsers");
  // Use the existing CompositeCookieQueryStrategy which already knows
  // how to combine all browser strategies
  const strategies = [
    new ChromeCookieQueryStrategy(),
    new EdgeCookieQueryStrategy(),
    new ArcCookieQueryStrategy(),
    new OperaCookieQueryStrategy(),
    new OperaGXCookieQueryStrategy(),
    new FirefoxCookieQueryStrategy(),
    new SafariCookieQueryStrategy(),
  ];

  return new CompositeCookieQueryStrategy(strategies);
}

/**
 * Creates a composite strategy with selected browser strategies
 * @param browsers - Array of browser types to include
 * @returns A composite strategy that queries selected browsers
 */
export function createSelectiveCompositeStrategy(
  browsers: BrowserType[],
): CompositeCookieQueryStrategy {
  logger.debug("Creating selective composite strategy", { browsers });

  const strategies = browsers.map((browser) => {
    const Strategy = STRATEGY_REGISTRY[browser];
    return new Strategy();
  });

  if (strategies.length === 0) {
    logger.warn("No valid strategies found, using full composite");
    return createCompositeStrategy();
  }

  return new CompositeCookieQueryStrategy(strategies);
}

/**
 * Creates a Chrome strategy with profile if specified
 * @param profile - Optional browser profile name
 * @returns Chrome cookie query strategy
 */
function createChromeStrategyWithProfile(
  profile: string | undefined,
): BaseCookieQueryStrategy {
  if (profile !== undefined) {
    logger.debug("Creating Chrome strategy with profile", { profile });
    return new ChromeCookieQueryStrategy(profile);
  }
  return new ChromeCookieQueryStrategy();
}

/**
 * Creates a strategy based on browser type or store path
 * @param options - Options for strategy creation
 * @param options.browser - Optional browser type
 * @param options.storePath - Optional path to a cookie store file
 * @param options.profile - Optional browser profile name
 * @returns A cookie query strategy
 */
export function createStrategy(options?: {
  browser?: string;
  storePath?: string;
  profile?: string;
}): AnyQueryStrategy {
  const { browser, storePath, profile } = options ?? {};

  // If store path is provided, try to detect the browser type
  if (storePath !== undefined && browser === undefined) {
    const detectedBrowser = detectBrowserFromStore(storePath);
    if (detectedBrowser !== undefined) {
      logger.info("Auto-detected browser from store path", {
        browser: detectedBrowser,
        storePath,
      });
      return createBrowserStrategy(detectedBrowser);
    }
  }

  // If browser is specified, normalize to lowercase and check if valid
  if (browser !== undefined) {
    const normalizedBrowser = browser.toLowerCase();
    if (isValidBrowserType(normalizedBrowser)) {
      // Special handling for Chrome with profile
      if (normalizedBrowser === "chrome") {
        return createChromeStrategyWithProfile(profile);
      }
      return createBrowserStrategy(normalizedBrowser);
    }
    // Log warning for invalid browser type
    logger.warn("Invalid browser type specified", { browser });
  }

  // Default to composite strategy
  logger.debug("Creating composite strategy as default");
  return createCompositeStrategy();
}

/**
 * Gets all available browser types
 * @returns Array of available browser types
 */
export function getAvailableBrowsers(): BrowserType[] {
  return Object.keys(STRATEGY_REGISTRY) as BrowserType[];
}

/**
 * Checks if a browser is supported
 * @param browser - The browser to check
 * @returns True if the browser is supported
 */
export function isBrowserSupported(browser: string): boolean {
  return isValidBrowserType(browser);
}

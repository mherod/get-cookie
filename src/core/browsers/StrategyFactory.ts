/**
 * Factory for creating browser-specific cookie query strategies
 * @module StrategyFactory
 */

import { createTaggedLogger } from "@utils/logHelpers";

import type { BaseCookieQueryStrategy } from "./BaseCookieQueryStrategy";
import {
  type BrowserType,
  detectBrowserFromStore,
  isValidBrowserType,
} from "./BrowserDetector";
import { ChromeCookieQueryStrategy } from "./chrome/ChromeCookieQueryStrategy";
import type { ChromiumBrowser } from "./chrome/ChromiumBrowsers";
import { ChromiumCookieQueryStrategy } from "./chromium/ChromiumCookieQueryStrategy";
import { CompositeCookieQueryStrategy } from "./CompositeCookieQueryStrategy";
import { FirefoxCookieQueryStrategy } from "./firefox/FirefoxCookieQueryStrategy";
import { SafariCookieQueryStrategy } from "./safari/SafariCookieQueryStrategy";

/**
 * A strategy that can query cookies - either a single browser or composite
 */
export type AnyQueryStrategy =
  | BaseCookieQueryStrategy
  | CompositeCookieQueryStrategy;

const logger = createTaggedLogger("StrategyFactory");

const AVAILABLE_BROWSERS: BrowserType[] = [
  "chrome",
  "edge",
  "arc",
  "brave",
  "opera",
  "opera-gx",
  "vivaldi",
  "firefox",
  "safari",
];

const CHROMIUM_BROWSERS: Set<string> = new Set([
  "chrome",
  "edge",
  "arc",
  "brave",
  "opera",
  "opera-gx",
  "vivaldi",
]);

/**
 * Creates a strategy for the specified browser
 *
 * @param browser - The browser to create a strategy for
 * @param profile - Optional profile name to target (supported by Chromium-based browsers)
 * @param container - Optional Firefox container name, ID, or "none"
 * @returns A cookie query strategy for the specified browser
 */
export function createBrowserStrategy(
  browser: BrowserType,
  profile?: string,
  container?: string | number,
): BaseCookieQueryStrategy {
  logger.debug("Creating browser strategy", { browser, profile, container });

  if (container !== undefined && browser !== "firefox") {
    logger.warn(
      `--container option is only supported for Firefox, ignoring for ${browser}`,
    );
  }

  if (browser === "safari") {
    return new SafariCookieQueryStrategy();
  }

  if (browser === "firefox") {
    return new FirefoxCookieQueryStrategy(profile, container);
  }

  if (browser === "chrome") {
    return new ChromeCookieQueryStrategy(profile);
  }

  if (CHROMIUM_BROWSERS.has(browser)) {
    return new ChromiumCookieQueryStrategy(browser as ChromiumBrowser, profile);
  }

  return new ChromiumCookieQueryStrategy("chrome", profile);
}

/**
 * Creates a composite strategy with all browser strategies
 * @returns A composite strategy that queries all browsers
 */
export function createCompositeStrategy(): CompositeCookieQueryStrategy {
  logger.debug("Creating composite strategy with all browsers");
  const strategies = AVAILABLE_BROWSERS.map((browser) =>
    createBrowserStrategy(browser),
  );
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

  const strategies = browsers.map((browser) => createBrowserStrategy(browser));

  if (strategies.length === 0) {
    logger.warn("No valid strategies found, using full composite");
    return createCompositeStrategy();
  }

  return new CompositeCookieQueryStrategy(strategies);
}

/**
 * Creates a strategy based on browser type or store path
 * @param options - Options for strategy creation
 * @param options.browser - Optional browser type
 * @param options.storePath - Optional path to a cookie store file
 * @param options.profile - Optional browser profile name (supported by all Chromium-based browsers)
 * @param options.container - Optional Firefox container name, ID, or "none"
 * @returns A cookie query strategy
 */
export function createStrategy(options?: {
  browser?: string;
  storePath?: string;
  profile?: string;
  container?: string | number;
}): AnyQueryStrategy {
  const { browser, storePath, profile, container } = options ?? {};

  // If store path is provided, try to detect the browser type
  if (storePath !== undefined && browser === undefined) {
    const detectedBrowser = detectBrowserFromStore(storePath);
    if (detectedBrowser !== undefined) {
      logger.info("Auto-detected browser from store path", {
        browser: detectedBrowser,
        storePath,
      });
      return createBrowserStrategy(detectedBrowser, profile, container);
    }
  }

  // If browser is specified, normalize to lowercase and check if valid
  if (browser !== undefined) {
    const normalizedBrowser = browser.toLowerCase();
    if (isValidBrowserType(normalizedBrowser)) {
      return createBrowserStrategy(normalizedBrowser, profile, container);
    }
    logger.warn("Invalid browser type specified", { browser });
  }

  // Default to composite strategy (queries all browsers)
  logger.debug("Creating composite strategy as default");
  return createCompositeStrategy();
}

/**
 * Gets all available browser types
 * @returns Array of available browser types
 */
export function getAvailableBrowsers(): BrowserType[] {
  return [...AVAILABLE_BROWSERS];
}

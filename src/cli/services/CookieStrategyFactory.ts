/**
 * CLI adapter for browser cookie query strategies
 * Delegates to core browser modules for actual functionality
 */

import { detectBrowserFromStore } from "@core/browsers/BrowserDetector";
import {
  type AnyQueryStrategy,
  createStrategy as createCoreStrategy,
} from "@core/browsers/StrategyFactory";

/**
 * Represents a strategy for querying cookies from a browser
 * This is a type alias for the base strategy to maintain backward compatibility
 */
export type CookieQueryStrategy = AnyQueryStrategy;

/**
 * Factory for creating browser-specific cookie query strategies
 * This is now a thin wrapper around the core StrategyFactory
 */
export const CookieStrategyFactory = {
  /**
   * Detects the cookie store type from a file path
   * @param storePath - Path to the cookie store file
   * @returns The detected browser type or undefined
   * @deprecated Use detectBrowserFromStore from @core/browsers/BrowserDetector
   */
  detectStoreType(storePath: string): string | undefined {
    return detectBrowserFromStore(storePath);
  },

  /**
   * Creates a strategy for the specified browser
   * @param browser - The browser to create a strategy for
   * @param storePath - Optional path to a cookie store file
   * @returns A cookie query strategy for the specified browser
   */
  createStrategy(browser?: string, storePath?: string): CookieQueryStrategy {
    // Delegate to the core strategy factory
    // Only pass defined values to avoid exactOptionalPropertyTypes issues
    const options: Parameters<typeof createCoreStrategy>[0] = {};
    if (browser !== undefined) {
      options.browser = browser;
    }
    if (storePath !== undefined) {
      options.storePath = storePath;
    }
    return createCoreStrategy(options);
  },
};

import { existsSync, readFileSync } from "node:fs";

import { ArcCookieQueryStrategy } from "@core/browsers/arc/ArcCookieQueryStrategy";
import { ChromeCookieQueryStrategy } from "@core/browsers/chrome/ChromeCookieQueryStrategy";
import { CompositeCookieQueryStrategy } from "@core/browsers/CompositeCookieQueryStrategy";
import { EdgeCookieQueryStrategy } from "@core/browsers/edge/EdgeCookieQueryStrategy";
import { FirefoxCookieQueryStrategy } from "@core/browsers/firefox/FirefoxCookieQueryStrategy";
import { OperaCookieQueryStrategy } from "@core/browsers/opera/OperaCookieQueryStrategy";
import { OperaGXCookieQueryStrategy } from "@core/browsers/opera/OperaGXCookieQueryStrategy";
import { SafariCookieQueryStrategy } from "@core/browsers/safari/SafariCookieQueryStrategy";

/**
 * Represents a strategy for querying cookies from a browser
 */
export type CookieQueryStrategy =
  | CompositeCookieQueryStrategy
  | ChromeCookieQueryStrategy
  | EdgeCookieQueryStrategy
  | ArcCookieQueryStrategy
  | OperaCookieQueryStrategy
  | OperaGXCookieQueryStrategy
  | FirefoxCookieQueryStrategy
  | SafariCookieQueryStrategy;

/**
 * Factory for creating browser-specific cookie query strategies
 */
export const CookieStrategyFactory = {
  strategies: new Map<string, new () => CookieQueryStrategy>([
    ["safari", SafariCookieQueryStrategy],
    ["firefox", FirefoxCookieQueryStrategy],
    ["chrome", ChromeCookieQueryStrategy],
    ["edge", EdgeCookieQueryStrategy],
    ["arc", ArcCookieQueryStrategy],
    ["opera", OperaCookieQueryStrategy],
    ["opera-gx", OperaGXCookieQueryStrategy],
  ]),

  /**
   * Detects the cookie store type from a file path
   * @param storePath - Path to the cookie store file
   * @returns The detected browser type or undefined
   */
  detectStoreType(storePath: string): string | undefined {
    if (!storePath || !existsSync(storePath)) {
      return undefined;
    }

    // Check for Safari binary cookies format
    try {
      const buffer = readFileSync(storePath, { encoding: null });
      const magic = buffer.subarray(0, 4).toString("ascii");
      if (magic === "cook") {
        return "safari";
      }
    } catch {
      // Not a binary file or can't read
    }

    // Check filename patterns
    const filename = storePath.toLowerCase();
    if (filename.includes("binarycookie")) {
      return "safari";
    }
    if (filename.includes("firefox") || filename.includes("mozilla")) {
      return "firefox";
    }
    if (filename.includes("chrome") || filename.includes("chromium")) {
      return "chrome";
    }
    if (filename.includes("edge") || filename.includes("microsoft")) {
      return "edge";
    }
    if (filename.includes("arc")) {
      return "arc";
    }
    if (filename.includes("operagx") || filename.includes("opera-gx")) {
      return "opera-gx";
    }
    if (filename.includes("opera")) {
      return "opera";
    }

    // Default to trying all strategies
    return undefined;
  },

  /**
   * Creates a strategy for the specified browser
   * @param browser - The browser to create a strategy for
   * @param storePath - Optional path to a cookie store file
   * @returns A cookie query strategy for the specified browser
   */
  createStrategy(browser?: string, storePath?: string): CookieQueryStrategy {
    // If store path is provided, try to detect the browser type
    if (storePath !== undefined && browser === undefined) {
      const detectedBrowser = this.detectStoreType(storePath);
      if (detectedBrowser !== undefined) {
        const Strategy = this.strategies.get(detectedBrowser);
        if (Strategy) {
          return new Strategy();
        }
      }
    }

    if (typeof browser !== "string") {
      return new CompositeCookieQueryStrategy([
        new ChromeCookieQueryStrategy(),
        new EdgeCookieQueryStrategy(),
        new ArcCookieQueryStrategy(),
        new OperaCookieQueryStrategy(),
        new OperaGXCookieQueryStrategy(),
        new FirefoxCookieQueryStrategy(),
        new SafariCookieQueryStrategy(),
      ]);
    }

    const Strategy = this.strategies.get(browser.toLowerCase());
    if (Strategy !== undefined) {
      return new Strategy();
    }

    return new CompositeCookieQueryStrategy([
      new ChromeCookieQueryStrategy(),
      new EdgeCookieQueryStrategy(),
      new ArcCookieQueryStrategy(),
      new OperaCookieQueryStrategy(),
      new OperaGXCookieQueryStrategy(),
      new FirefoxCookieQueryStrategy(),
      new SafariCookieQueryStrategy(),
    ]);
  },
};

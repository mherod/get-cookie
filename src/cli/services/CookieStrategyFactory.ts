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
    if (checkSafariMagicBytes(storePath)) {
      return "safari";
    }

    // Check filename patterns
    return detectFromFilename(storePath);
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

/**
 * Checks if a file contains Safari binary cookies magic bytes
 * @param storePath - Path to the cookie store file
 * @returns True if the file has Safari's binary cookie format signature
 */
function checkSafariMagicBytes(storePath: string): boolean {
  try {
    const buffer = readFileSync(storePath);
    // Safari binary cookies start with "cook" magic bytes
    return (
      buffer.length >= 4 &&
      buffer[0] === 0x63 && // 'c'
      buffer[1] === 0x6f && // 'o'
      buffer[2] === 0x6f && // 'o'
      buffer[3] === 0x6b
    ); // 'k'
  } catch {
    return false;
  }
}

/**
 * Detects browser type from filename patterns
 * @param storePath - Path to the cookie store file
 * @returns The detected browser type or undefined
 */
function detectFromFilename(storePath: string): string | undefined {
  const filename = storePath.toLowerCase();

  if (filename.includes("cookies.sqlite")) {
    return "firefox";
  }
  if (filename.includes("cookies") && filename.endsWith(".db")) {
    return "chrome";
  }
  if (filename.includes("cookies.binarycookies")) {
    return "safari";
  }

  return undefined;
}

/**
 * Browser detection utilities for cookie store files
 * @module BrowserDetector
 */

import { existsSync, readFileSync } from "node:fs";

import { createTaggedLogger } from "@utils/logHelpers";

const logger = createTaggedLogger("BrowserDetector");

/**
 * Supported browser types for cookie extraction
 */
export type BrowserType =
  | "chrome"
  | "firefox"
  | "safari"
  | "edge"
  | "arc"
  | "opera"
  | "opera-gx";

/**
 * Magic bytes for Safari binary cookies format
 */
const SAFARI_MAGIC_BYTES = {
  c: 0x63, // 'c'
  o1: 0x6f, // 'o'
  o2: 0x6f, // 'o'
  k: 0x6b, // 'k'
};

/**
 * Browser detection patterns for cookie store files
 */
const BROWSER_PATTERNS: Array<{
  browser: BrowserType;
  pattern: (filename: string) => boolean;
}> = [
  {
    browser: "firefox",
    pattern: (filename) => filename.includes("cookies.sqlite"),
  },
  {
    browser: "chrome",
    pattern: (filename) =>
      filename.includes("cookies") && filename.endsWith(".db"),
  },
  {
    browser: "safari",
    pattern: (filename) => filename.includes("cookies.binarycookies"),
  },
];

/**
 * Checks if a file contains Safari binary cookies magic bytes
 * @param storePath - Path to the cookie store file
 * @returns True if the file has Safari's binary cookie format signature
 */
export function checkSafariMagicBytes(storePath: string): boolean {
  try {
    const buffer = readFileSync(storePath);
    // Safari binary cookies start with "cook" magic bytes
    return (
      buffer.length >= 4 &&
      buffer[0] === SAFARI_MAGIC_BYTES.c &&
      buffer[1] === SAFARI_MAGIC_BYTES.o1 &&
      buffer[2] === SAFARI_MAGIC_BYTES.o2 &&
      buffer[3] === SAFARI_MAGIC_BYTES.k
    );
  } catch (error) {
    logger.debug("Failed to read file for magic bytes check", {
      path: storePath,
      error,
    });
    return false;
  }
}

/**
 * Detects browser type from filename patterns
 * @param storePath - Path to the cookie store file
 * @returns The detected browser type or undefined
 */
export function detectBrowserFromFilename(
  storePath: string,
): BrowserType | undefined {
  const filename = storePath.toLowerCase();

  for (const { browser, pattern } of BROWSER_PATTERNS) {
    if (pattern(filename)) {
      logger.debug("Detected browser from filename", {
        browser,
        filename,
      });
      return browser;
    }
  }

  return undefined;
}

/**
 * Detects the browser type from a cookie store file
 * @param storePath - Path to the cookie store file
 * @returns The detected browser type or undefined
 */
export function detectBrowserFromStore(
  storePath: string,
): BrowserType | undefined {
  if (!storePath || !existsSync(storePath)) {
    logger.debug("Store path does not exist", { storePath });
    return undefined;
  }

  // Check for Safari binary cookies format first (most specific)
  if (checkSafariMagicBytes(storePath)) {
    logger.info("Detected Safari binary cookies from magic bytes");
    return "safari";
  }

  // Check filename patterns
  const detectedBrowser = detectBrowserFromFilename(storePath);
  if (detectedBrowser) {
    logger.info("Detected browser from filename pattern", {
      browser: detectedBrowser,
    });
    return detectedBrowser;
  }

  logger.debug("Could not detect browser type from store", { storePath });
  return undefined;
}

/**
 * Validates if a string is a known browser type
 * @param browser - The browser string to validate
 * @returns True if the browser is a known type
 */
export function isValidBrowserType(browser: string): browser is BrowserType {
  const validTypes: BrowserType[] = [
    "chrome",
    "firefox",
    "safari",
    "edge",
    "arc",
    "opera",
    "opera-gx",
  ];
  return validTypes.includes(browser as BrowserType);
}

/**
 * Gets a human-readable name for a browser type
 * @param browser - The browser type
 * @returns The display name for the browser
 */
export function getBrowserDisplayName(browser: BrowserType): string {
  const displayNames: Record<BrowserType, string> = {
    chrome: "Google Chrome",
    firefox: "Mozilla Firefox",
    safari: "Safari",
    edge: "Microsoft Edge",
    arc: "Arc",
    opera: "Opera",
    "opera-gx": "Opera GX",
  };
  return displayNames[browser];
}

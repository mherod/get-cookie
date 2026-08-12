#!/usr/bin/env node

import { join } from "node:path";

// Local imports - core
import {
  CHROMIUM_DATA_DIRS,
  FIREFOX_DATA_DIRS,
} from "@core/browsers/BrowserAvailability";
import { getChromiumProfiles } from "@core/browsers/chromium/getChromiumProfiles";
import { parseFirefoxProfilesIni } from "@core/browsers/firefox/FirefoxCookieQueryStrategy";
import { fileExists } from "@core/browsers/runtime/FileSystemAdapter";
import { cookieSpecsFromUrl } from "@core/cookies/cookieSpecsFromUrl";
import { parseArgv } from "@utils/argv";
import { getErrorMessage } from "@utils/errorUtils";
import logger from "@utils/logger";

import type { CookieSpec } from "../types/schemas";

import { cliQueryCookies } from "./cliQueryCookies";

// This will be replaced at build time by esbuild
declare const BUILD_TIMESTAMP: string;

function showHelp(): void {
  logger.log("Usage: get-cookie [name] [domain] [options]");

  // Show build info if available
  if (typeof BUILD_TIMESTAMP !== "undefined") {
    logger.log(`Build: ${BUILD_TIMESTAMP}`);
  }

  logger.log("");
  logger.log("Examples:");
  logger.log("  get-cookie auth example.com           # Get specific cookie");
  logger.log(
    "  get-cookie % github.com --output json # Get all cookies as JSON",
  );
  logger.log("  get-cookie --url https://example.com  # Extract from URL");
  logger.log("");
  logger.log("Options:");
  logger.log("  -h, --help                Show this help message");
  logger.log("  -v, --verbose             Enable verbose output");
  logger.log(
    "  -f, --force               Force operation despite warnings (e.g., locked databases)",
  );
  logger.log(
    "  --list-profiles           List available browser profiles (optionally filter with --browser)",
  );
  logger.log("");
  logger.log("Query options:");
  logger.log(
    "  -n, --name PATTERN        Cookie name pattern (% for wildcard)",
  );
  logger.log("  -D, --domain PATTERN      Cookie domain pattern");
  logger.log("  -u, --url URL             URL to extract cookie specs from");
  logger.log(
    "  --browser BROWSER         Target specific browser (chrome|edge|arc|opera|opera-gx|firefox|safari)",
  );
  logger.log(
    "  --profile NAME            Target specific browser profile by name (e.g., 'Default', 'Profile 1')",
  );
  logger.log(
    "  --store PATH              Path to a specific cookie store file",
  );
  logger.log(
    "  --include-expired         Include expired cookies (filtered by default)",
  );
  logger.log(
    "  --include-all             Include all duplicate cookies (newest only by default)",
  );
  logger.log("");
  logger.log("JWT detection options:");
  logger.log(
    "  -j, --detect-jwt          Detect and decode JWT tokens in cookies",
  );
  logger.log(
    "  --jwt-only                Only show cookies containing valid JWTs",
  );
  logger.log(
    "  --jwt-secret KEY          Validate JWT signatures with provided secret",
  );
  logger.log("");
  logger.log("Output options:");
  logger.log("  --output FORMAT           Output format (json)");
  logger.log("  -d, --dump                Dump all cookie details");
  logger.log(
    "  -G, --dump-grouped        Dump all results, grouped by profile",
  );
  logger.log(
    "  -r, --render              Render all results in formatted output",
  );
}

function createCookieSpec(name: string, domain: string): CookieSpec {
  return {
    name: name || "%",
    domain: domain || "%",
  };
}

function normalizeWildcard(pattern: string): string {
  // Convert * to % for consistent wildcard handling
  return pattern === "*" ? "%" : pattern;
}

function listChromiumProfiles(browser: string): void {
  try {
    const profiles = getChromiumProfiles(browser);
    if (profiles.length === 0) {
      return;
    }

    logger.log(`${browser} profiles:`);
    for (const profile of profiles) {
      const userSuffix = profile.userName ? ` (${profile.userName})` : "";
      logger.log(`  • ${profile.name}${userSuffix}  [${profile.directory}]`);
    }
    logger.log("");
  } catch (error) {
    logger.error(`Failed to list ${browser} profiles:`, getErrorMessage(error));
  }
}

function listFirefoxProfiles(): void {
  const dirs = FIREFOX_DATA_DIRS[process.platform] ?? [];
  let found = false;

  for (const dataDir of dirs) {
    const iniPath = join(dataDir, "profiles.ini");
    if (!fileExists(iniPath)) {
      continue;
    }

    const profiles = parseFirefoxProfilesIni(iniPath);
    if (profiles.length === 0) {
      continue;
    }

    if (!found) {
      logger.log("Firefox profiles:");
      found = true;
    }

    for (const profile of profiles) {
      const resolvedPath = profile.isRelative
        ? join(dataDir, profile.path)
        : profile.path;
      logger.log(`  • ${profile.name}  [${resolvedPath}]`);
    }
  }

  if (found) {
    logger.log("");
  }
}

function listProfiles(browser?: string): void {
  if (browser) {
    const browserLower = browser.toLowerCase();

    if (browserLower === "safari") {
      logger.log("Safari does not use named profiles");
      return;
    }

    if (browserLower === "firefox") {
      listFirefoxProfiles();
      return;
    }

    const platformDirs = CHROMIUM_DATA_DIRS[process.platform] ?? {};
    if (platformDirs[browserLower]) {
      listChromiumProfiles(browser);
    } else {
      logger.error(`Unknown browser: ${browser}`);
    }
    return;
  }

  // No --browser specified: list profiles for all browsers
  const platformDirs = CHROMIUM_DATA_DIRS[process.platform] ?? {};
  for (const name of Object.keys(platformDirs)) {
    listChromiumProfiles(name);
  }
  listFirefoxProfiles();
}

function getCookieSpecs(
  values: Record<string, string | boolean | string[]>,
  positionals: string[],
): CookieSpec[] {
  const url = values.url as string | undefined;

  if (typeof url === "string") {
    const specs = cookieSpecsFromUrl(url);
    if (!Array.isArray(specs)) {
      logger.error("Invalid cookie specs from URL");
      return [];
    }
    return specs;
  }

  const name = normalizeWildcard(
    (values.name as string) ?? positionals[0] ?? "%",
  );
  const domain = normalizeWildcard(
    (values.domain as string) ?? positionals[1] ?? "%",
  );
  return [createCookieSpec(name, domain)];
}

async function handleCookieQuery(
  values: Record<string, string | boolean | string[]>,
  positionals: string[],
): Promise<void> {
  const cookieSpecs = getCookieSpecs(values, positionals);

  if (values.verbose === true) {
    logger.log("cookieSpecs", cookieSpecs);
  }

  try {
    // Default to removing expired cookies unless --include-expired is set
    const removeExpired = values["include-expired"] !== true;
    // Default to deduplicating cookies unless --include-all is set
    const deduplicateCookies = values["include-all"] !== true;

    await cliQueryCookies(
      values,
      cookieSpecs,
      undefined,
      removeExpired,
      values.store as string | undefined,
      deduplicateCookies,
    );
  } catch (error) {
    logger.error("Error querying cookies:", getErrorMessage(error));
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Show help if no arguments provided
  if (args.length === 0) {
    showHelp();
    return;
  }

  const { values, positionals } = parseArgv(args);

  if (values.help === true) {
    showHelp();
    return;
  }

  if (values["list-profiles"] === true) {
    const browser =
      typeof values.browser === "string" ? values.browser : undefined;
    listProfiles(browser);
    return;
  }

  await handleCookieQuery(values, positionals);
}

main().catch((error) => {
  logger.error("Fatal error:", getErrorMessage(error));
  process.exit(1);
});

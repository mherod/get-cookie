#!/usr/bin/env node

// Local imports - core
import { listChromeProfiles } from "@core/browsers/listChromeProfiles";
import { cookieSpecsFromUrl } from "@core/cookies/cookieSpecsFromUrl";
import { parseArgv } from "@utils/argv";
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
    "  --list-profiles           List available browser profiles (use with --browser)",
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
    "  --profile NAME            Target specific Chrome profile by name (e.g., 'Default', 'Profile 1')",
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

interface ChromeProfileInfo {
  name: string;
  user_name?: string;
  [key: string]: unknown;
}

function listProfiles(browser?: string): void {
  if (!browser) {
    logger.error("Please specify a browser with --browser");
    logger.log("Example: get-cookie --browser chrome --list-profiles");
    return;
  }

  const browserLower = browser.toLowerCase();

  if (
    browserLower === "chrome" ||
    browserLower === "edge" ||
    browserLower === "arc" ||
    browserLower === "opera" ||
    browserLower === "opera-gx"
  ) {
    try {
      const profiles = listChromeProfiles();

      if (profiles.length === 0) {
        logger.log(`No ${browser} profiles found`);
        return;
      }

      logger.log(`${browser} profiles:`);
      logger.log("");

      // Get the profile directory mapping from Chrome's Local State
      const fs = require("node:fs");
      const path = require("node:path");
      const os = require("node:os");

      // Determine the browser data directory based on browser type and platform
      let dataDir: string;
      const platform = process.platform;

      if (platform === "darwin") {
        const homeDir = os.homedir();
        switch (browserLower) {
          case "chrome":
            dataDir = path.join(
              homeDir,
              "Library",
              "Application Support",
              "Google",
              "Chrome",
            );
            break;
          case "edge":
            dataDir = path.join(
              homeDir,
              "Library",
              "Application Support",
              "Microsoft Edge",
            );
            break;
          case "arc":
            dataDir = path.join(
              homeDir,
              "Library",
              "Application Support",
              "Arc",
            );
            break;
          case "opera":
            dataDir = path.join(
              homeDir,
              "Library",
              "Application Support",
              "com.operasoftware.Opera",
            );
            break;
          case "opera-gx":
            dataDir = path.join(
              homeDir,
              "Library",
              "Application Support",
              "com.operasoftware.OperaGX",
            );
            break;
          default:
            dataDir = path.join(
              homeDir,
              "Library",
              "Application Support",
              "Google",
              "Chrome",
            );
        }
      } else if (platform === "win32") {
        const appData =
          process.env.LOCALAPPDATA ||
          path.join(os.homedir(), "AppData", "Local");
        switch (browserLower) {
          case "chrome":
            dataDir = path.join(appData, "Google", "Chrome", "User Data");
            break;
          case "edge":
            dataDir = path.join(appData, "Microsoft", "Edge", "User Data");
            break;
          default:
            dataDir = path.join(appData, "Google", "Chrome", "User Data");
        }
      } else {
        // Linux
        const homeDir = os.homedir();
        switch (browserLower) {
          case "chrome":
            dataDir = path.join(homeDir, ".config", "google-chrome");
            break;
          default:
            dataDir = path.join(homeDir, ".config", "google-chrome");
        }
      }

      const localStatePath = path.join(dataDir, "Local State");

      if (fs.existsSync(localStatePath)) {
        const localState = JSON.parse(fs.readFileSync(localStatePath, "utf8"));
        const profileCache = localState.profile?.info_cache || {};

        for (const [dir, info] of Object.entries(profileCache)) {
          const profile = info as ChromeProfileInfo;
          logger.log(`  • ${profile.name}`);
          logger.log(`    Directory: ${dir}`);
          if (profile.user_name) {
            logger.log(`    User: ${profile.user_name}`);
          }
          logger.log("");
        }
      } else {
        // Fallback to just listing profile objects
        profiles.forEach((profile) => {
          logger.log(`  • ${profile.name}`);
          if (profile.user_name) {
            logger.log(`    User: ${profile.user_name}`);
          }
          logger.log("");
        });
      }
    } catch (error) {
      logger.error(
        `Failed to list ${browser} profiles:`,
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  } else if (browserLower === "firefox") {
    logger.log("Firefox profile listing is not yet implemented");
    logger.log(
      "Firefox stores profiles in different locations based on the platform",
    );
  } else if (browserLower === "safari") {
    logger.log("Safari does not use named profiles");
    logger.log("Safari uses the system keychain for the current user");
  } else {
    logger.error(`Unknown browser: ${browser}`);
  }
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
    if (error instanceof Error) {
      logger.error("Error querying cookies:", error.message);
    } else {
      logger.error("An unknown error occurred while querying cookies");
    }
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
  if (error instanceof Error) {
    logger.error("Fatal error:", error.message);
  } else {
    logger.error("An unknown fatal error occurred");
  }
  process.exit(1);
});

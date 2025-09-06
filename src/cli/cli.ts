#!/usr/bin/env node

// Local imports - core
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
    "  --store PATH              Path to a specific cookie store file",
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
    (values.name as string) || positionals[0] || "%",
  );
  const domain = normalizeWildcard(
    (values.domain as string) || positionals[1] || "%",
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
    await cliQueryCookies(
      values,
      cookieSpecs,
      undefined,
      values.removeExpired === true,
      values.store as string | undefined,
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

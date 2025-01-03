#!/usr/bin/env node

// Local imports - core
import { cookieSpecsFromUrl } from "@core/cookies/cookieSpecsFromUrl";
import { parseArgv } from "@utils/argv";
import logger from "@utils/logger";

import type { CookieSpec } from "../types/CookieSpec";

import { cliQueryCookies } from "./cliQueryCookies";

function showHelp(): void {
  logger.log(`Usage: get-cookie [name] [domain] [options]`);
  logger.log(`Options:`);
  logger.log(`  -h, --help: Show this help message`);
  logger.log(`  -v, --verbose: Enable verbose output`);
  logger.log(`  -d, --dump: Dump all results`);
  logger.log(`  -D, --dump-grouped: Dump all results, grouped by profile`);
  logger.log(`  -r, --render: Render all results`);
  logger.log(`  -u, --url: URL to extract cookie specs from`);
  logger.log(`  -n, --name: Cookie name pattern`);
  logger.log(`  -d, --domain: Cookie domain pattern`);
  logger.log(`  --output: Output format (e.g., json)`);
}

function createCookieSpec(name: string, domain: string): CookieSpec {
  return {
    name: name || "%",
    domain: domain || "%",
  };
}

function getCookieSpecs(
  values: Record<string, string | boolean | string[]>,
  positionals: string[],
): CookieSpec[] {
  const url = values.url as string | undefined;

  if (typeof url === "string") {
    return cookieSpecsFromUrl(url);
  }

  const name = (values.name as string) || positionals[0] || "%";
  const domain = (values.domain as string) || positionals[1] || "%";
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
      cookieSpecs,
      ["chrome", "firefox", "safari"],
      ["default"],
      { ...values },
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

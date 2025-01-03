#!/usr/bin/env bun

// Local imports - core
import { cookieSpecsFromUrl } from "@core/cookies/cookieSpecsFromUrl";
import { fetchWithCookies } from "@core/fetch/fetchWithCookies";
import { parseArgv } from "@utils/argv";
import logger from "@utils/logger";
import { unpackHeaders } from "@utils/unpackHeaders";

import type { CookieSpec } from "../types/CookieSpec";

import { cliQueryCookies } from "./cliQueryCookies";

// Type definitions
interface ParsedArgs {
  _: string[];
  help?: boolean;
  h?: boolean;
  verbose?: boolean;
  v?: boolean;
  dump?: boolean;
  d?: boolean;
  "dump-grouped"?: boolean;
  D?: boolean;
  render?: boolean;
  r?: boolean;
  fetch?: string;
  F?: string;
  H?: string[] | string;
  "dump-response-headers"?: boolean;
  "dump-response-body"?: boolean;
  url?: string;
  u?: string;
  name?: string;
  domain?: string;
  [key: string]: unknown;
}

function showHelp(): void {
  logger.log(`Usage: ${process.argv[1]} [name] [domain] [options]`);
  logger.log(`Options:`);
  logger.log(`  -h, --help: Show this help message`);
  logger.log(`  -v, --verbose: Enable verbose output`);
  logger.log(`  -d, --dump: Dump all results`);
  logger.log(`  -D, --dump-grouped: Dump all results, grouped by profile`);
  logger.log(`  -r, --render: Render all results`);
  logger.log(`  -F, --fetch <url>: Fetch data from the specified URL`);
  logger.log(`  -H <header>: Specify headers for the fetch request`);
  logger.log(
    `  --dump-response-headers: Dump response headers from fetch request`,
  );
  logger.log(`  --dump-response-body: Dump response body from fetch request`);
}

async function handleFetch(parsedArgs: ParsedArgs, fetchUrl: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(fetchUrl);
  } catch (_err) {
    logger.error("Invalid URL", fetchUrl);
    return;
  }

  logger.start("Fetching", url.href);
  const headerArgs = parsedArgs.H ?? null;
  const headers = unpackHeaders(headerArgs);

  try {
    const res = await fetchWithCookies(url, { headers });
    logger.debug("Response", res);

    if (parsedArgs["dump-response-headers"] === true) {
      for (const [key, value] of Object.entries(res.headers)) {
        logger.log(`${key}: ${String(value)}`);
      }
    }

    if (parsedArgs["dump-response-body"] === true) {
      const responseBody = await res.text();
      logger.log(responseBody);
    }
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message);
    } else {
      logger.error("An unknown error occurred");
    }
  }
}

function createCookieSpec(parsedArgs: ParsedArgs): CookieSpec {
  const defaultName = parsedArgs._[0] ?? "%";
  const defaultDomain = parsedArgs._[1] ?? "%";

  return {
    name: parsedArgs.name ?? defaultName,
    domain: parsedArgs.domain ?? defaultDomain,
  };
}

function getCookieSpecs(parsedArgs: ParsedArgs): CookieSpec[] {
  const argUrl = parsedArgs.url ?? parsedArgs.u;

  if (typeof argUrl === 'string') {
    return cookieSpecsFromUrl(argUrl);
  }

  return [createCookieSpec(parsedArgs)];
}

async function handleCookieQuery(parsedArgs: ParsedArgs): Promise<void> {
  const cookieSpecs = getCookieSpecs(parsedArgs);

  if (parsedArgs.verbose === true) {
    logger.log("cookieSpecs", cookieSpecs);
  }

  try {
    await cliQueryCookies(cookieSpecs);
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
  const { values: parsedArgs } = parseArgv(args) as unknown as { values: ParsedArgs };

  if (parsedArgs.help === true || parsedArgs.h === true) {
    showHelp();
    return;
  }

  parsedArgs.verbose = parsedArgs.verbose ?? parsedArgs.v;

  const fetchUrl = parsedArgs.fetch ?? parsedArgs.F;
  if (typeof fetchUrl === 'string') {
    await handleFetch(parsedArgs, fetchUrl);
    return;
  }

  await handleCookieQuery(parsedArgs);
}

main().catch((error) => {
  if (error instanceof Error) {
    logger.error("Fatal error:", error.message);
  } else {
    logger.error("An unknown fatal error occurred");
  }
  process.exit(1);
});

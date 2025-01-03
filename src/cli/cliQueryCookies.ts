// Third-party imports
import { groupBy } from "lodash-es";

// Local imports - types
import { comboQueryCookieSpec } from "@core/cookies/comboQueryCookieSpec";
import { resultsRendered } from "@core/cookies/resultsRendered";
import logger from "@utils/logger";

import type { CookieSpec } from "../types/CookieSpec";
import type { ExportedCookie } from "../types/ExportedCookie";

interface ParsedArgs {
  dump?: boolean;
  d?: boolean;
  "dump-grouped"?: boolean;
  D?: boolean;
  render?: boolean;
  "render-merged"?: boolean;
  r?: boolean;
  "render-grouped"?: boolean;
  R?: boolean;
  output?: string;
  [key: string]: unknown;
}

function handleDumpOutput(results: ExportedCookie[]): void {
  logger.log(results);
}

function handleGroupedDumpOutput(results: ExportedCookie[]): void {
  const groupedByFile = groupBy(results, (r) => r.meta?.file ?? "unknown");
  logger.log(JSON.stringify(groupedByFile, null, 2));
}

function handleRenderOutput(results: ExportedCookie[]): void {
  logger.log(resultsRendered(results));
}

function handleGroupedRenderOutput(results: ExportedCookie[]): void {
  const groupedByFile = groupBy(results, (r) => r.meta?.file ?? "unknown");
  for (const [file, fileResults] of Object.entries(groupedByFile)) {
    logger.log(`${file}: ${resultsRendered(fileResults)}`);
  }
}

function handleJsonOutput(results: ExportedCookie[]): void {
  logger.log(JSON.stringify(results, null, 2));
}

function handleDefaultOutput(results: ExportedCookie[]): void {
  const uniqueValues = new Set(results.map((result) => result.value));
  for (const value of uniqueValues) {
    logger.log(value);
  }
}

function shouldHandleDump(args: ParsedArgs): boolean {
  return args.dump === true || args.d === true;
}

function shouldHandleGroupedDump(args: ParsedArgs): boolean {
  return args["dump-grouped"] === true || args.D === true;
}

function shouldHandleRender(args: ParsedArgs): boolean {
  return (
    args.render === true || args["render-merged"] === true || args.r === true
  );
}

function shouldHandleGroupedRender(args: ParsedArgs): boolean {
  return args["render-grouped"] === true || args.R === true;
}

function handleOutput(results: ExportedCookie[], args: ParsedArgs): void {
  if (shouldHandleDump(args)) {
    handleDumpOutput(results);
    return;
  }

  if (shouldHandleGroupedDump(args)) {
    handleGroupedDumpOutput(results);
    return;
  }

  if (shouldHandleRender(args)) {
    handleRenderOutput(results);
    return;
  }

  if (shouldHandleGroupedRender(args)) {
    handleGroupedRenderOutput(results);
    return;
  }

  if (args.output === "json") {
    handleJsonOutput(results);
    return;
  }

  handleDefaultOutput(results);
}

/**
 * Query cookies from browsers using the CLI interface
 * @param cookieSpec - Cookie specification(s) to query for
 * @param browsers - List of browsers to query from
 * @param profiles - List of browser profiles to query from
 * @param args - Parsed arguments
 * @param limit - Optional limit on the number of results
 * @param removeExpired - Whether to remove expired cookies from results
 * @example
 * // Query cookies from all browsers for a specific domain
 * const cookies = await cliQueryCookies(
 *   { name: '*', domain: 'example.com' },
 *   ['chrome', 'firefox'],
 *   ['default'],
 *   10,
 *   true
 * );
 *
 * // Query multiple cookie specs
 * const multiCookies = await cliQueryCookies(
 *   [
 *     { name: 'session', domain: 'app.example.com' },
 *     { name: 'auth', domain: 'auth.example.com' }
 *   ],
 *   ['chrome'],
 *   ['default', 'profile1']
 * );
 *
 * // Handle errors
 * try {
 *   const cookies = await cliQueryCookies(
 *     { name: 'token', domain: 'api.example.com' },
 *     ['chrome']
 *   );
 *   console.log(`Found ${cookies.length} cookies`);
 * } catch (error) {
 *   console.error('Failed to query cookies:', error);
 * }
 */
export async function cliQueryCookies(
  cookieSpec: CookieSpec | CookieSpec[],
  browsers: string[],
  profiles: string[],
  args: ParsedArgs,
  limit?: number,
  removeExpired?: boolean,
): Promise<void> {
  try {
    const results = await comboQueryCookieSpec(cookieSpec, {
      limit,
      removeExpired,
    });

    if (results.length === 0) {
      logger.error("No results");
      return;
    }

    handleOutput(results, args);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message);
    } else {
      logger.error("An unknown error occurred");
    }
  }
}

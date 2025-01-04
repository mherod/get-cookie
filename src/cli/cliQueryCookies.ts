import type { CookieSpec, ExportedCookie } from "../types/schemas";
import { logger } from "../utils/logHelpers";

import { CookieQueryService } from "./services/CookieQueryService";
import {
  CookieStrategyFactory,
  type CookieQueryStrategy,
} from "./services/CookieStrategyFactory";

/**
 * Format a cookie's metadata field if it exists and is of the correct type
 * @param meta - The metadata object
 * @param field - The field name to format
 * @param type - The expected type of the field
 * @returns Formatted string or null
 */
function formatMetaField(
  meta: Record<string, unknown> | undefined,
  field: string,
  type: string,
): string | null {
  if (!meta || !(field in meta)) {
    return null;
  }

  const value = meta[field];
  if (typeof value !== type) {
    return null;
  }

  const fieldDisplay = field.charAt(0).toUpperCase() + field.slice(1);
  const displayValue = type === "number" ? (value as number) : String(value);
  return `  ${fieldDisplay}: ${displayValue}`;
}

/**
 * Format cookie dates
 * @param cookie - The cookie to format dates for
 * @returns Array of formatted date strings
 */
function formatDates(cookie: ExportedCookie): string[] {
  const lines: string[] = [];

  const creation = cookie.meta?.creation;
  if (typeof creation === "number") {
    const creationDate = new Date(creation * 1000);
    lines.push(`  Creation: ${creationDate.toISOString()}`);
  }

  if (
    cookie.expiry !== "Infinity" &&
    (typeof cookie.expiry === "number" || cookie.expiry instanceof Date)
  ) {
    const expiryDate = new Date(cookie.expiry);
    lines.push(`  Expiry: ${expiryDate.toISOString()}`);
  }

  return lines;
}

/**
 * Format a cookie for display
 * @param cookie - The cookie to format
 * @returns Array of formatted lines
 */
function formatCookie(cookie: ExportedCookie): string[] {
  const lines: string[] = [
    "Cookie details:",
    `  Name: ${cookie.name}`,
    `  Domain: ${cookie.domain}`,
    `  Value: ${cookie.value}`,
  ];

  const metaFields = ["path", "flags", "version"] as const;
  for (const field of metaFields) {
    const formatted = formatMetaField(
      cookie.meta,
      field,
      field === "path" ? "string" : "number",
    );
    if (formatted !== null) {
      lines.push(formatted);
    }
  }

  lines.push(...formatDates(cookie));
  lines.push("");
  return lines;
}

interface QueryOptions {
  /** Maximum number of cookies to return */
  limit?: number;
  /** Whether to remove expired cookies */
  removeExpired: boolean;
  /** Optional path to a specific binarycookies store file */
  store?: string;
  /** Strategy for querying cookies */
  strategy: CookieQueryStrategy;
}

/**
 * Internal function to query cookies and apply limit
 * @param queryService - The query service to use
 * @param specs - Cookie specifications to query
 * @param options - Query options including limit, expiry handling, store path, and strategy
 * @returns Array of cookies
 */
async function queryAndLimitCookies(
  queryService: CookieQueryService,
  specs: CookieSpec[],
  options: QueryOptions,
): Promise<ExportedCookie[]> {
  let results: ExportedCookie[] = [];

  for (const spec of specs) {
    const cookies = await queryService.queryCookies(spec, options);
    results = [...results, ...cookies];

    if (
      typeof options.limit === "number" &&
      options.limit > 0 &&
      results.length >= options.limit
    ) {
      results = results.slice(0, options.limit);
      break;
    }
  }

  return results;
}

/**
 * Query cookies from the browser using the specified strategy
 * @param args - Command line arguments including browser and output format options
 * @param cookieSpec - Cookie specification(s) to query for
 * @param limit - Maximum number of cookies to return
 * @param removeExpired - Whether to remove expired cookies
 * @param store - Optional path to a specific binarycookies store file
 */
export async function cliQueryCookies(
  args: Record<string, unknown>,
  cookieSpec: CookieSpec | CookieSpec[],
  limit?: number,
  removeExpired = false,
  store?: string,
): Promise<void> {
  try {
    const browser = typeof args.browser === "string" ? args.browser : undefined;
    const strategy = CookieStrategyFactory.createStrategy(browser);
    const queryService = new CookieQueryService(strategy);
    const specs = Array.isArray(cookieSpec) ? cookieSpec : [cookieSpec];

    const results = await queryAndLimitCookies(queryService, specs, {
      limit,
      removeExpired,
      store,
      strategy,
    });

    if (results.length === 0) {
      logger.error("No results");
      return;
    }

    if (args["--json"] === true) {
      logger.log(JSON.stringify(results, null, 2));
    } else {
      results.forEach((cookie: ExportedCookie) => {
        const lines = formatCookie(cookie);
        lines.forEach((line) => logger.log(line));
      });
    }
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message);
    } else {
      logger.error("An unknown error occurred");
    }
  }
}

function formatResults(results: ExportedCookie[]): void {
  if (results.length === 0) {
    logger.warn("No cookies found matching the specified criteria");
    return;
  }

  logger.log(JSON.stringify(results, null, 2));
}

function formatResultsVerbose(results: ExportedCookie[]): void {
  if (results.length === 0) {
    logger.warn("No cookies found matching the specified criteria");
    return;
  }

  const lines: string[] = [];
  results.forEach((cookie) => {
    lines.push("\n-------------------");
    lines.push(`Name: ${cookie.name}`);
    lines.push(`Domain: ${cookie.domain}`);
    lines.push(`Value: ${cookie.value}`);

    const path = cookie.meta?.path;
    if (typeof path === "string" && path.length > 0) {
      lines.push(`Path: ${path}`);
    }

    const dateLines = formatDates(cookie);
    lines.push(...dateLines);

    if (cookie.meta) {
      const metaLines = [
        formatMetaField(cookie.meta, "file", "string"),
        formatMetaField(cookie.meta, "browser", "string"),
        formatMetaField(cookie.meta, "profile", "string"),
        formatMetaField(cookie.meta, "decrypted", "boolean"),
      ].filter((line): line is string => line !== null);

      if (metaLines.length > 0) {
        lines.push("Metadata:");
        lines.push(...metaLines);
      }
    }
  });

  lines.forEach((line) => logger.log(line));
}

/**
 * Query cookies based on the provided specification
 * @param spec - The cookie specification to query
 * @param service - The cookie query service to use
 * @param verbose - Whether to output verbose information
 * @returns Promise that resolves when the query is complete
 */
export async function queryCookies(
  spec: CookieSpec,
  service: CookieQueryService,
  verbose = false,
): Promise<void> {
  const results = await service.queryCookies(spec);
  if (verbose) {
    formatResultsVerbose(results);
  } else {
    formatResults(results);
  }
}

import { groupBy } from "lodash-es";

import { renderCookies } from "@core/cookies/renderCookies";
import logger from "@utils/logger";

import type { ExportedCookie } from "../types/schemas";

/**
 * Command-line arguments for cookie querying and output formatting
 */
export interface CookieFormatOptions {
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

/**
 * Validates the output format specified in options
 * @param options - CLI arguments / options
 * @throws Error if an invalid output format is specified
 */
export function validateOutputFormat(options: CookieFormatOptions): void {
  if (options.output !== undefined && options.output !== "json") {
    throw new Error(
      `Invalid output format: '${options.output}'. Valid formats are: json`,
    );
  }
}

/**
 * Formats an array of exported cookies into a string according to output options.
 * @param cookies - Array of exported cookies
 * @param options - Formatting options / CLI arguments
 * @returns Formatted output string
 */
export function formatCookies(
  cookies: ExportedCookie[],
  options: CookieFormatOptions = {},
): string {
  validateOutputFormat(options);

  if (options.output === "json") {
    if (cookies.length === 0) {
      return "[]";
    }
    return JSON.stringify(cookies, null, 2);
  }

  if (options["dump-grouped"] === true || options.D === true) {
    if (cookies.length === 0) {
      return "{}";
    }
    const groupedByFile = groupBy(cookies, (r) => r.meta?.file ?? "unknown");
    return JSON.stringify(groupedByFile, null, 2);
  }

  if (options["render-grouped"] === true || options.R === true) {
    if (cookies.length === 0) {
      return "";
    }
    const rendered = renderCookies(cookies, { format: "grouped" });
    return Array.isArray(rendered) ? rendered.join("\n") : rendered;
  }

  if (
    options.render === true ||
    options["render-merged"] === true ||
    options.r === true
  ) {
    if (cookies.length === 0) {
      return "";
    }
    const rendered = renderCookies(cookies, { format: "merged" });
    return Array.isArray(rendered) ? rendered.join("\n") : rendered;
  }

  if (options.dump === true || options.d === true) {
    if (cookies.length === 0) {
      return "";
    }
    return JSON.stringify(cookies, null, 2);
  }

  // Default mode: extract unique non-empty string values
  if (cookies.length === 0) {
    return "";
  }

  const uniqueValues = new Set<string>();
  for (const cookie of cookies) {
    const value = cookie.value as string;
    if (typeof value === "string" && value.length > 0) {
      uniqueValues.add(value);
    }
  }

  return Array.from(uniqueValues).join("\n");
}

/**
 * Formats and logs cookies to the configured logger.
 * @param cookies - Array of exported cookies
 * @param options - Formatting options / CLI arguments
 */
export function formatAndPrintCookies(
  cookies: ExportedCookie[],
  options: CookieFormatOptions = {},
): void {
  const formatted = formatCookies(cookies, options);
  if (formatted.length > 0) {
    logger.log(formatted);
  }
}

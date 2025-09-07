import type { CookieSpec, ExportedCookie } from "../../types/schemas";
import { ensureError, getErrorMessage } from "../../utils/errorUtils";
import logger from "../../utils/logger";
import { ChromeCookieQueryStrategy } from "../browsers/chrome/ChromeCookieQueryStrategy";
import { FirefoxCookieQueryStrategy } from "../browsers/firefox/FirefoxCookieQueryStrategy";
import { SafariCookieQueryStrategy } from "../browsers/safari/SafariCookieQueryStrategy";
/**
 * Batch query cookies from browser strategies with optimized SQL queries.
 * This function groups cookie specs and executes combined queries where possible.
 * @param specs - Array of cookie specifications to query
 * @param continueOnError - Whether to continue on errors for individual specs
 * @returns Promise resolving to array of exported cookies
 * @example
 * ```typescript
 * const cookies = await batchQueryCookies([
 *   { name: "auth", domain: "example.com" },
 *   { name: "session", domain: "example.com" },
 *   { name: "token", domain: "api.example.com" }
 * ]);
 * ```
 */
export async function batchQueryCookies(
  specs: CookieSpec[],
  continueOnError = true,
): Promise<ExportedCookie[]> {
  // Filter out invalid specs
  const validSpecs = specs.filter(
    (spec) =>
      spec.name &&
      spec.domain &&
      typeof spec.name === "string" &&
      typeof spec.domain === "string",
  );

  if (validSpecs.length === 0) {
    return [];
  }

  logger.debug(`Batch querying ${validSpecs.length} cookie specs`);

  // Initialize strategies
  const strategies = [
    new ChromeCookieQueryStrategy(),
    new FirefoxCookieQueryStrategy(),
    new SafariCookieQueryStrategy(),
  ];

  const allResults: ExportedCookie[] = [];
  const errors: Error[] = [];

  // Query each strategy with all specs
  for (const strategy of strategies) {
    try {
      // Check if strategy supports batch queries
      if (
        "batchQueryCookies" in strategy &&
        typeof strategy.batchQueryCookies === "function"
      ) {
        // Use optimized batch query if available
        const results = await strategy.batchQueryCookies(validSpecs);
        allResults.push(...results);
      } else {
        // Fall back to parallel individual queries
        const results = await Promise.allSettled(
          validSpecs.map(async (spec) =>
            strategy.queryCookies(spec.name, spec.domain),
          ),
        );

        for (const result of results) {
          if (result.status === "fulfilled") {
            allResults.push(...result.value);
          } else if (!continueOnError) {
            throw result.reason;
          } else {
            errors.push(ensureError(result.reason, "Query failed"));
          }
        }
      }
    } catch (error) {
      const err = ensureError(
        error,
        `Failed to query ${strategy.constructor.name}`,
      );
      if (!continueOnError) {
        throw err;
      }
      errors.push(err);
      logger.warn(`Strategy ${strategy.constructor.name} failed`, {
        error: getErrorMessage(err),
      });
    }
  }

  if (errors.length > 0) {
    logger.debug(`${errors.length} errors occurred during batch query`);
  }

  return allResults;
}

import type { CookieSpec, ExportedCookie } from "../../types/schemas";
import { ensureError, getErrorMessage } from "../../utils/errorUtils";
import logger from "../../utils/logger";
import type { BaseCookieQueryStrategy } from "../browsers/BaseCookieQueryStrategy";
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
/**
 * Validate cookie specs
 * @param specs - Array of cookie specifications
 * @returns Array of valid cookie specs
 */
function validateSpecs(specs: CookieSpec[]): CookieSpec[] {
  return specs.filter(
    (spec) =>
      Boolean(spec.name) &&
      Boolean(spec.domain) &&
      typeof spec.name === "string" &&
      typeof spec.domain === "string",
  );
}

/**
 * Type guard to check if strategy supports batch queries
 * @param strategy - Cookie query strategy
 * @returns True if strategy supports batch queries
 */
function supportsBatchQueries(
  strategy: BaseCookieQueryStrategy,
): strategy is BaseCookieQueryStrategy & {
  batchQueryCookies: (specs: CookieSpec[]) => Promise<ExportedCookie[]>;
} {
  return (
    "batchQueryCookies" in strategy &&
    typeof strategy.batchQueryCookies === "function"
  );
}

/**
 * Process individual query results
 * @param results - Promise settlement results
 * @param continueOnError - Whether to continue on errors
 * @returns Object with cookies and errors
 * @throws Error if continueOnError is false and a query fails
 */
function processIndividualResults(
  results: PromiseSettledResult<ExportedCookie[]>[],
  continueOnError: boolean,
): { cookies: ExportedCookie[]; errors: Error[] } {
  const cookies: ExportedCookie[] = [];
  const errors: Error[] = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      cookies.push(...result.value);
    } else if (!continueOnError) {
      throw result.reason;
    } else {
      errors.push(ensureError(result.reason, "Query failed"));
    }
  }

  return { cookies, errors };
}

/**
 * Query a single strategy for cookies
 * @param strategy - Cookie query strategy
 * @param validSpecs - Valid cookie specifications
 * @param continueOnError - Whether to continue on errors
 * @returns Object with cookies and errors
 */
async function queryStrategy(
  strategy: BaseCookieQueryStrategy,
  validSpecs: CookieSpec[],
  continueOnError: boolean,
): Promise<{ cookies: ExportedCookie[]; errors: Error[] }> {
  const cookies: ExportedCookie[] = [];
  const errors: Error[] = [];

  try {
    if (supportsBatchQueries(strategy)) {
      // Use optimized batch query if available
      const results = await strategy.batchQueryCookies(validSpecs);
      cookies.push(...results);
    } else {
      // Fall back to parallel individual queries
      const results = await Promise.allSettled(
        validSpecs.map(async (spec) =>
          strategy.queryCookies(spec.name, spec.domain),
        ),
      );

      const processed = processIndividualResults(results, continueOnError);
      cookies.push(...processed.cookies);
      errors.push(...processed.errors);
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

  return { cookies, errors };
}

/**
 * Batch query cookies from browser strategies with optimized SQL queries
 * @param specs - Array of cookie specifications to query
 * @param continueOnError - Whether to continue on errors for individual specs
 * @returns Promise resolving to array of exported cookies
 */
export async function batchQueryCookies(
  specs: CookieSpec[],
  continueOnError = true,
): Promise<ExportedCookie[]> {
  // Filter out invalid specs
  const validSpecs = validateSpecs(specs);

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
  const allErrors: Error[] = [];

  // Query each strategy with all specs
  for (const strategy of strategies) {
    const { cookies, errors } = await queryStrategy(
      strategy,
      validSpecs,
      continueOnError,
    );
    allResults.push(...cookies);
    allErrors.push(...errors);
  }

  if (allErrors.length > 0) {
    logger.debug(`${allErrors.length} errors occurred during batch query`);
  }

  return allResults;
}

import type { CookieSpec, ExportedCookie } from "../../types/schemas";
import { ensureError, getErrorMessage } from "../../utils/errorUtils";
import logger from "../../utils/logger";

import { batchQueryCookies } from "./batchQueryCookies";
import { getCookie } from "./getCookie";

/**
 * Options for batch cookie retrieval
 */
export interface BatchGetCookiesOptions {
  /**
   * Whether to deduplicate cookies across all specs
   * When true, keeps the cookie with the longest value for each unique name+domain combination
   * @default true
   */
  deduplicate?: boolean;

  /**
   * Maximum number of concurrent requests
   * @default 10
   */
  concurrency?: number;

  /**
   * Whether to continue on errors for individual specs
   * When true, errors for individual specs won't fail the entire batch
   * @default true
   */
  continueOnError?: boolean;
}

/**
 * Result for a single cookie spec in batch operation
 */
export interface BatchCookieResult {
  /**
   * The original spec that was queried
   */
  spec: CookieSpec;

  /**
   * The cookies retrieved for this spec
   */
  cookies: ExportedCookie[];

  /**
   * Error if the query failed (only when continueOnError is true)
   */
  error?: Error;
}

/**
 * Retrieves multiple cookie specifications in parallel with intelligent deduplication.
 * This function efficiently fetches cookies for multiple specifications and can optionally
 * deduplicate the results to keep only the most valid cookie for each unique name+domain pair.
 * @param specs - Array of cookie specifications to retrieve
 * @param options - Options for batch retrieval
 * @returns Array of exported cookies, optionally deduplicated
 * @example
 * ```typescript
 * import { batchGetCookies } from "@mherod/get-cookie";
 *
 * // Fetch multiple cookies in parallel
 * const cookies = await batchGetCookies([
 *   { name: "auth", domain: "api.example.com" },
 *   { name: "session", domain: "example.com" },
 *   { name: "token", domain: "*.example.com" }
 * ]);
 *
 * // With options
 * const cookies = await batchGetCookies(
 *   [
 *     { name: "auth", domain: "api.example.com" },
 *     { name: "session", domain: "example.com" }
 *   ],
 *   {
 *     deduplicate: true,  // Keep only the best cookie for each name+domain
 *     concurrency: 5,     // Limit concurrent requests
 *     continueOnError: true // Don't fail entire batch on individual errors
 *   }
 * );
 * ```
 */
export async function batchGetCookies(
  specs: CookieSpec[],
  options: BatchGetCookiesOptions = {},
): Promise<ExportedCookie[]> {
  const {
    deduplicate = true,
    concurrency = 10,
    continueOnError = true,
  } = options;

  logger.debug(`Batch fetching ${specs.length} cookie specs`, {
    deduplicate,
    concurrency,
    continueOnError,
  });

  // Use optimized batch query that combines SQL queries
  let results: ExportedCookie[];

  try {
    results = await batchQueryCookies(specs, continueOnError);
    logger.debug(`Batch query returned ${results.length} cookies`);
  } catch (error) {
    // If continueOnError is false and batch query fails, throw the error
    if (!continueOnError) {
      throw error;
    }

    // Fall back to individual queries if batch query fails
    logger.warn("Batch query failed, falling back to individual queries", {
      error: getErrorMessage(error),
    });

    // Process specs in chunks based on concurrency limit
    results = [];
    const errors: Array<{ spec: CookieSpec; error: Error }> = [];

    for (let i = 0; i < specs.length; i += concurrency) {
      const chunk = specs.slice(i, i + concurrency);
      const chunkPromises = chunk.map(async (spec) => {
        try {
          const cookies = await getCookie(spec);
          return { spec, cookies, error: undefined };
        } catch (error) {
          const err = ensureError(error, "Failed to fetch cookies");
          if (!continueOnError) {
            throw err;
          }
          logger.warn("Failed to fetch cookies for spec", {
            spec,
            error: getErrorMessage(err),
          });
          return { spec, cookies: [], error: err };
        }
      });

      const chunkResults = await Promise.all(chunkPromises);

      for (const result of chunkResults) {
        if (result.error) {
          errors.push({ spec: result.spec, error: result.error });
        } else {
          results.push(...result.cookies);
        }
      }
    }

    // Log any errors that occurred
    if (errors.length > 0) {
      logger.warn(`${errors.length} specs failed during batch retrieval`, {
        failedSpecs: errors.map((e) => e.spec),
      });
    }
  }

  // Deduplicate if requested
  if (deduplicate && results.length > 0) {
    const deduplicatedCookies = deduplicateCookies(results);
    logger.debug(
      `Deduplicated ${results.length} cookies to ${deduplicatedCookies.length}`,
    );
    return deduplicatedCookies;
  }

  return results;
}

/**
 * Retrieves multiple cookie specifications with detailed results for each spec.
 * Unlike `batchGetCookies`, this returns detailed results including any errors
 * that occurred for individual specs.
 * @param specs - Array of cookie specifications to retrieve
 * @param options - Options for batch retrieval
 * @returns Array of batch results with cookies and potential errors
 * @example
 * ```typescript
 * import { batchGetCookiesWithResults } from "@mherod/get-cookie";
 *
 * const results = await batchGetCookiesWithResults([
 *   { name: "auth", domain: "api.example.com" },
 *   { name: "session", domain: "example.com" }
 * ]);
 *
 * results.forEach(result => {
 *   if (result.error) {
 *     console.error(`Failed to get cookies for ${result.spec.name}: ${result.error.message}`);
 *   } else {
 *     console.log(`Got ${result.cookies.length} cookies for ${result.spec.name}`);
 *   }
 * });
 * ```
 */
export async function batchGetCookiesWithResults(
  specs: CookieSpec[],
  options: Omit<BatchGetCookiesOptions, "deduplicate"> = {},
): Promise<BatchCookieResult[]> {
  const { concurrency = 10, continueOnError = true } = options;

  logger.debug(`Batch fetching ${specs.length} cookie specs with results`, {
    concurrency,
    continueOnError,
  });

  // Try using optimized batch query first
  try {
    const allCookies = await batchQueryCookies(specs, continueOnError);

    // Group cookies by spec
    const results: BatchCookieResult[] = specs.map((spec) => {
      const specCookies = allCookies.filter(
        (cookie) => cookie.name === spec.name && cookie.domain === spec.domain,
      );
      return { spec, cookies: specCookies };
    });

    return results;
  } catch (error) {
    logger.warn("Batch query failed, falling back to individual queries", {
      error: getErrorMessage(error),
    });

    // Fall back to individual queries
    const results: BatchCookieResult[] = [];

    for (let i = 0; i < specs.length; i += concurrency) {
      const chunk = specs.slice(i, i + concurrency);
      const chunkPromises = chunk.map(
        async (spec): Promise<BatchCookieResult> => {
          try {
            const cookies = await getCookie(spec);
            return { spec, cookies };
          } catch (error) {
            const err = ensureError(error, "Failed to fetch cookies");
            if (!continueOnError) {
              throw err;
            }
            logger.warn("Failed to fetch cookies for spec", {
              spec,
              error: getErrorMessage(err),
            });
            return { spec, cookies: [], error: err };
          }
        },
      );

      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
    }

    return results;
  }
}

/**
 * Deduplicates an array of cookies, keeping the most valid value for each unique name+domain pair.
 * Prioritizes cookies with longer values as they are more likely to be valid/complete.
 * @param cookies - Array of cookies to deduplicate
 * @returns Deduplicated array of cookies
 */
function deduplicateCookies(cookies: ExportedCookie[]): ExportedCookie[] {
  const cookieMap = new Map<string, ExportedCookie>();

  for (const cookie of cookies) {
    const key = `${cookie.name}:${cookie.domain}`;
    const existing = cookieMap.get(key);

    // Keep the cookie with the longest value (most likely to be valid)
    if (!existing || cookie.value.length > existing.value.length) {
      cookieMap.set(key, cookie);
    }
  }

  return Array.from(cookieMap.values());
}

/**
 *
 */
export default batchGetCookies;

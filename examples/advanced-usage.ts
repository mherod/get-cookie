/**
 * @module
 * @internal
 */

/**
 * @description
 * This example demonstrates advanced usage of the cookie retrieval functions.
 * It shows how to retrieve cookies using different patterns and filters.
 * @internal
 * @example
 * ```typescript
 * import { getCookie } from "@mherod/get-cookie";
 *
 * // Get all cookies for a domain
 * const cookies = await getCookie({
 *   name: "*",
 *   domain: "github.com"
 * });
 *
 * // Get specific cookies
 * const authCookie = await getCookie({
 *   name: "auth",
 *   domain: "api.github.com"
 * });
 * ```
 */

import { getCookie } from "../src";

/**
 * @description
 * Run advanced examples of cookie retrieval.
 * @internal
 * @returns A promise that resolves when all examples have completed.
 */
export async function runAdvancedExamples(): Promise<void> {
  // Example 1: Get a specific cookie by name and domain
  const cookie = await getCookie({
    name: "session",
    domain: "github.com",
  });

  console.log("Example 1 - Specific cookie:", cookie);

  // Example 2: Get all cookies for a domain using wildcard
  const cookies = await getCookie({
    name: "*",
    domain: "github.com",
  });

  console.log("Example 2 - All domain cookies:", cookies);
}

// Execute the examples
runAdvancedExamples().catch(console.error);

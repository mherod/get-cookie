/**
 * @module
 * @internal
 */

/**
 * @description
 * This example demonstrates basic usage of the getCookie function.
 * It shows how to retrieve cookies from all supported browsers using a unified interface.
 * @internal
 * @example
 * ```typescript
 * import { getCookie } from "@mherod/get-cookie";
 *
 * // Get a cookie by name and domain
 * const cookie = await getCookie({
 *   name: "session",
 *   domain: "github.com"
 * });
 *
 * console.log(cookie);
 * ```
 */

import { getCookie } from "../src";

/**
 * @description
 * Run basic examples of cookie retrieval.
 * @internal
 * @returns A promise that resolves when all examples have completed.
 */
export async function runBasicExamples(): Promise<void> {
  // Get a cookie by name and domain
  const cookie = await getCookie({
    name: "session",
    domain: "github.com",
  });

  console.log("Cookie:", cookie);
}

// Execute the examples
runBasicExamples().catch(console.error);

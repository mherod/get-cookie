/**
 * @module
 * @internal
 */

/**
 * @description
 * This example demonstrates basic usage of the getCookie function.
 * It shows how to retrieve cookies from Chrome and Firefox browsers.
 * @internal
 * @example
 * ```typescript
 * import { getCookie } from "../src";
 *
 * // Get the cookie retrieval function
 * const getCookieFn = await getCookie();
 *
 * // Get a cookie by name and domain
 * const cookie = await getCookieFn({
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
  // Get the cookie retrieval function
  const getCookieFn = await getCookie();

  // Get a cookie by name and domain
  const cookie = await getCookieFn({
    name: "session",
    domain: "github.com",
  });

  console.log("Cookie:", cookie);
}

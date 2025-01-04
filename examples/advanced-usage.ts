/**
 * @module
 * @internal
 */

/**
 * @description
 * This example demonstrates advanced usage of the getCookie function.
 * It shows how to retrieve cookies using browser-specific strategies
 * and URL-based cookie retrieval.
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
 * Demonstrates browser-specific cookie retrieval examples.
 * @internal
 * @returns A promise that resolves when all examples have completed.
 */
export async function browserSpecificExamples(): Promise<void> {
  // Get the cookie retrieval function
  const getCookieFn = await getCookie();

  // Get a cookie by name and domain
  const cookie = await getCookieFn({
    name: "user_session",
    domain: "github.com",
  });

  console.log("Cookie:", cookie);
}

/**
 * @description
 * Demonstrates URL-based cookie retrieval examples.
 * @internal
 * @returns A promise that resolves when all examples have completed.
 */
export async function urlBasedExamples(): Promise<void> {
  // Get the cookie retrieval function
  const getCookieFn = await getCookie();

  // Get a cookie by name and domain
  const cookie = await getCookieFn({
    name: "user_session",
    domain: "github.com",
  });

  console.log("Cookie:", cookie);
}

// Execute the examples
Promise.all([browserSpecificExamples(), urlBasedExamples()]).catch(
  console.error,
);

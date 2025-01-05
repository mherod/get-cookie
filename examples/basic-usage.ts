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

import { getCookie } from "@mherod/get-cookie";

/**
 * @description
 * Basic example showing how to retrieve cookies from browsers.
 * @internal
 */
async function main(): Promise<void> {
  // Get all session cookies from github.com
  const cookies = await getCookie({
    name: "user_session",
    domain: "github.com",
  });

  console.log("Found cookies:", cookies);
}

// Run the example
void main();

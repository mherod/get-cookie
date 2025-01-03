import type { ExportedCookie } from "../../types/ExportedCookie";

/**
 * Formats cookie query results into a human-readable string representation.
 * Supports both basic and verbose output formats.
 * @param cookies - Array of cookie objects to format. Each cookie must have at least name and value properties
 * @param verbose - When true, includes additional details like domain, expiry, and metadata
 * @returns A formatted string with one cookie per line
 * @example
 * // Basic usage
 * const cookies = [{ name: 'sessionId', value: '123abc' }];
 * resultsRendered(cookies);
 * // Returns:
 * // Found 1 cookie:
 * // - sessionId=123abc
 * @example
 * // Verbose output with multiple cookies
 * const cookies = [{
 *   name: 'sessionId',
 *   value: '123abc',
 *   domain: 'example.com',
 *   expiry: '2024-01-01T00:00:00.000Z'
 * }];
 * resultsRendered(cookies, true);
 * // Returns:
 * // Found 1 cookie:
 * // - sessionId=123abc
 * //   Domain: example.com
 * //   Expires: 2024-01-01T00:00:00.000Z
 */
export function resultsRendered(
  cookies: ExportedCookie[],
  verbose = false,
): string {
  if (cookies.length === 0) {
    return "No cookies found.";
  }

  const lines: string[] = [];
  lines.push(
    `Found ${cookies.length} cookie${cookies.length === 1 ? "" : "s"}:`,
  );

  for (const cookie of cookies) {
    lines.push(`- ${cookie.name}=${cookie.value}`);
    if (verbose) {
      lines.push(`  Domain: ${cookie.domain}`);
      if (cookie.expiry !== undefined) {
        const expiry =
          typeof cookie.expiry === "number" || cookie.expiry === "Infinity"
            ? cookie.expiry
            : cookie.expiry.toISOString();
        lines.push(`  Expires: ${expiry}`);
      }
      if (cookie.meta) {
        lines.push(`  Metadata: ${JSON.stringify(cookie.meta, null, 2)}`);
      }
    }
  }

  return lines.join("\n");
}

/**
 * @internal
 */
export default resultsRendered;

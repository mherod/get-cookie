import type { ExportedCookie } from "../../types/schemas";

/**
 * Formats the expiry value into a string representation
 * @internal
 * @param expiry - The expiry value to format
 * @returns Formatted expiry string
 */
function formatExpiry(expiry: unknown): string {
  if (typeof expiry === "number" || expiry === "Infinity") {
    return String(expiry);
  }
  if (expiry instanceof Date) {
    return expiry.toISOString();
  }
  return "Invalid expiry";
}

/**
 * Renders verbose details for a cookie
 * @internal
 * @param cookie - The cookie to render details for
 * @returns Array of detail lines
 */
function renderVerboseDetails(cookie: ExportedCookie): string[] {
  const lines: string[] = [];
  const { domain, expiry, meta } = cookie;

  if (typeof domain === "string") {
    lines.push(`  Domain: ${domain}`);
  }

  if (expiry !== undefined) {
    lines.push(`  Expires: ${formatExpiry(expiry)}`);
  }

  if (meta && typeof meta === "object") {
    lines.push(`  Metadata: ${JSON.stringify(meta, null, 2)}`);
  }

  return lines;
}

/**
 * Validates a cookie object has the required properties
 * @internal
 * @param cookie - The cookie object to validate
 * @returns Whether the cookie is valid
 */
function isValidCookie(cookie: unknown): cookie is ExportedCookie {
  return (
    cookie !== null &&
    typeof cookie === "object" &&
    "name" in cookie &&
    "value" in cookie &&
    typeof cookie.name === "string" &&
    typeof cookie.value === "string"
  );
}

/**
 * Renders an array of cookies into a human-readable format.
 * Each cookie is formatted as a line item with optional verbose details.
 * @param cookies - Array of cookies to render
 * @param verbose - When true, includes additional details like domain, expiry, and metadata
 * @returns Array of strings, each representing a line in the rendered output
 * @remarks
 * - Returns ["No cookies found"] if the input array is empty or invalid
 * - Invalid cookies in the array are silently skipped
 * - Expiry dates are converted to ISO string format if they are Date objects
 * - Metadata is JSON stringified with 2-space indentation in verbose mode
 * @example
 * ```typescript
 * // Basic usage
 * const lines = resultsRendered([{
 *   name: 'sessionId',
 *   value: '12345',
 *   domain: 'example.com'
 * }]);
 * // Returns: ["- sessionId=12345"]
 *
 * // Verbose output
 * const verboseLines = resultsRendered([{
 *   name: 'sessionId',
 *   value: '12345',
 *   domain: 'example.com',
 *   expiry: new Date('2024-12-31'),
 *   meta: { browser: 'Chrome' }
 * }], true);
 * // Returns: [
 * //   "- sessionId=12345",
 * //   "  Domain: example.com",
 * //   "  Expires: 2024-12-31T00:00:00.000Z",
 * //   "  Metadata: {",
 * //   "    \"browser\": \"Chrome\"",
 * //   "  }"
 * // ]
 * ```
 */
export function resultsRendered(
  cookies: ExportedCookie[],
  verbose = false,
): string[] {
  const lines: string[] = [];

  if (!Array.isArray(cookies) || cookies.length === 0) {
    lines.push("No cookies found");
    return lines;
  }

  for (const cookie of cookies) {
    if (!isValidCookie(cookie)) {
      continue;
    }

    lines.push(`- ${cookie.name}=${cookie.value}`);

    if (verbose) {
      lines.push(...renderVerboseDetails(cookie));
    }
  }

  return lines;
}

/**
 * Default export of the resultsRendered function.
 * Use this for rendering cookie results in a human-readable format.
 * @internal
 * @remarks
 * This is the recommended way to import the function for most use cases.
 * @example
 * ```typescript
 * import resultsRendered from './resultsRendered';
 *
 * const cookies = await queryCookies({ name: 'sessionId', domain: 'example.com' });
 * const output = resultsRendered(cookies, true);
 * console.log(output.join('\n'));
 * ```
 */
export default resultsRendered;

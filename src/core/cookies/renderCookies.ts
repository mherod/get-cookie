import { groupBy } from "lodash-es";

import { ExportedCookie, RenderOptions } from "../../types/schemas";

/**
 * Renders cookies as a string or array of strings based on the provided format option.
 * Supports merged format for single string output or grouped format for file-based grouping.
 * @param cookies - The cookies to render
 * @param options - Options for rendering
 * @param options.format - The output format ('merged' or 'grouped')
 * @param options.showFilePaths - Whether to include file paths in grouped output
 * @param options.separator - Custom separator for cookie values
 * @returns A string for merged format, or array of strings for grouped format
 * @example
 * ```typescript
 * // Merged format (default)
 * const cookies = [
 *   { name: 'sessionId', value: 'abc123' },
 *   { name: 'theme', value: 'dark' }
 * ];
 * renderCookies(cookies);
 * // Returns: "sessionId=abc123; theme=dark"
 *
 * // Grouped format with file paths
 * const groupedCookies = [
 *   { name: 'sessionId', value: 'abc123', meta: { file: 'auth.ts' } },
 *   { name: 'theme', value: 'dark', meta: { file: 'preferences.ts' } }
 * ];
 * renderCookies(groupedCookies, { format: 'grouped', showFilePaths: true });
 * // Returns: ["auth.ts: sessionId=abc123", "preferences.ts: theme=dark"]
 * ```
 */
export function renderCookies(
  cookies: ExportedCookie[],
  options: RenderOptions = {},
): string | string[] {
  const { format = "merged", showFilePaths = true, separator = "; " } = options;

  if (cookies.length === 0) {
    return format === "merged" ? "" : [];
  }

  const formatCookie = (cookie: ExportedCookie): string =>
    `${cookie.name}=${cookie.value}`;

  if (format === "merged") {
    return cookies.map(formatCookie).join(separator);
  }

  const groupedByFile = groupBy(cookies, (c) => c.meta?.file ?? "unknown");
  return Object.entries(groupedByFile).map(([file, fileCookies]) => {
    const values = fileCookies.map(formatCookie).join(separator);
    return showFilePaths ? `${file}: ${values}` : values;
  });
}

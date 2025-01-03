/**
 * The format to use when rendering cookies
 *
 * @example
 * ```typescript
 * import { RenderFormat } from 'get-cookie';
 *
 * // Merged format - combines all cookies into a single string
 * const mergedFormat: RenderFormat = 'merged';
 * // Result: "sessionId=abc123; theme=dark"
 *
 * // Grouped format - groups cookies by source file
 * const groupedFormat: RenderFormat = 'grouped';
 * // Result: ["Chrome/Cookies: sessionId=abc123", "Firefox/cookies.sqlite: theme=dark"]
 * ```
 */
export type RenderFormat = "merged" | "grouped";

/**
 * Options for rendering cookies
 *
 * @example
 * ```typescript
 * import { RenderOptions } from 'get-cookie';
 *
 * // Basic rendering options
 * const basicOptions: RenderOptions = {
 *   format: 'merged',
 *   separator: '; ',
 *   showFilePaths: false
 * };
 *
 * // Grouped format with file paths
 * const groupedOptions: RenderOptions = {
 *   format: 'grouped',
 *   separator: '; ',
 *   showFilePaths: true
 * };
 *
 * // Custom separator
 * const customOptions: RenderOptions = {
 *   format: 'merged',
 *   separator: ' && ',
 *   showFilePaths: false
 * };
 * ```
 */
export interface RenderOptions {
  /** The format to use when rendering cookies */
  format?: RenderFormat;
  /** The separator to use between cookies */
  separator?: string;
  /** Whether to show file paths in the output */
  showFilePaths?: boolean;
}

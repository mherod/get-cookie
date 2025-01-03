/**
 * Configuration options for rendering cookie data in different formats.
 * Controls how cookies are formatted and displayed in output.
 * @remarks
 * - Supports multiple output formats (JSON, text, etc.).
 * - Configurable separators for multi-cookie output.
 * - Optional file path inclusion for traceability.
 * @example
 * ```typescript
 * import { CookieRenderOptions } from 'get-cookie';
 *
 * // JSON format with default separator
 * const jsonRender: CookieRenderOptions = {
 *   format: "json",
 *   showFilePaths: false
 * };
 *
 * // Text format with custom separator
 * const textRender: CookieRenderOptions = {
 *   format: "text",
 *   separator: "\n---\n",
 *   showFilePaths: true
 * };
 *
 * // Compact single-line format
 * const compactRender: CookieRenderOptions = {
 *   format: "text",
 *   separator: "; ",
 *   showFilePaths: false
 * };
 *
 * // Debug format with all metadata
 * const debugRender: CookieRenderOptions = {
 *   format: "json",
 *   separator: "\n",
 *   showFilePaths: true
 * };
 * ```
 */
export interface CookieRenderOptions {
  /** The format to use when rendering cookies (e.g., "json", "text"). */
  format: "json" | "text";
  /** The separator to use between multiple cookies in the output. */
  separator?: string;
  /** Whether to include source file paths in the output for debugging. */
  showFilePaths?: boolean;
}

/**
 * Type guard to check if an object matches the CookieRenderOptions interface.
 * Used to validate render options before processing cookie output.
 * @param obj - The object to check.
 * @returns True if the object contains valid render options.
 * @example
 * ```typescript
 * import { isCookieRenderOptions } from 'get-cookie';
 *
 * // Valid render options
 * console.log(isCookieRenderOptions({ format: "json" })); // true
 * console.log(isCookieRenderOptions({
 *   format: "text",
 *   separator: "\n",
 *   showFilePaths: true
 * })); // true
 *
 * // Invalid examples
 * console.log(isCookieRenderOptions({ format: "csv" })); // false - invalid format
 * console.log(isCookieRenderOptions({ separator: "\n" })); // false - missing format
 * console.log(isCookieRenderOptions(null)); // false
 * ```
 */
export type RenderFormat = "merged" | "grouped";

/**
 * Options for rendering cookies.
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
  /** The format to use when rendering cookies. */
  format?: RenderFormat;
  /** The separator to use between cookies. */
  separator?: string;
  /** Whether to show file paths in the output. */
  showFilePaths?: boolean;
}

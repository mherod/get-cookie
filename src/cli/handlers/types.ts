import { ExportedCookie } from "../../types/schemas";

/**
 * Command-line arguments for cookie querying and output formatting
 * @example
 * ```typescript
 * // Dump output format
 * const dumpArgs: ParsedArgs = { dump: true };
 *
 * // Grouped dump format
 * const groupedDumpArgs: ParsedArgs = { 'dump-grouped': true };
 *
 * // Render format (shorthand)
 * const renderArgs: ParsedArgs = { r: true };
 *
 * // JSON output format
 * const jsonArgs: ParsedArgs = { output: 'json' };
 * ```
 */
export interface ParsedArgs {
  dump?: boolean;
  d?: boolean;
  "dump-grouped"?: boolean;
  D?: boolean;
  render?: boolean;
  "render-merged"?: boolean;
  r?: boolean;
  "render-grouped"?: boolean;
  R?: boolean;
  output?: string;
  [key: string]: unknown;
}

/**
 * Interface for handling different output formats of cookie query results
 * @example
 * ```typescript
 * class CustomOutputHandler implements OutputHandler {
 *   canHandle(args: ParsedArgs): boolean {
 *     return args.output === 'custom';
 *   }
 *
 *   handle(results: ExportedCookie[]): void {
 *     results.forEach(cookie => {
 *       console.log(`${cookie.domain}: ${cookie.name}=${cookie.value}`);
 *     });
 *   }
 * }
 *
 * // Usage
 * const handler = new CustomOutputHandler();
 * if (handler.canHandle({ output: 'custom' })) {
 *   handler.handle([{
 *     name: 'session',
 *     domain: 'example.com',
 *     value: 'abc123'
 *   }]);
 * }
 * ```
 */
export interface OutputHandler {
  /**
   * Determines if this handler can process the given arguments
   * @param args - The parsed command line arguments
   * @returns True if this handler can process the arguments
   * @example
   * ```typescript
   * class CustomHandler implements OutputHandler {
   *   canHandle(args: ParsedArgs): boolean {
   *     return args.output === 'custom';
   *   }
   * }
   * ```
   */
  canHandle(args: ParsedArgs): boolean;

  /**
   * Processes and outputs the cookie results in a specific format
   * @param results - Array of exported cookies to output
   * @example
   * ```typescript
   * class CustomHandler implements OutputHandler {
   *   handle(results: ExportedCookie[]): void {
   *     results.forEach(cookie => {
   *       console.log(`${cookie.name}=${cookie.value}`);
   *     });
   *   }
   * }
   * ```
   */
  handle(results: ExportedCookie[]): void;
}

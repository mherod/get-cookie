/**
 * The format to use when rendering cookies
 */
export type RenderFormat = 'merged' | 'grouped';

/**
 * Options for rendering cookies
 */
export interface RenderOptions {
  /** The format to render in ('merged' or 'grouped') */
  format?: RenderFormat;
  /** Whether to include file paths in the output */
  showFilePaths?: boolean;
  /** Custom separator for cookie values (defaults to '; ') */
  separator?: string;
}

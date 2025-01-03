/**
 * Mapping of module aliases to their corresponding import paths
 */
export const paths = {
  core: '@core',
  utils: '@utils',
  browsers: '@browsers',
  cli: '@cli'
} as const;

/**
 * Type representing the structure of the paths object
 */
export type Paths = typeof paths;
/**
 * Type representing the valid keys of the paths object
 */
export type PathKeys = keyof Paths;

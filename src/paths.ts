/**
 * Mapping of module aliases to their corresponding import paths
 *
 * @example
 * // Access path aliases
 * console.log(paths.core); // '@core'
 * console.log(paths.types); // '@types'
 *
 * // Use in import statements
 * import { getCookie } from '@core/cookies';
 * import { CookieSpec } from '@types/CookieSpec';
 */
export const paths = {
  core: "@core",
  types: "@types",
  utils: "@utils",
};

/**
 * Type representing the structure of the paths object
 *
 * @example
 * // Type usage in function parameters
 * function getPath(key: keyof Paths): string {
 *   return paths[key];
 * }
 *
 * // Type checking
 * const corePath: Paths['core'] = '@core';
 * const typesPath: Paths['types'] = '@types';
 */
export type Paths = typeof paths;

/**
 * Type representing the valid keys of the paths object
 *
 * @example
 * // Use as function parameter type
 * function validatePath(key: PathKeys): boolean {
 *   return key in paths;
 * }
 *
 * // Type checking
 * const validKey: PathKeys = 'core'; // OK
 * const invalidKey: PathKeys = 'invalid'; // Type error
 */
export type PathKeys = keyof Paths;

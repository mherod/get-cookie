import { merge } from "lodash";

/**
 * Global environment variables object that merges with process.env
 *
 * @example
 * // Access environment variables
 * const nodeEnv = env.NODE_ENV; // 'development'
 * const apiKey = env.API_KEY; // 'abc123'
 *
 * // Check if variable exists
 * if (env.DATABASE_URL) {
 *   // Use database URL
 * }
 *
 * // Add new environment variables
 * env.CUSTOM_VAR = 'my-value';
 */
export const env: { [key: string]: string | undefined } = {};
merge(env, process.env);

/**
 * User's home directory path from environment variables
 *
 * @throws Error if HOME environment variable is not set
 * @example
 * // Access home directory path
 * const homePath = HOME; // '/home/username' or 'C:\Users\username'
 *
 * // Use in file path construction
 * const configPath = `${homePath}/.config/app`;
 *
 * // Error handling
 * if (typeof homePath === 'string' && homePath.length > 0) {
 *   // Use home path
 * } else {
 *   throw new Error('HOME environment variable is not set or empty');
 * }
 */
export const HOME: string | undefined = env["HOME"];
if (typeof HOME !== "string" || HOME.length === 0) {
  throw new Error("HOME environment variable is not set or empty");
}

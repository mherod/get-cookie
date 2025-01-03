import { merge } from "lodash";

/**
 * Global environment variables object that merges with process.env
 */
export const env: { [key: string]: string | undefined } = {};
merge(env, process.env ?? {});
/**
 * User's home directory path from environment variables
 * @throws Error if HOME environment variable is not set
 */
export const HOME: string | undefined = env["HOME"];
if (!HOME) {
  throw new Error("HOME environment variable is not set");
}

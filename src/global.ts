import { merge } from "lodash";

export const env: { [key: string]: string | undefined } = {};
merge(env, process?.env ?? {});
export const HOME: string | undefined = env["HOME"];
if (!HOME) {
  throw new Error("HOME environment variable is not set");
}

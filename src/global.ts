import { merge } from "lodash";

export const env: any = {};
merge(env, process?.env ?? {});
export const HOME: string = env["HOME"];
if (!HOME) {
  throw new Error("HOME environment variable is not set");
}

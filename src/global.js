const { merge } = require("lodash");
export const env = {};
merge(env, process.env);
export const HOME = env["HOME"];
if (!HOME) {
  throw new Error("HOME environment variable is not set");
}

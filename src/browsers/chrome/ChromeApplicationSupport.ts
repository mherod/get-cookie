import { join } from "path";
import { HOME } from "../../global";

if (HOME === undefined) {
  throw new Error("HOME environment variable is not defined");
}

export const chromeApplicationSupport: string = join(
  HOME,
  "Library",
  "Application Support",
  "Google",
  "Chrome",
);

import { join } from "path";

import { HOME } from "../../../global";

/**
 * The path to Chrome's application support directory on macOS
 * This constant is used to locate Chrome's profile and cookie storage directories
 * @example
 */
export const chromeApplicationSupport = join(
  HOME ?? "",
  "Library",
  "Application Support",
  "Google",
  "Chrome",
);

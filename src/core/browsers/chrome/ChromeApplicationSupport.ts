import { homedir } from "node:os";
import { join } from "node:path";

/**
 * The path to Chrome's application support directory on macOS
 * This constant is used to locate Chrome's profile and cookie storage directories
 * @throws {Error} If unable to determine user's home directory
 */
export const chromeApplicationSupport = (() => {
  const home = homedir();
  if (!home) {
    throw new Error("Unable to determine user home directory");
  }
  return join(home, "Library", "Application Support", "Google", "Chrome");
})();

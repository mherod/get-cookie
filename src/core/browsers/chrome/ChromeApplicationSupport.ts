import { homedir } from "node:os";
import { join } from "node:path";
import { assertPlatformSupported, getPlatform } from "@utils/platformUtils";

/**
 * The path to Chrome's application support directory for the current platform
 * This constant is used to locate Chrome's profile and cookie storage directories
 * @throws {Error} If unable to determine user's home directory or platform is not supported
 */
export const chromeApplicationSupport = (() => {
  const home = homedir();
  if (!home) {
    throw new Error("Unable to determine user home directory");
  }

  assertPlatformSupported();

  switch (getPlatform()) {
    case "darwin":
      return join(home, "Library", "Application Support", "Google", "Chrome");
    case "win32":
      return join(home, "AppData", "Local", "Google", "Chrome", "User Data");
    case "linux":
      return join(home, ".config", "google-chrome");
    default:
      // This should never happen due to assertPlatformSupported
      throw new Error(`Platform ${getPlatform()} is not supported`);
  }
})();

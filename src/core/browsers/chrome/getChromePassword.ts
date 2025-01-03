import { memoize } from "lodash";

import logger from "@utils/logger";

const consola = logger.withTag("getChromePassword");

/**
 * Retrieves the Chrome encryption password from the system keychain
 * This function is only supported on macOS and will reject on other platforms
 * The result is memoized to avoid repeated keychain access
 * @returns A promise that resolves to the Chrome encryption password string
 * @throws {Error} If not running on macOS or if password retrieval fails
 */
export const getChromePassword = memoize(async (): Promise<string> => {
  if (process.platform !== "darwin") {
    consola.error("Chrome password retrieval is only supported on macOS");
    throw new Error("This only works on macOS");
  }

  try {
    const { getChromePassword: getMacOSPassword } = await import("./macos/getChromePassword");
    const password = await getMacOSPassword();
    consola.debug("Retrieved Chrome password successfully");
    return password;
  } catch (error) {
    consola.error("Failed to get Chrome password:", error);
    throw error;
  }
});

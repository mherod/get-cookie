import { memoize } from "lodash";

import { logError, logDebug } from "@utils/logHelpers";

/**
 * Retrieves the Chrome password for decrypting cookies
 * This is only supported on macOS
 *
 * @returns A promise that resolves to the Chrome password
 * @throws {Error} If the platform is not macOS or if password retrieval fails
 * @example
 */
export const getChromePassword = memoize(async (): Promise<string> => {
  if (process.platform !== "darwin") {
    logError(
      "Chrome password retrieval failed",
      new Error("This only works on macOS"),
      {
        platform: process.platform,
      },
    );
    throw new Error("This only works on macOS");
  }

  try {
    const { getChromePassword: getMacOSPassword } = await import(
      "./macos/getChromePassword"
    );
    const password = await getMacOSPassword();
    logDebug("ChromePassword", "Retrieved password successfully", {
      platform: "macOS",
    });
    return password;
  } catch (error) {
    logError("Chrome password retrieval failed", error, { platform: "macOS" });
    throw error;
  }
});

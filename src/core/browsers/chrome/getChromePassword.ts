import { platform } from "os";

import { getChromePassword as getMacOSPassword } from "./macos/getChromePassword";

/**
 * Gets the Chrome Safe Storage password for the current platform
 * @returns A promise that resolves to the Chrome Safe Storage password
 * @throws {Error} If the password cannot be retrieved or the platform is not supported
 */
export async function getChromePassword(): Promise<string> {
  switch (platform()) {
    case "darwin": {
      return getMacOSPassword();
    }
    default:
      throw new Error(`Platform ${platform()} is not supported`);
  }
}

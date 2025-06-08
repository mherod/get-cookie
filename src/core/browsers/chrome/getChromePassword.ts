import { platform } from "node:os";

import { getChromePassword as getMacOSPassword } from "./macos/getChromePassword";

/**
 * Gets the Chrome Safe Storage password for the current platform.
 * This password is used to decrypt cookies stored in Chrome's cookie database.
 * Currently only supports macOS, where the password is stored in the system keychain.
 * @returns A promise that resolves to the Chrome Safe Storage password
 * @throws {Error} If the password cannot be retrieved or the platform is not supported
 */
export async function getChromePassword(): Promise<string> {
  switch (platform()) {
    case "darwin": {
      return await getMacOSPassword();
    }
    default:
      throw new Error(`Platform ${platform()} is not supported`);
  }
}

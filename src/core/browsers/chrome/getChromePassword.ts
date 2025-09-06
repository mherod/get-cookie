import { assertPlatformSupported, getPlatform } from "@utils/platformUtils";

import { getChromePassword as getLinuxPassword } from "./linux/getChromePassword";
import { getChromePassword as getMacOSPassword } from "./macos/getChromePassword";
import { getChromePassword as getWindowsPassword } from "./windows/getChromePassword";

/**
 * Gets the Chrome Safe Storage password for the current platform.
 * This password is used to decrypt cookies stored in Chrome's cookie database.
 * Supports macOS (keychain), Windows (DPAPI), and Linux (keyring/libsecret).
 * @returns A promise that resolves to the Chrome Safe Storage password or Buffer
 * @throws {Error} If the password cannot be retrieved or the platform is not supported
 */
export async function getChromePassword(): Promise<string | Buffer> {
  assertPlatformSupported();

  switch (getPlatform()) {
    case "darwin": {
      return getMacOSPassword();
    }
    case "win32": {
      return getWindowsPassword();
    }
    case "linux": {
      return getLinuxPassword();
    }
    default:
      // This should never happen due to assertPlatformSupported
      throw new Error(`Platform ${getPlatform()} is not supported`);
  }
}

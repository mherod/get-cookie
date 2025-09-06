import { assertPlatformSupported, getPlatform } from "@utils/platformUtils";

import type { ChromiumBrowser } from "./ChromiumBrowsers";
import { execSimple } from "../../../utils/execSimple";

/**
 * Maps browser types to their keychain service names on macOS
 */
const MACOS_KEYCHAIN_SERVICES: Record<ChromiumBrowser, string> = {
  chrome: "Chrome Safe Storage",
  chromium: "Chromium Safe Storage",
  brave: "Brave Safe Storage",
  edge: "Microsoft Edge Safe Storage",
  arc: "Arc Safe Storage",
  opera: "Opera Safe Storage",
  "opera-gx": "Opera Safe Storage", // Opera GX shares Opera's keychain
  vivaldi: "Vivaldi Safe Storage",
  whale: "Whale Safe Storage",
};

/**
 * Gets the Chromium browser Safe Storage password for macOS
 * @param browser - The browser type to get the password for
 * @returns A promise that resolves to the browser's Safe Storage password
 */
async function getMacOSPassword(browser: ChromiumBrowser): Promise<string> {
  const service = MACOS_KEYCHAIN_SERVICES[browser];
  if (!service) {
    throw new Error(`Unknown browser type: ${browser}`);
  }

  try {
    const command = `security find-generic-password -w -s "${service}"`;
    const result = await execSimple(command);
    return result.stdout.trim();
  } catch (error) {
    // Fallback to Chrome if browser-specific key not found
    // This is useful for browsers that share Chrome's encryption
    if (browser !== "chrome") {
      const chromeCommand = `security find-generic-password -w -s "Chrome Safe Storage"`;
      try {
        const result = await execSimple(chromeCommand);
        return result.stdout.trim();
      } catch {
        // If Chrome fallback also fails, throw original error
      }
    }
    throw new Error(
      `Failed to get ${browser} password from keychain: ${error}`,
    );
  }
}

/**
 * Gets the Chromium browser password for Windows
 * Windows uses DPAPI which is browser-agnostic
 */
async function getWindowsPassword(): Promise<string | Buffer> {
  // Import dynamically to avoid loading on non-Windows platforms
  const { getChromePassword } = await import("./windows/getChromePassword");
  return getChromePassword();
}

/**
 * Gets the Chromium browser password for Linux
 * Linux typically uses a hardcoded key or libsecret
 */
async function getLinuxPassword(): Promise<string> {
  // Import dynamically to avoid loading on non-Linux platforms
  const { getChromePassword } = await import("./linux/getChromePassword");
  return getChromePassword();
}

/**
 * Gets the Chromium-based browser Safe Storage password for the current platform.
 * This password is used to decrypt cookies stored in the browser's cookie database.
 * Supports macOS (keychain), Windows (DPAPI), and Linux (keyring/libsecret).
 *
 * @param browser - The Chromium-based browser to get the password for
 * @returns A promise that resolves to the browser's Safe Storage password or Buffer
 * @throws {Error} If the password cannot be retrieved or the platform is not supported
 */
export async function getChromiumPassword(
  browser: ChromiumBrowser = "chrome",
): Promise<string | Buffer> {
  assertPlatformSupported();

  switch (getPlatform()) {
    case "darwin": {
      return getMacOSPassword(browser);
    }
    case "win32": {
      // Windows uses DPAPI which works for all Chromium browsers
      return getWindowsPassword();
    }
    case "linux": {
      // Linux uses a hardcoded key for all Chromium browsers
      return getLinuxPassword();
    }
    default:
      throw new Error(`Platform ${getPlatform()} is not supported`);
  }
}

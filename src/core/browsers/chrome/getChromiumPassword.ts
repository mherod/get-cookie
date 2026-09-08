import { assertPlatformSupported, getPlatform } from "@utils/platformUtils";

import { execSimple } from "../../../utils/execSimple";
import {
  getLinuxKeyringOverride,
  type LinuxKeyring,
} from "../../cookies/CookieQueryContext";

import type { ChromiumBrowser } from "./ChromiumBrowsers";

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
async function getLinuxPassword(
  browser: ChromiumBrowser,
  keyring?: LinuxKeyring,
): Promise<string> {
  // Import dynamically to avoid loading on non-Linux platforms
  const { getChromePassword } = await import("./linux/getChromePassword");
  return getChromePassword(browser, keyring);
}

/**
 * Resolves the Safe Storage password by dispatching to the platform backend.
 * @param browser - The Chromium-based browser to get the password for
 * @returns A promise that resolves to the browser's Safe Storage password or Buffer
 */
async function resolveChromiumPassword(
  browser: ChromiumBrowser,
  keyring?: LinuxKeyring,
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
      return getLinuxPassword(browser, keyring);
    }
    default:
      throw new Error(`Platform ${getPlatform()} is not supported`);
  }
}

/**
 * Cache of Safe Storage passwords by platform, browser and keyring override.
 *
 * The Safe Storage secret is stable for the lifetime of the process, but each
 * lookup is expensive: macOS spawns the `security` subprocess and Windows/Linux
 * dynamically import a platform module. The same password is requested per
 * cookie file, per profile and across Chromium-family strategies, so without a
 * cache a single run pays that cost many times over.
 *
 * The in-flight Promise (not the resolved value) is cached so concurrent
 * callers coalesce onto one lookup. Failures are evicted so a transient error
 * (e.g. keychain locked) does not poison later retries — only successful
 * lookups stay cached.
 */
const passwordCache = new Map<string, Promise<string | Buffer>>();

/**
 * Gets the Chromium-based browser Safe Storage password for the current platform.
 * This password is used to decrypt cookies stored in the browser's cookie database.
 * Supports macOS (keychain), Windows (DPAPI), and Linux (keyring/libsecret).
 *
 * The result is memoized per platform, browser and keyring for the process lifetime; see
 * {@link resetChromiumPasswordCache} to clear it in tests.
 * @param browser - The Chromium-based browser to get the password for
 * @returns A promise that resolves to the browser's Safe Storage password or Buffer
 * @throws {Error} If the password cannot be retrieved or the platform is not supported
 */
export function getChromiumPassword(
  browser: ChromiumBrowser = "chrome",
): Promise<string | Buffer> {
  const keyring = getLinuxKeyringOverride();
  const cacheKey = `${getPlatform()}:${browser}:${keyring ?? "auto"}`;
  const cached = passwordCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const passwordPromise = resolveChromiumPassword(browser, keyring).catch(
    (error: unknown) => {
      // Don't cache failures — let the next call retry the keychain/import.
      passwordCache.delete(cacheKey);
      throw error;
    },
  );

  passwordCache.set(cacheKey, passwordPromise);
  return passwordPromise;
}

/**
 * Clears the cached Safe Storage passwords. Intended for tests that need to
 * exercise password retrieval in isolation without cross-test cache bleed.
 */
export function resetChromiumPasswordCache(): void {
  passwordCache.clear();
}

import { homedir } from "node:os";
import { join } from "node:path";
import { assertPlatformSupported, getPlatform } from "@utils/platformUtils";

/**
 * Chromium browser configuration and path management
 * Supports Chrome, Chromium, Brave, Edge, Opera, Vivaldi, and Whale browsers
 * across Windows, macOS, and Linux platforms
 */

/**
 * Supported Chromium-based browsers
 */
export const CHROMIUM_BASED_BROWSERS = [
  "chrome",
  "chromium",
  "brave",
  "edge",
  "opera",
  "vivaldi",
  "whale",
] as const;

export type ChromiumBrowser = (typeof CHROMIUM_BASED_BROWSERS)[number];

/**
 * Browser directory configuration for different platforms
 */
interface BrowserPaths {
  windows: string;
  macos: string;
  linux: string;
}

/**
 * Get the browser configuration directory for a specific browser and platform
 */
export function getChromiumBrowserPath(browser: ChromiumBrowser): string {
  const home = homedir();
  if (!home) {
    throw new Error("Unable to determine user home directory");
  }

  assertPlatformSupported();
  const currentPlatform = getPlatform();

  const browserPaths: Record<ChromiumBrowser, BrowserPaths> = {
    chrome: {
      windows: join(home, "AppData", "Local", "Google", "Chrome", "User Data"),
      macos: join(home, "Library", "Application Support", "Google", "Chrome"),
      linux: join(home, ".config", "google-chrome"),
    },
    chromium: {
      windows: join(home, "AppData", "Local", "Chromium", "User Data"),
      macos: join(home, "Library", "Application Support", "Chromium"),
      linux: join(home, ".config", "chromium"),
    },
    brave: {
      windows: join(
        home,
        "AppData",
        "Local",
        "BraveSoftware",
        "Brave-Browser",
        "User Data",
      ),
      macos: join(
        home,
        "Library",
        "Application Support",
        "BraveSoftware",
        "Brave-Browser",
      ),
      linux: join(home, ".config", "BraveSoftware", "Brave-Browser"),
    },
    edge: {
      windows: join(home, "AppData", "Local", "Microsoft", "Edge", "User Data"),
      macos: join(home, "Library", "Application Support", "Microsoft Edge"),
      linux: join(home, ".config", "microsoft-edge"),
    },
    opera: {
      windows: join(
        home,
        "AppData",
        "Roaming",
        "Opera Software",
        "Opera Stable",
      ),
      macos: join(
        home,
        "Library",
        "Application Support",
        "com.operasoftware.Opera",
      ),
      linux: join(home, ".config", "opera"),
    },
    vivaldi: {
      windows: join(home, "AppData", "Local", "Vivaldi", "User Data"),
      macos: join(home, "Library", "Application Support", "Vivaldi"),
      linux: join(home, ".config", "vivaldi"),
    },
    whale: {
      windows: join(
        home,
        "AppData",
        "Local",
        "Naver",
        "Naver Whale",
        "User Data",
      ),
      macos: join(home, "Library", "Application Support", "Naver", "Whale"),
      linux: join(home, ".config", "naver-whale"),
    },
  };

  const paths = browserPaths[browser];
  if (!paths) {
    throw new Error(`Unknown browser: ${browser}`);
  }

  switch (currentPlatform) {
    case "win32":
      return paths.windows;
    case "darwin":
      return paths.macos;
    case "linux":
      return paths.linux;
    default:
      throw new Error(`Platform ${currentPlatform} is not supported`);
  }
}

/**
 * Get all Chromium browser paths for the current platform
 */
export function getAllChromiumBrowserPaths(): Record<ChromiumBrowser, string> {
  const result: Partial<Record<ChromiumBrowser, string>> = {};

  for (const browser of CHROMIUM_BASED_BROWSERS) {
    try {
      result[browser] = getChromiumBrowserPath(browser);
    } catch {
      // Skip browsers that fail (e.g., unsupported platform)
    }
  }

  return result as Record<ChromiumBrowser, string>;
}

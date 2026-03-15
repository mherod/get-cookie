/**
 * Browser availability detection for the current environment
 * @module BrowserAvailability
 */

import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import fg from "fast-glob";

import { createTaggedLogger } from "@utils/logHelpers";
import { getPlatform, isLinux, isMacOS, isWindows } from "@utils/platformUtils";
import { execSimple } from "@utils/execSimple";

import { getBrowserDisplayName } from "./BrowserDetector";
import type { BrowserType } from "./BrowserDetector";

const logger = createTaggedLogger("BrowserAvailability");

/**
 * Information about an available browser
 */
export interface AvailableBrowser {
  type: BrowserType;
  name: string;
  installed: boolean;
  profilePaths?: string[];
  executablePath?: string;
  version?: string;
}

/**
 * Platform-specific browser paths
 */
export const BROWSER_PATHS = {
  darwin: {
    chrome: [
      "/Applications/Google Chrome.app",
      `${homedir()}/Applications/Google Chrome.app`,
      `${homedir()}/Library/Application Support/Google/Chrome`,
    ],
    firefox: [
      "/Applications/Firefox.app",
      `${homedir()}/Applications/Firefox.app`,
      `${homedir()}/Library/Application Support/Firefox`,
    ],
    safari: [
      "/Applications/Safari.app",
      `${homedir()}/Library/Safari`,
      `${homedir()}/Library/Cookies`,
    ],
    edge: [
      "/Applications/Microsoft Edge.app",
      `${homedir()}/Applications/Microsoft Edge.app`,
      `${homedir()}/Library/Application Support/Microsoft Edge`,
    ],
    arc: [
      "/Applications/Arc.app",
      `${homedir()}/Applications/Arc.app`,
      `${homedir()}/Library/Application Support/Arc`,
    ],
    opera: [
      "/Applications/Opera.app",
      `${homedir()}/Applications/Opera.app`,
      `${homedir()}/Library/Application Support/com.operasoftware.Opera`,
    ],
    "opera-gx": [
      "/Applications/Opera GX.app",
      `${homedir()}/Applications/Opera GX.app`,
      `${homedir()}/Library/Application Support/com.operasoftware.OperaGX`,
    ],
    brave: [
      "/Applications/Brave Browser.app",
      `${homedir()}/Applications/Brave Browser.app`,
      `${homedir()}/Library/Application Support/BraveSoftware/Brave-Browser`,
    ],
    vivaldi: [
      "/Applications/Vivaldi.app",
      `${homedir()}/Applications/Vivaldi.app`,
      `${homedir()}/Library/Application Support/Vivaldi`,
    ],
  },
  win32: {
    chrome: [
      join(process.env.LOCALAPPDATA ?? "", "Google", "Chrome"),
      join(process.env.PROGRAMFILES ?? "", "Google", "Chrome"),
      join(process.env["PROGRAMFILES(X86)"] ?? "", "Google", "Chrome"),
    ],
    firefox: [
      join(process.env.APPDATA ?? "", "Mozilla", "Firefox"),
      join(process.env.PROGRAMFILES ?? "", "Mozilla Firefox"),
      join(process.env["PROGRAMFILES(X86)"] ?? "", "Mozilla Firefox"),
    ],
    safari: [], // Safari not available on Windows
    edge: [
      join(process.env.LOCALAPPDATA ?? "", "Microsoft", "Edge"),
      join(process.env.PROGRAMFILES ?? "", "Microsoft", "Edge"),
      join(process.env["PROGRAMFILES(X86)"] ?? "", "Microsoft", "Edge"),
    ],
    arc: [], // Arc not available on Windows yet
    opera: [
      join(process.env.APPDATA ?? "", "Opera Software", "Opera Stable"),
      join(process.env.PROGRAMFILES ?? "", "Opera"),
      join(process.env["PROGRAMFILES(X86)"] ?? "", "Opera"),
    ],
    "opera-gx": [
      join(process.env.APPDATA ?? "", "Opera Software", "Opera GX Stable"),
      join(process.env.PROGRAMFILES ?? "", "Opera GX"),
      join(process.env["PROGRAMFILES(X86)"] ?? "", "Opera GX"),
    ],
    brave: [
      join(process.env.LOCALAPPDATA ?? "", "BraveSoftware", "Brave-Browser"),
      join(process.env.PROGRAMFILES ?? "", "BraveSoftware", "Brave-Browser"),
    ],
    vivaldi: [
      join(process.env.LOCALAPPDATA ?? "", "Vivaldi", "Application"),
      join(process.env.PROGRAMFILES ?? "", "Vivaldi", "Application"),
    ],
  },
  linux: {
    chrome: [
      `${homedir()}/.config/google-chrome`,
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/opt/google/chrome",
    ],
    firefox: [
      `${homedir()}/.mozilla/firefox`,
      "/usr/bin/firefox",
      "/usr/lib/firefox",
      "/snap/firefox",
    ],
    safari: [], // Safari not available on Linux
    edge: [
      `${homedir()}/.config/microsoft-edge`,
      "/usr/bin/microsoft-edge",
      "/opt/microsoft/msedge",
    ],
    arc: [], // Arc not available on Linux
    brave: [
      `${homedir()}/.config/BraveSoftware/Brave-Browser`,
      "/usr/bin/brave-browser",
      "/usr/bin/brave-browser-stable",
      "/opt/brave.com/brave",
    ],
    opera: [`${homedir()}/.config/opera`, "/usr/bin/opera", "/usr/lib/opera"],
    "opera-gx": [`${homedir()}/.config/opera-gx`, "/usr/bin/opera-gx"],
    vivaldi: [
      `${homedir()}/.config/vivaldi`,
      "/usr/bin/vivaldi",
      "/usr/bin/vivaldi-stable",
      "/opt/vivaldi",
    ],
  },
};

/**
 * User data directories for Chromium-based browsers per platform.
 * Kept separate from BROWSER_PATHS (which lists all detection paths including
 * app bundles and binaries) so that profile listing always uses the correct
 * data directory regardless of how BROWSER_PATHS entries are ordered.
 */
export const CHROMIUM_DATA_DIRS: Partial<
  Record<string, Partial<Record<string, string>>>
> = {
  darwin: {
    chrome: join(
      homedir(),
      "Library",
      "Application Support",
      "Google",
      "Chrome",
    ),
    edge: join(homedir(), "Library", "Application Support", "Microsoft Edge"),
    arc: join(homedir(), "Library", "Application Support", "Arc"),
    opera: join(
      homedir(),
      "Library",
      "Application Support",
      "com.operasoftware.Opera",
    ),
    "opera-gx": join(
      homedir(),
      "Library",
      "Application Support",
      "com.operasoftware.OperaGX",
    ),
    brave: join(
      homedir(),
      "Library",
      "Application Support",
      "BraveSoftware",
      "Brave-Browser",
    ),
    vivaldi: join(homedir(), "Library", "Application Support", "Vivaldi"),
  },
  win32: {
    // Chrome and Edge store profiles under …\User Data on Windows
    chrome: join(
      process.env.LOCALAPPDATA ?? "",
      "Google",
      "Chrome",
      "User Data",
    ),
    edge: join(
      process.env.LOCALAPPDATA ?? "",
      "Microsoft",
      "Edge",
      "User Data",
    ),
    opera: join(process.env.APPDATA ?? "", "Opera Software", "Opera Stable"),
    "opera-gx": join(
      process.env.APPDATA ?? "",
      "Opera Software",
      "Opera GX Stable",
    ),
    arc: join(
      process.env.LOCALAPPDATA ?? "",
      "Packages",
      "TheBrowserCompany.Arc_ttt1ap7aabd4t",
      "LocalCache",
    ),
    brave: join(
      process.env.LOCALAPPDATA ?? "",
      "BraveSoftware",
      "Brave-Browser",
      "User Data",
    ),
    vivaldi: join(process.env.LOCALAPPDATA ?? "", "Vivaldi", "User Data"),
  },
  linux: {
    chrome: join(homedir(), ".config", "google-chrome"),
    edge: join(homedir(), ".config", "microsoft-edge"),
    opera: join(homedir(), ".config", "opera"),
    "opera-gx": join(homedir(), ".config", "opera-gx"),
    brave: join(homedir(), ".config", "BraveSoftware", "Brave-Browser"),
    vivaldi: join(homedir(), ".config", "vivaldi"),
  },
};

/**
 * Firefox data directories per platform.
 * Firefox uses profiles.ini rather than Local State for profile metadata.
 * Each entry is an array because Firefox variants (regular, Developer Edition, ESR)
 * may coexist on the same machine.
 */
export const FIREFOX_DATA_DIRS: Partial<Record<string, string[]>> = {
  darwin: [join(homedir(), "Library", "Application Support", "Firefox")],
  win32: [
    join(homedir(), "AppData", "Roaming", "Mozilla", "Firefox"),
    join(
      homedir(),
      "AppData",
      "Roaming",
      "Mozilla",
      "Firefox Developer Edition",
    ),
    join(homedir(), "AppData", "Roaming", "Mozilla", "Firefox ESR"),
  ],
  linux: [join(homedir(), ".mozilla", "firefox")],
};

/** Module-level cache for browser installation checks — installations don't change during process lifetime */
const installCache = new Map<BrowserType, boolean>();

/**
 * Checks if a browser is installed by looking for its paths
 * @param browser - The browser type to check
 * @returns True if the browser is installed
 */
function checkBrowserInstalled(browser: BrowserType): boolean {
  const cached = installCache.get(browser);
  if (cached !== undefined) {
    return cached;
  }

  const platform = getPlatform();

  // Defensive check: handle unexpected platform values gracefully
  // Check if platform exists in BROWSER_PATHS before accessing
  if (!(platform in BROWSER_PATHS)) {
    installCache.set(browser, false);
    return false;
  }

  const platformKey = platform as keyof typeof BROWSER_PATHS;
  const platformPaths = BROWSER_PATHS[platformKey];

  // Defensive check: handle missing browser entries gracefully
  const paths = browser in platformPaths ? platformPaths[browser] : [];

  for (const path of paths) {
    if (existsSync(path)) {
      logger.debug("Found browser installation", { browser, path });
      installCache.set(browser, true);
      return true;
    }
  }

  installCache.set(browser, false);
  return false;
}

/**
 * Gets the version command for a browser on the current platform
 * @param browser - The browser type
 * @returns Shell command to get browser version, or undefined
 */
function getVersionCommand(browser: BrowserType): string | undefined {
  if (isMacOS()) {
    const versionCommands: Partial<Record<BrowserType, string>> = {
      chrome:
        "/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --version 2>/dev/null",
      firefox:
        "/Applications/Firefox.app/Contents/MacOS/firefox --version 2>/dev/null",
      safari:
        "defaults read /Applications/Safari.app/Contents/Info.plist CFBundleShortVersionString 2>/dev/null",
      edge: "/Applications/Microsoft\\ Edge.app/Contents/MacOS/Microsoft\\ Edge --version 2>/dev/null",
      arc: "defaults read /Applications/Arc.app/Contents/Info.plist CFBundleShortVersionString 2>/dev/null",
      brave:
        "/Applications/Brave\\ Browser.app/Contents/MacOS/Brave\\ Browser --version 2>/dev/null",
      opera:
        "/Applications/Opera.app/Contents/MacOS/Opera --version 2>/dev/null",
      "opera-gx":
        "/Applications/Opera\\ GX.app/Contents/MacOS/Opera\\ GX --version 2>/dev/null",
      vivaldi:
        "/Applications/Vivaldi.app/Contents/MacOS/Vivaldi --version 2>/dev/null",
    };
    return versionCommands[browser];
  }

  if (isLinux()) {
    const versionCommands: Partial<Record<BrowserType, string>> = {
      chrome:
        "google-chrome --version 2>/dev/null || google-chrome-stable --version 2>/dev/null",
      firefox: "firefox --version 2>/dev/null",
      edge: "microsoft-edge --version 2>/dev/null",
      brave:
        "brave-browser --version 2>/dev/null || brave-browser-stable --version 2>/dev/null",
      opera: "opera --version 2>/dev/null",
      "opera-gx": "opera-gx --version 2>/dev/null",
      vivaldi:
        "vivaldi --version 2>/dev/null || vivaldi-stable --version 2>/dev/null",
    };
    return versionCommands[browser];
  }

  // Windows version detection is more complex, skip for now
  return undefined;
}

/**
 * Gets the version of an installed browser asynchronously
 * @param browser - The browser type
 * @returns The browser version or undefined
 */
export async function getBrowserVersionAsync(
  browser: BrowserType,
): Promise<string | undefined> {
  try {
    const command = getVersionCommand(browser);
    if (command === undefined) {
      return undefined;
    }

    const { stdout } = await execSimple(command);
    const version = stdout.trim();
    if (version) {
      logger.debug("Got browser version", { browser, version });
      return version;
    }
  } catch (error) {
    logger.debug("Failed to get browser version", { browser, error });
  }

  return undefined;
}

/**
 * Find Chrome/Edge profiles in a base path
 * @param basePath - Base directory path for browser profiles
 * @returns Array of profile paths found
 */
function findChromiumProfiles(basePath: string): string[] {
  if (!existsSync(basePath)) {
    return [];
  }

  // Single glob replaces 12 existsSync calls (Default + Profile 1..10)
  return fg.sync(["Default", "Profile *"], {
    cwd: basePath,
    onlyDirectories: true,
    absolute: true,
  });
}

/**
 * Find Firefox profiles in a base path
 * @param basePath - Base directory path for Firefox profiles
 * @returns Array of profile paths found
 */
function findFirefoxProfilesInPath(basePath: string): string[] {
  // Single glob replaces existsSync + readdirSync + manual filter
  return fg.sync(["*default*"], {
    cwd: basePath,
    onlyDirectories: true,
    absolute: true,
  });
}

/**
 * Get base path for Chromium-based browsers (Chrome/Edge)
 * @param browser - Browser type (chrome or edge)
 * @returns Base path for browser profiles
 */
function getChromiumBasePath(browser: "chrome" | "edge" | "brave"): string {
  const home = homedir();

  const dirMap = {
    darwin: {
      chrome: "Google/Chrome",
      edge: "Microsoft Edge",
      brave: "BraveSoftware/Brave-Browser",
    },
    win32: {
      chrome: "Google/Chrome",
      edge: "Microsoft/Edge",
      brave: "BraveSoftware/Brave-Browser",
    },
    linux: {
      chrome: "google-chrome",
      edge: "microsoft-edge",
      brave: "BraveSoftware/Brave-Browser",
    },
  } as const;

  if (isMacOS()) {
    return join(home, "Library", "Application Support", dirMap.darwin[browser]);
  }
  if (isWindows()) {
    return join(process.env.LOCALAPPDATA ?? "", dirMap.win32[browser]);
  }
  return join(home, ".config", dirMap.linux[browser]);
}

/**
 * Get base path for Firefox browser
 * @returns Base path for Firefox profiles
 */
function getFirefoxBasePath(): string {
  const home = homedir();
  if (isMacOS()) {
    return join(home, "Library", "Application Support", "Firefox", "Profiles");
  }
  if (isWindows()) {
    return join(process.env.APPDATA ?? "", "Mozilla", "Firefox", "Profiles");
  }
  return join(home, ".mozilla", "firefox");
}

/**
 * Finds profile directories for a browser
 * @param browser - The browser type
 * @returns Array of profile paths
 */
function findBrowserProfiles(browser: BrowserType): string[] {
  const profiles: string[] = [];

  try {
    if (browser === "chrome" || browser === "edge" || browser === "brave") {
      const basePath = getChromiumBasePath(browser);
      profiles.push(...findChromiumProfiles(basePath));
    } else if (browser === "firefox") {
      const basePath = getFirefoxBasePath();
      profiles.push(...findFirefoxProfilesInPath(basePath));
    }
  } catch (error) {
    logger.debug("Failed to find browser profiles", { browser, error });
  }

  return profiles;
}

/**
 * Detects all available browsers on the current system.
 * This function is synchronous — it checks file system paths only.
 * Browser version detection is async and available separately via
 * {@link getBrowserVersionAsync}.
 * @returns Array of available browser information
 */
export function detectAvailableBrowsers(): AvailableBrowser[] {
  const browsers: BrowserType[] = [
    "chrome",
    "firefox",
    "safari",
    "edge",
    "arc",
    "brave",
    "opera",
    "opera-gx",
    "vivaldi",
  ];

  const available: AvailableBrowser[] = [];

  for (const browser of browsers) {
    const installed = checkBrowserInstalled(browser);

    if (installed) {
      const info: AvailableBrowser = {
        type: browser,
        name: getBrowserDisplayName(browser),
        installed: true,
        profilePaths: findBrowserProfiles(browser),
      };

      logger.info("Found available browser", {
        browser: info.name,
        profiles: info.profilePaths?.length ?? 0,
      });

      available.push(info);
    } else {
      available.push({
        type: browser,
        name: getBrowserDisplayName(browser),
        installed: false,
      });
    }
  }

  return available;
}

/**
 * Gets detailed information about a specific browser.
 * Version is not included — use {@link getBrowserVersionAsync} separately if needed.
 * @param browser - The browser type
 * @returns Browser information or undefined if not available
 */
export function getBrowserInfo(
  browser: BrowserType,
): AvailableBrowser | undefined {
  const installed = checkBrowserInstalled(browser);

  if (!installed) {
    return undefined;
  }

  return {
    type: browser,
    name: getBrowserDisplayName(browser),
    installed: true,
    profilePaths: findBrowserProfiles(browser),
  };
}

/**
 * Gets only the installed browsers
 * @returns Array of installed browsers
 */
export function getInstalledBrowsers(): AvailableBrowser[] {
  const all = detectAvailableBrowsers();
  return all.filter((b) => b.installed);
}

/**
 * Suggests the best browser to use based on availability
 * @returns The recommended browser type or undefined
 */
export function suggestBrowser(): BrowserType | undefined {
  const installed = getInstalledBrowsers();

  if (installed.length === 0) {
    logger.warn("No browsers found on system");
    return undefined;
  }

  // Prefer browsers in this order
  const preferenceOrder: BrowserType[] = [
    "chrome",
    "edge",
    "brave",
    "firefox",
    "safari",
    "arc",
    "vivaldi",
    "opera",
    "opera-gx",
  ];

  for (const preferred of preferenceOrder) {
    const found = installed.find((b) => b.type === preferred);
    if (found) {
      logger.info("Suggesting browser", { browser: found.name });
      return found.type;
    }
  }

  // Return first available if no preferred browser found
  return installed[0]?.type;
}

/**
 * Browser availability detection for the current environment
 * @module BrowserAvailability
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { createTaggedLogger } from "@utils/logHelpers";
import { getPlatform, isLinux, isMacOS, isWindows } from "@utils/platformUtils";

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
const BROWSER_PATHS = {
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
  },
  win32: {
    chrome: [
      join(process.env.LOCALAPPDATA || "", "Google", "Chrome"),
      join(process.env.PROGRAMFILES || "", "Google", "Chrome"),
      join(process.env["PROGRAMFILES(X86)"] || "", "Google", "Chrome"),
    ],
    firefox: [
      join(process.env.APPDATA || "", "Mozilla", "Firefox"),
      join(process.env.PROGRAMFILES || "", "Mozilla Firefox"),
      join(process.env["PROGRAMFILES(X86)"] || "", "Mozilla Firefox"),
    ],
    safari: [], // Safari not available on Windows
    edge: [
      join(process.env.LOCALAPPDATA || "", "Microsoft", "Edge"),
      join(process.env.PROGRAMFILES || "", "Microsoft", "Edge"),
      join(process.env["PROGRAMFILES(X86)"] || "", "Microsoft", "Edge"),
    ],
    arc: [], // Arc not available on Windows yet
    opera: [
      join(process.env.APPDATA || "", "Opera Software", "Opera Stable"),
      join(process.env.PROGRAMFILES || "", "Opera"),
      join(process.env["PROGRAMFILES(X86)"] || "", "Opera"),
    ],
    "opera-gx": [
      join(process.env.APPDATA || "", "Opera Software", "Opera GX Stable"),
      join(process.env.PROGRAMFILES || "", "Opera GX"),
      join(process.env["PROGRAMFILES(X86)"] || "", "Opera GX"),
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
    opera: [`${homedir()}/.config/opera`, "/usr/bin/opera", "/usr/lib/opera"],
    "opera-gx": [`${homedir()}/.config/opera-gx`, "/usr/bin/opera-gx"],
  },
};

/**
 * Checks if a browser is installed by looking for its paths
 * @param browser - The browser type to check
 * @returns True if the browser is installed
 */
function checkBrowserInstalled(browser: BrowserType): boolean {
  const platform = getPlatform() as keyof typeof BROWSER_PATHS;
  const paths = BROWSER_PATHS[platform]?.[browser] || [];

  for (const path of paths) {
    if (path && existsSync(path)) {
      logger.debug("Found browser installation", { browser, path });
      return true;
    }
  }

  return false;
}

/**
 * Gets the version of an installed browser
 * @param browser - The browser type
 * @returns The browser version or undefined
 */
function getBrowserVersion(browser: BrowserType): string | undefined {
  try {
    let command: string | undefined;

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
        opera:
          "/Applications/Opera.app/Contents/MacOS/Opera --version 2>/dev/null",
        "opera-gx":
          "/Applications/Opera\\ GX.app/Contents/MacOS/Opera\\ GX --version 2>/dev/null",
      };
      command = versionCommands[browser];
    } else if (isLinux()) {
      const versionCommands: Partial<Record<BrowserType, string>> = {
        chrome:
          "google-chrome --version 2>/dev/null || google-chrome-stable --version 2>/dev/null",
        firefox: "firefox --version 2>/dev/null",
        edge: "microsoft-edge --version 2>/dev/null",
        opera: "opera --version 2>/dev/null",
        "opera-gx": "opera-gx --version 2>/dev/null",
      };
      command = versionCommands[browser];
    } else if (isWindows()) {
      // Windows version detection is more complex, skip for now
      return undefined;
    }

    if (command) {
      const version = execSync(command, { encoding: "utf8" }).trim();
      logger.debug("Got browser version", { browser, version });
      return version;
    }
  } catch (error) {
    logger.debug("Failed to get browser version", { browser, error });
  }

  return undefined;
}

/**
 * Finds profile directories for a browser
 * @param browser - The browser type
 * @returns Array of profile paths
 */
function findBrowserProfiles(browser: BrowserType): string[] {
  const profiles: string[] = [];
  const home = homedir();

  try {
    if (browser === "chrome" || browser === "edge") {
      const basePath = isMacOS()
        ? join(
            home,
            "Library",
            "Application Support",
            browser === "chrome" ? "Google/Chrome" : "Microsoft Edge",
          )
        : isWindows()
          ? join(
              process.env.LOCALAPPDATA || "",
              browser === "chrome" ? "Google/Chrome" : "Microsoft/Edge",
            )
          : join(
              home,
              ".config",
              browser === "chrome" ? "google-chrome" : "microsoft-edge",
            );

      if (existsSync(basePath)) {
        // Look for Default profile
        const defaultProfile = join(basePath, "Default");
        if (existsSync(defaultProfile)) {
          profiles.push(defaultProfile);
        }

        // Look for numbered profiles (Profile 1, Profile 2, etc.)
        for (let i = 1; i <= 10; i++) {
          const profilePath = join(basePath, `Profile ${i}`);
          if (existsSync(profilePath)) {
            profiles.push(profilePath);
          }
        }
      }
    } else if (browser === "firefox") {
      const basePath = isMacOS()
        ? join(home, "Library", "Application Support", "Firefox", "Profiles")
        : isWindows()
          ? join(process.env.APPDATA || "", "Mozilla", "Firefox", "Profiles")
          : join(home, ".mozilla", "firefox");

      if (existsSync(basePath)) {
        const { readdirSync } = require("node:fs");
        const profileDirs = readdirSync(basePath);
        for (const dir of profileDirs) {
          const profilePath = join(basePath, dir);
          // Firefox profiles usually have .default or .default-release suffix
          if (dir.includes("default")) {
            profiles.push(profilePath);
          }
        }
      }
    }
  } catch (error) {
    logger.debug("Failed to find browser profiles", { browser, error });
  }

  return profiles;
}

/**
 * Detects all available browsers on the current system
 * @returns Array of available browser information
 */
export async function detectAvailableBrowsers(): Promise<AvailableBrowser[]> {
  const browsers: BrowserType[] = [
    "chrome",
    "firefox",
    "safari",
    "edge",
    "arc",
    "opera",
    "opera-gx",
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

      const version = getBrowserVersion(browser);
      if (version) {
        info.version = version;
      }

      logger.info("Found available browser", {
        browser: info.name,
        version: info.version,
        profiles: info.profilePaths?.length || 0,
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
 * Gets display name for a browser type
 * @param browser - The browser type
 * @returns Human-readable browser name
 */
function getBrowserDisplayName(browser: BrowserType): string {
  const names: Record<BrowserType, string> = {
    chrome: "Google Chrome",
    firefox: "Mozilla Firefox",
    safari: "Safari",
    edge: "Microsoft Edge",
    arc: "Arc",
    opera: "Opera",
    "opera-gx": "Opera GX",
  };
  return names[browser];
}

/**
 * Checks if a specific browser is available
 * @param browser - The browser type to check
 * @returns True if the browser is available
 */
export async function isBrowserAvailable(
  browser: BrowserType,
): Promise<boolean> {
  return checkBrowserInstalled(browser);
}

/**
 * Gets detailed information about a specific browser
 * @param browser - The browser type
 * @returns Browser information or undefined if not available
 */
export async function getBrowserInfo(
  browser: BrowserType,
): Promise<AvailableBrowser | undefined> {
  const installed = checkBrowserInstalled(browser);

  if (!installed) {
    return undefined;
  }

  const result: AvailableBrowser = {
    type: browser,
    name: getBrowserDisplayName(browser),
    installed: true,
    profilePaths: findBrowserProfiles(browser),
  };

  const version = getBrowserVersion(browser);
  if (version) {
    result.version = version;
  }

  return result;
}

/**
 * Gets only the installed browsers
 * @returns Array of installed browsers
 */
export async function getInstalledBrowsers(): Promise<AvailableBrowser[]> {
  const all = await detectAvailableBrowsers();
  return all.filter((b) => b.installed);
}

/**
 * Suggests the best browser to use based on availability
 * @returns The recommended browser type or undefined
 */
export async function suggestBrowser(): Promise<BrowserType | undefined> {
  const installed = await getInstalledBrowsers();

  if (installed.length === 0) {
    logger.warn("No browsers found on system");
    return undefined;
  }

  // Prefer browsers in this order
  const preferenceOrder: BrowserType[] = [
    "chrome",
    "edge",
    "firefox",
    "safari",
    "arc",
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

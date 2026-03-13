import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

import fg from "fast-glob";

import {
  type ChromiumBrowser,
  getChromiumBrowserPath,
} from "../chrome/ChromiumBrowsers";

import { BaseChromiumCookieQueryStrategy } from "./BaseChromiumCookieQueryStrategy";

/**
 * Profile information from a Chromium browser's Local State file
 */
interface ChromiumProfileInfo {
  name?: string;
  user_name?: string;
  [key: string]: unknown;
}

/**
 * Strategy for querying cookies from Chromium-based browsers (Chrome, Brave, Edge, etc.)
 * This class extends the BaseChromiumCookieQueryStrategy with browser-specific path discovery
 * and optional profile-name filtering.
 * @example
 * ```typescript
 * const strategy = new ChromiumCookieQueryStrategy('brave');
 * const cookies = await strategy.queryCookies('session', 'example.com');
 *
 * // With profile filtering
 * const strategy = new ChromiumCookieQueryStrategy('chrome', 'Work');
 * const cookies = await strategy.queryCookies('session', 'example.com');
 * ```
 */
export class ChromiumCookieQueryStrategy extends BaseChromiumCookieQueryStrategy {
  private readonly browser: ChromiumBrowser;
  private readonly profileName?: string;

  /**
   * Creates a new instance of ChromiumCookieQueryStrategy
   * @param browser - The Chromium-based browser to query (chrome, brave, edge, etc.)
   * @param profileName - Optional specific profile name to target
   */
  public constructor(
    browser: ChromiumBrowser = "chrome",
    profileName?: string,
  ) {
    const browserName = browser.charAt(0).toUpperCase() + browser.slice(1);
    super(`${browserName}CookieQueryStrategy`, browserName, browser);
    this.browser = browser;
    if (profileName !== undefined) {
      this.profileName = profileName;
    }
  }

  /**
   * Get browser-specific cookie file paths, with optional profile filtering
   * @param store - Optional specific store path
   * @returns Array of cookie file paths
   */
  protected getCookieFilePaths(store?: string): string[] {
    if (store !== undefined && store !== "") {
      return [store];
    }

    let paths: string[];

    try {
      const browserPath = getChromiumBrowserPath(this.browser);
      paths = fg.sync("./**/Cookies", {
        cwd: browserPath,
        absolute: true,
      });

      this.logger.debug(
        `Found ${paths.length} cookie files for ${this.browser}`,
      );
    } catch (error) {
      this.logger.warn(`Failed to find ${this.browser} cookie files`, {
        error: this.getErrorMessage(error),
      });
      return [];
    }

    // If no profile filter, return all paths
    if (!this.profileName) {
      return paths;
    }

    // Filter by profile name
    return this.filterByProfileName(paths);
  }

  /**
   * Filter cookie file paths to only include those matching the target profile name.
   * Reads the browser's Local State file to map profile display names to directories.
   * @param paths - Array of cookie file paths to filter
   * @returns Filtered array of cookie file paths
   */
  private filterByProfileName(paths: string[]): string[] {
    try {
      if (paths.length === 0) {
        this.logger.warn(`No ${this.browser} cookie files found`);
        return [];
      }

      const firstPath = paths[0];
      if (!firstPath) {
        return [];
      }
      const dataDir = dirname(dirname(firstPath));
      const localStatePath = join(dataDir, "Local State");

      if (!existsSync(localStatePath)) {
        return paths;
      }

      const localState = JSON.parse(readFileSync(localStatePath, "utf8"));
      const profileCache = localState.profile?.info_cache || {};

      // Find the directory for the given profile name
      let targetDir: string | undefined;

      for (const [dir, info] of Object.entries(profileCache)) {
        const profile = info as ChromiumProfileInfo;
        if (profile.name?.toLowerCase() === this.profileName?.toLowerCase()) {
          targetDir = dir;
          break;
        }
      }

      // Also check if user passed the directory name directly (e.g., "Default" or "Profile 2")
      if (!targetDir) {
        for (const dir of Object.keys(profileCache)) {
          if (dir.toLowerCase() === this.profileName?.toLowerCase()) {
            targetDir = dir;
            break;
          }
        }
      }

      if (targetDir) {
        const filtered = paths.filter((cookiePath) => {
          const dir = dirname(cookiePath);
          return dir.endsWith(targetDir);
        });

        if (filtered.length === 0) {
          this.logger.warn(
            `No cookie files found for profile: ${this.profileName} (directory: ${targetDir})`,
          );
        } else {
          this.logger.debug(
            `Found ${filtered.length} cookie file(s) for profile: ${this.profileName}`,
          );
        }

        return filtered;
      }

      const availableNames = Object.entries(profileCache)
        .map(([, info]) => (info as ChromiumProfileInfo).name)
        .filter(Boolean);
      const available =
        availableNames.length > 0
          ? ` Available profiles: ${availableNames.join(", ")}`
          : "";
      this.logger.warn(
        `No ${this.browser} profile matching "${this.profileName}" found.${available}`,
      );

      // Return empty array to avoid querying wrong profile
      return [];
    } catch (error) {
      this.logger.warn(`Failed to read ${this.browser} profile info: ${error}`);
      return paths;
    }
  }
}

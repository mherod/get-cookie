import { join } from "node:path";

import { CHROMIUM_DATA_DIRS } from "../BrowserAvailability";
import { fileExists, readTextFile } from "../runtime/FileSystemAdapter";

/**
 * Information about a discovered Chromium browser profile.
 */
export interface ChromiumProfile {
  /**
   * Display name of the profile (e.g. "Default", "Person 1", "Work")
   */
  name: string;

  /**
   * Profile directory name inside the User Data folder (e.g. "Default", "Profile 1")
   */
  directory: string;

  /**
   * Absolute path to the profile directory
   */
  path: string;

  /**
   * Associated email or account user name if available (e.g. "user@example.com")
   */
  userName?: string;

  /**
   * Browser name/type (e.g. "chrome", "edge", "brave")
   */
  browser: string;
}

interface LocalStateProfileInfo {
  name?: string;
  user_name?: string;
  [key: string]: unknown;
}

/**
 * Helper to discover profiles in a specific User Data directory for a browser name.
 * Reads the `Local State` JSON file's `profile.info_cache` object.
 * @param browserName - Name of the browser (e.g. "chrome", "edge")
 * @param dataDir - Absolute path to the browser's User Data directory
 * @returns Array of discovered ChromiumProfile entries
 */
function discoverProfilesInDir(
  browserName: string,
  dataDir: string,
): ChromiumProfile[] {
  const localStatePath = join(dataDir, "Local State");
  if (!fileExists(localStatePath)) {
    return [];
  }

  try {
    const content = readTextFile(localStatePath);
    const localState = JSON.parse(content) as {
      profile?: {
        info_cache?: Record<string, LocalStateProfileInfo>;
      };
    };

    const profileCache = localState.profile?.info_cache ?? {};
    const profiles: ChromiumProfile[] = [];

    for (const [dir, info] of Object.entries(profileCache)) {
      if (!info || typeof info !== "object") {
        continue;
      }
      const profileName = info.name || dir;
      profiles.push({
        name: profileName,
        directory: dir,
        path: join(dataDir, dir),
        ...(info.user_name && { userName: info.user_name }),
        browser: browserName,
      });
    }

    return profiles;
  } catch {
    return [];
  }
}

/**
 * Enumerates installed profiles for a Chromium-based browser (or all Chromium-based browsers).
 * @param targetBrowser - Optional browser name (e.g. "chrome", "edge", "brave") or path to User Data dir.
 * If omitted, enumerates profiles across all supported Chromium browsers on the current OS.
 * @returns Array of discovered ChromiumProfile entries
 */
export function getChromiumProfiles(targetBrowser?: string): ChromiumProfile[] {
  const platform = process.platform;
  const platformDirs = CHROMIUM_DATA_DIRS[platform] ?? {};

  if (targetBrowser) {
    const browserLower = targetBrowser.toLowerCase();
    const dataDir = platformDirs[browserLower];
    if (dataDir) {
      return discoverProfilesInDir(targetBrowser, dataDir);
    }

    if (fileExists(join(targetBrowser, "Local State"))) {
      return discoverProfilesInDir("chromium", targetBrowser);
    }

    return [];
  }

  const allProfiles: ChromiumProfile[] = [];
  for (const [browserName, dataDir] of Object.entries(platformDirs)) {
    if (dataDir) {
      const profiles = discoverProfilesInDir(browserName, dataDir);
      allProfiles.push(...profiles);
    }
  }

  return allProfiles;
}

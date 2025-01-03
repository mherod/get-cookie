// External imports
import { readFileSync } from "fs";
import { join } from "path";

import { sync } from "glob";

// Internal imports
import logger from "@utils/logger";

import { chromeApplicationSupport } from "./chrome/ChromeApplicationSupport";

const consola = logger.withTag("listChromeProfiles");

/**
 * Lists all Chrome profile paths that contain cookie files
 * @returns An array of paths to Chrome cookie files
 * @throws {Error} If Chrome's application support directory cannot be accessed
 */
export function listChromeProfilePaths(): string[] {
  const files: string[] = sync(`./**/Cookies`, {
    cwd: chromeApplicationSupport,
    absolute: true,
  });

  consola.debug("Found cookie files:", files);
  return files;
}

interface ChromeLocalState {
  profile: {
    info_cache: Record<string, ChromeProfileInfo>;
  };
}

interface ChromeProfileInfo {
  /** The name of the profile */
  name: string;
  /** Whether the profile is currently active */
  active_time: number;
  /** The ID of the account associated with the profile */
  account_id: string;
  /** The capabilities associated with the account */
  accountcapabilities: Record<string, unknown>;
  /** The email address associated with the account */
  email: string;
  /** The full name of the account holder */
  full_name: string;
  /** Whether the profile is currently signed in */
  is_using_default_avatar: boolean;
  /** Whether the profile is currently signed in */
  is_using_default_name: boolean;
  /** The path to the profile's avatar image */
  last_downloaded_gaia_picture_url_with_size: string;
  /** The path to the profile's avatar image */
  local_auth_credentials: string;
  /** The path to the profile's avatar image */
  shortcut_name: string;
  /** The path to the profile's avatar image */
  user_name: string;
}

/**
 * Lists all Chrome profiles
 * @returns An array of Chrome profile information objects
 * @throws {Error} If Chrome's application support directory cannot be accessed
 */
export function listChromeProfiles(): ChromeProfileInfo[] {
  try {
    const localStatePath = join(chromeApplicationSupport, "Local State");
    const localState = JSON.parse(readFileSync(localStatePath, "utf8")) as ChromeLocalState;
    return Object.values(localState.profile.info_cache);
  } catch (error) {
    if (error instanceof Error) {
      consola.error("Failed to read Chrome profiles:", error.message);
    } else {
      consola.error("Failed to read Chrome profiles: Unknown error");
    }
    return [];
  }
}

// External imports
import { readFileSync } from "node:fs";
import { join } from "node:path";

import fg from "fast-glob";

// Internal imports
import { createTaggedLogger } from "../../utils/logHelpers";

import { chromeApplicationSupport } from "./chrome/ChromeApplicationSupport";

const logger = createTaggedLogger("listChromeProfiles");

/**
 * Lists all Chrome profile paths that contain cookie files
 * @internal
 * @returns An array of absolute paths to Chrome cookie files
 * @throws {Error} If Chrome's application support directory cannot be accessed
 * @example
 * ```typescript
 * // Get all Chrome cookie file paths
 * const cookiePaths = listChromeProfilePaths();
 * // Returns: [
 * //   '/Users/name/Library/Application Support/Chrome/Profile 1/Cookies',
 * //   '/Users/name/Library/Application Support/Chrome/Profile 2/Cookies'
 * // ]
 *
 * // Handle errors
 * try {
 *   const paths = listChromeProfilePaths();
 * } catch (error) {
 *   logger.error('Failed to access Chrome profiles', { error });
 * }
 * ```
 */
export function listChromeProfilePaths(): string[] {
  const files: string[] = fg.sync("./**/Cookies", {
    cwd: chromeApplicationSupport,
    absolute: true,
  });

  logger.debug("Found cookie files:", files);
  return files;
}

/**
 * Chrome Local State file structure
 * @internal
 */
interface ChromeLocalState {
  profile: {
    info_cache: Record<string, ChromeProfileInfo>;
  };
}

/**
 * Chrome profile information structure
 * @property {string} name - The name of the profile
 * @property {number} active_time - Unix timestamp of last profile activity
 * @property {string} account_id - Unique identifier for the Chrome profile
 * @property {Record<string, unknown>} accountcapabilities - Account feature flags
 * @property {string} email - User's email address
 * @property {string} full_name - User's full name
 * @property {boolean} is_using_default_avatar - Whether using default profile picture
 * @property {boolean} is_using_default_name - Whether using default profile name
 * @property {string} last_downloaded_gaia_picture_url_with_size - Profile picture URL
 * @property {string} local_auth_credentials - Authentication credentials
 * @property {string} shortcut_name - Profile shortcut name
 * @property {string} user_name - Username associated with profile
 */
interface ChromeProfileInfo {
  /** The name of the profile */
  name: string;
  /** Unix timestamp of last profile activity */
  active_time: number;
  /** Unique identifier for the Chrome profile */
  account_id: string;
  /** Account feature flags */
  accountcapabilities: Record<string, unknown>;
  /** User's email address */
  email: string;
  /** User's full name */
  full_name: string;
  /** Whether using default profile picture */
  is_using_default_avatar: boolean;
  /** Whether using default profile name */
  is_using_default_name: boolean;
  /** Profile picture URL */
  last_downloaded_gaia_picture_url_with_size: string;
  /** Authentication credentials */
  local_auth_credentials: string;
  /** Profile shortcut name */
  shortcut_name: string;
  /** Username associated with profile */
  user_name: string;
}

/**
 * Lists all Chrome profiles and their associated information
 * @internal
 * @returns An array of Chrome profile information objects. Returns empty array if profiles cannot be read
 * @throws {Error} If Chrome's application support directory cannot be accessed
 * @example
 * ```typescript
 * // Get all Chrome profiles
 * const profiles = listChromeProfiles();
 * // Returns: [
 * //   {
 * //     name: "Default",
 * //     email: "user@example.com",
 * //     full_name: "John Doe",
 * //     ...
 * //   },
 * //   ...
 * // ]
 *
 * // Handle empty or error case
 * const profiles = listChromeProfiles();
 * if (profiles.length === 0) {
 *   logger.warn('No Chrome profiles found');
 * }
 * ```
 */
export function listChromeProfiles(): ChromeProfileInfo[] {
  try {
    const localStatePath = join(chromeApplicationSupport, "Local State");
    const localState = JSON.parse(
      readFileSync(localStatePath, "utf8"),
    ) as ChromeLocalState;
    return Object.values(localState.profile.info_cache);
  } catch (error) {
    logger.debug("Failed to access Chrome profiles", { error });
    return [];
  }
}

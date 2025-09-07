import { BaseChromiumCookieQueryStrategy } from "../chromium/BaseChromiumCookieQueryStrategy";
import { listChromeProfilePaths } from "../listChromeProfiles";
import { dirname } from "node:path";

/**
 * Interface representing Chrome profile information from Local State
 */
interface ChromeProfileInfo {
  name?: string;
  user_name?: string;
  [key: string]: unknown;
}

/**
 * Strategy for querying cookies from Chrome browser.
 * This class extends the BaseChromiumCookieQueryStrategy with Chrome-specific logic.
 * @example
 * ```typescript
 * const strategy = new ChromeCookieQueryStrategy();
 * const cookies = await strategy.queryCookies('session', 'example.com');
 * ```
 */
export class ChromeCookieQueryStrategy extends BaseChromiumCookieQueryStrategy {
  private profileName?: string;

  /**
   * Creates a new instance of ChromeCookieQueryStrategy
   * @param profileName - Optional specific profile name to target
   */
  public constructor(profileName?: string) {
    super("ChromeCookieQueryStrategy", "Chrome");
    if (profileName !== undefined) {
      this.profileName = profileName;
    }
  }

  /**
   * Get Chrome-specific cookie file paths
   * @param store - Optional specific store path
   * @returns Array of cookie file paths
   */
  protected getCookieFilePaths(store?: string): string[] {
    if (store !== undefined && store !== "") {
      return [store];
    }

    let paths = listChromeProfilePaths();

    // Filter by profile name if specified
    if (this.profileName) {
      // Read Chrome's Local State to map profile names to directories
      try {
        const fs = require("node:fs");
        const path = require("node:path");

        // Ensure we have at least one path to determine the Chrome data directory
        if (paths.length === 0) {
          this.logger.warn("No Chrome cookie files found");
          return [];
        }

        const firstPath = paths[0];
        if (!firstPath) {
          return [];
        }
        const chromeDataDir = dirname(dirname(firstPath)); // Get Chrome data directory
        const localStatePath = path.join(chromeDataDir, "Local State");

        if (fs.existsSync(localStatePath)) {
          const localState = JSON.parse(
            fs.readFileSync(localStatePath, "utf8"),
          );
          const profileCache = localState.profile?.info_cache || {};

          // Find the directory for the given profile name
          let targetDir: string | undefined;

          for (const [dir, info] of Object.entries(profileCache)) {
            const profile = info as ChromeProfileInfo;
            if (
              profile.name?.toLowerCase() === this.profileName.toLowerCase()
            ) {
              targetDir = dir;
              break;
            }
          }

          // Also check if user passed the directory name directly (e.g., "Default" or "Profile 2")
          if (!targetDir) {
            for (const dir of Object.keys(profileCache)) {
              if (dir.toLowerCase() === this.profileName.toLowerCase()) {
                targetDir = dir;
                break;
              }
            }
          }

          if (targetDir) {
            // Filter paths to only include the target directory
            paths = paths.filter((cookiePath) => {
              const dir = dirname(cookiePath);
              return dir.endsWith(targetDir);
            });

            if (paths.length === 0) {
              this.logger.warn(
                `No cookie files found for profile: ${this.profileName} (directory: ${targetDir})`,
              );
            } else {
              this.logger.debug(
                `Found ${paths.length} cookie file(s) for profile: ${this.profileName}`,
              );
            }
          } else {
            this.logger.debug("Profile not found in Chrome Local State", {
              requestedProfile: this.profileName,
              availableProfiles: Object.entries(profileCache).map(
                ([dir, info]) => ({
                  directory: dir,
                  name: (info as ChromeProfileInfo).name,
                }),
              ),
            });

            // Return empty array to avoid querying wrong profile
            return [];
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to read Chrome profile info: ${error}`);
      }
    }

    return Array.isArray(paths) ? paths : [paths];
  }
}

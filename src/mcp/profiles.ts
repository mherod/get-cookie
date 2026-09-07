import { join } from "node:path";

import { FIREFOX_DATA_DIRS } from "../core/browsers/BrowserAvailability";
import { getChromiumProfiles } from "../core/browsers/chromium/getChromiumProfiles";
import { parseFirefoxProfilesIni } from "../core/browsers/firefox/FirefoxCookieQueryStrategy";
import { fileExists } from "../core/browsers/runtime/FileSystemAdapter";

/**
 *
 * @param browser
 */
export function listProfiles(browser?: string) {
  const profiles: { browser: string; name: string; directory: string }[] = [];
  if (!browser || (browser !== "firefox" && browser !== "safari")) {
    profiles.push(
      ...getChromiumProfiles(browser).map((profile) => ({
        browser: profile.browser,
        name: profile.name,
        directory: profile.directory,
      })),
    );
  }
  if (!browser || browser === "firefox") {
    for (const dir of FIREFOX_DATA_DIRS[process.platform] ?? []) {
      const ini = join(dir, "profiles.ini");
      if (!fileExists(ini)) {
        continue;
      }
      profiles.push(
        ...parseFirefoxProfilesIni(ini).map((profile) => ({
          browser: "firefox",
          name: profile.name,
          directory: profile.path,
        })),
      );
    }
  }
  return {
    profiles,
    note: "Safari uses its default cookie store and does not support named profiles.",
  };
}

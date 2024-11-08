import { sync } from "fast-glob";
import { chromeApplicationSupport } from "./browsers";
import { dirname } from "path";
import { readFile } from "fs/promises";
import destr from "destr";

export async function listChromeProfilePaths(): Promise<string[]> {
  const files: string[] = sync(`./**/Cookies`, {
    cwd: chromeApplicationSupport,
    absolute: true,
    onlyFiles: true,
    deep: 2,
  });

  const directories: string[] = [];
  for (const file of files) {
    directories.push(dirname(file));
  }

  return directories;
}

export async function listChromeProfiles(): Promise<ChromeProfile[]> {
  const paths: string[] = await listChromeProfilePaths();
  const profiles: ChromeProfile[] = [];

  for (const path of paths) {
    const content: string = await readFile(`${path}/Preferences`, "utf-8");
    const profile: ChromeProfile = await destr(content);
    profiles.push(profile);
  }

  return profiles;
}

export type ChromeProfileAccountInfo = {
  account_id: string;
  accountcapabilities: any;
  email: string;
  full_name: string;
  gaia: string;
  given_name: string;
  hd: string;
  is_supervised_child: number;
  is_under_advanced_protection: boolean;
  last_downloaded_image_url_with_size: string;
  locale: string;
  picture_url: string;
};

export type ChromeProfile = {
  account_info: ChromeProfileAccountInfo[];
};

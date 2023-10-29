import { sync } from "fast-glob";
import { chromeApplicationSupport } from "./browsers/chrome/ChromeApplicationSupport";
import { dirname } from "path";
import { readFile } from "fs/promises";
import { flatMapAsync } from "./util/flatMapAsync";
import destr from "destr";

export async function listChromeProfilePaths(): Promise<string[]> {
  return sync(`./**/Cookies`, {
    cwd: chromeApplicationSupport,
    absolute: true,
    onlyFiles: true,
    deep: 2,
  }).map((f) => {
    // parent dir
    return dirname(f);
  });
}

export async function listChromeProfiles(): Promise<ChromeProfile[]> {
  const paths = await listChromeProfilePaths();
  return await flatMapAsync(paths, async (p) => {
    const content = await readFile(`${p}/Preferences`, "utf-8");
    return await destr(content);
  });
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

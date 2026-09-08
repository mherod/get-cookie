import { FIREFOX_DATA_DIRS } from "../../core/browsers/BrowserAvailability";
import { parseFirefoxProfilesIni } from "../../core/browsers/firefox/FirefoxCookieQueryStrategy";
import { fileExists } from "../../core/browsers/runtime/FileSystemAdapter";
import { listProfiles } from "../profiles";

jest.mock("../../core/browsers/BrowserAvailability", () => ({
  FIREFOX_DATA_DIRS: { [process.platform]: ["/firefox", "/firefox-esr"] },
}));
jest.mock("../../core/browsers/firefox/FirefoxCookieQueryStrategy");
jest.mock("../../core/browsers/runtime/FileSystemAdapter");

it("resolves relative Firefox directories against each installation root", () => {
  jest.mocked(fileExists).mockReturnValue(true);
  jest.mocked(parseFirefoxProfilesIni).mockReturnValue([
    { name: "Work", path: "Profiles/default", isRelative: true },
    { name: "External", path: resolve("/external/profile"), isRelative: false },
  ]);
  const { profiles } = listProfiles("firefox");
  expect(profiles.map((profile) => profile.profileDirectory)).toEqual(
    FIREFOX_DATA_DIRS[process.platform]!.flatMap((root) => [
      resolve(root, "Profiles/default"),
      resolve("/external/profile"),
    ]),
  );
});
import { resolve } from "node:path";

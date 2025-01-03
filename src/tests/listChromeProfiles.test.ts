import {
  listChromeProfiles,
  listChromeProfilePaths,
} from "../core/browsers/listChromeProfiles";

describe("Chrome Profile Tests", () => {
  it("should list Chrome profiles and cookie paths", () => {
    // Get all Chrome profiles
    const profiles = listChromeProfiles();
    console.log("\nChrome Profiles Found:");
    console.log(JSON.stringify(profiles, null, 2));

    // Get all cookie file paths
    const cookiePaths = listChromeProfilePaths();
    console.log("\nCookie File Paths Found:");
    console.log(JSON.stringify(cookiePaths, null, 2));
  });
});

import {
  listChromeProfiles,
  listChromeProfilePaths,
} from "../core/browsers/listChromeProfiles";
import { createTaggedLogger } from "../utils/logHelpers";

const logger = createTaggedLogger("listChromeProfiles.test");

describe("Chrome Profile Tests", () => {
  it("should list Chrome profiles and cookie paths", () => {
    // Get all Chrome profiles
    const profiles = listChromeProfiles();
    logger.info("\nChrome Profiles Found:");
    logger.info(JSON.stringify(profiles, null, 2));

    // Get all cookie file paths
    const cookiePaths = listChromeProfilePaths();
    logger.info("\nCookie File Paths Found:");
    logger.info(JSON.stringify(cookiePaths, null, 2));
  });
});

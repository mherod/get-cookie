import { join } from "path";

import { SafariCookieQueryStrategy } from "../src/core/browsers/safari/SafariCookieQueryStrategy";
import logger from "../src/utils/logger";

async function main(): Promise<void> {
  // Path to our test binarycookies file
  const cookieStorePath = join(
    __dirname,
    "CookieCreator",
    "Cookies.binarycookies",
  );
  const strategy = new SafariCookieQueryStrategy();

  try {
    // Test with specific cookie name
    logger.log("\nTesting with specific cookie name:");
    const specificCookies = await strategy.queryCookies(
      "session",
      "%",
      cookieStorePath,
    );
    logger.log("Specific cookie results:", specificCookies);

    // Test with wildcard to get all cookies
    logger.log("\nTesting with wildcard to get all cookies:");
    const allCookies = await strategy.queryCookies("%", "%", cookieStorePath);
    logger.log("All cookies results:", allCookies);

    // Test with specific domain
    logger.log("\nTesting with specific domain:");
    const domainCookies = await strategy.queryCookies(
      "%",
      "example.com",
      cookieStorePath,
    );
    logger.log("Domain-specific results:", domainCookies);
  } catch (error) {
    if (error instanceof Error) {
      logger.error("Error testing binarycookies:", error.message);
    } else {
      logger.error("Unknown error occurred while testing binarycookies");
    }
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error("Fatal error:", error);
  process.exit(1);
});

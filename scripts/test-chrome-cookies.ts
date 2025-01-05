import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { ChromeCookieQueryStrategy } from "../src/core/browsers/chrome/ChromeCookieQueryStrategy";
import logger from "../src/utils/logger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runTests(
  strategy: ChromeCookieQueryStrategy,
  cookieStorePath: string,
): Promise<void> {
  // Test with specific cookie name (color_mode)
  logger.log("\nTesting with specific cookie name (color_mode):");
  const colorModeCookies = await strategy.queryCookies(
    "color_mode",
    "%",
    cookieStorePath,
  );
  logger.log("Color mode cookie results:", colorModeCookies);

  // Test with specific domain (github.com)
  logger.log("\nTesting with specific domain (github.com):");
  const githubCookies = await strategy.queryCookies(
    "%",
    "github.com",
    cookieStorePath,
  );
  logger.log("GitHub cookies results:", githubCookies);

  // Test with specific name and domain (Amazon i18n prefs)
  logger.log("\nTesting with specific name and domain (Amazon i18n):");
  const amazonCookies = await strategy.queryCookies(
    "i18n-prefs",
    "amazon.co.uk",
    cookieStorePath,
  );
  logger.log("Amazon i18n cookie results:", amazonCookies);

  // Test with wildcard to get all cookies
  logger.log("\nTesting with wildcard to get all cookies:");
  const allCookies = await strategy.queryCookies("%", "%", cookieStorePath);
  logger.log("All cookies results:", allCookies);
}

async function main(): Promise<void> {
  // Path to our test Chrome cookies SQLite file
  const cookieStorePath = join(
    __dirname,
    "..",
    "test",
    "fixtures",
    "chrome",
    "chrome_cookies.db",
  );
  const strategy = new ChromeCookieQueryStrategy();

  try {
    await runTests(strategy, cookieStorePath);
  } catch (error) {
    if (error instanceof Error) {
      logger.error("Error testing Chrome cookies:", error.message);
    } else {
      logger.error("Unknown error occurred while testing Chrome cookies");
    }
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error("Fatal error:", error);
  process.exit(1);
});

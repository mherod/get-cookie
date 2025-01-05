import { ChromeCookieQueryStrategy } from "../src/core/browsers/chrome/ChromeCookieQueryStrategy";
import {
  formatCookie,
  createCookieSummary,
} from "../src/core/formatting/cookieFormatter";
import { createTaggedLogger } from "../src/utils/logHelpers";

const logger = createTaggedLogger("read-github-cookies");

async function main(): Promise<void> {
  try {
    logger.info("Searching for GitHub cookies...");

    const strategy = new ChromeCookieQueryStrategy();
    const cookies = await strategy.queryCookies("%", "github.com");

    // Print all cookie details
    logger.info("\nFound cookies:\n");
    cookies.forEach((cookie) => logger.info(formatCookie(cookie)));

    // Print summary
    logger.success(createCookieSummary(cookies));
  } catch (error) {
    if (error instanceof Error) {
      logger.error("Failed to read GitHub cookies", { error });
    } else {
      logger.error("Failed to read GitHub cookies", { error: String(error) });
    }
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  logger.error("Unhandled error", { error });
  process.exit(1);
});

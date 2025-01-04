import { ChromeCookieQueryStrategy } from "../src/core/browsers/chrome/ChromeCookieQueryStrategy";
import type { ExportedCookie } from "../src/types/schemas";
import { createTaggedLogger } from "../src/utils/logHelpers";

const logger = createTaggedLogger("dump-github-chrome-cookies");

async function main(): Promise<void> {
  try {
    const strategy = new ChromeCookieQueryStrategy();

    // Query all cookies from github.com domain
    const cookies = await strategy.queryCookies("%", "github.com");

    if (cookies.length === 0) {
      logger.warn("No GitHub cookies found in Chrome");
      return;
    }

    logger.info(`Found ${cookies.length} GitHub cookies:`);

    // Print each cookie in a readable format
    cookies.forEach((cookie: ExportedCookie) => {
      logger.log("\n-------------------");
      logger.log(`Name: ${cookie.name}`);
      logger.log(`Domain: ${cookie.domain}`);
      logger.log(`Value: ${cookie.value}`);
      logger.log(`Expiry: ${String(cookie.expiry)}`);
      logger.log(`Decrypted: ${cookie.meta?.decrypted ?? false}`);
      logger.log(`Profile: ${cookie.meta?.file ?? "Unknown"}`);
    });
  } catch (error) {
    if (error instanceof Error) {
      logger.error("Failed to dump GitHub cookies", { error });
    } else {
      logger.error("Failed to dump GitHub cookies", { error: String(error) });
    }
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  logger.error("Unhandled error", { error });
  process.exit(1);
});

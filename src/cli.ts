#!/usr/bin/env bun

import { argv, parsedArgs } from "./argv";
import { fetchWithCookies } from "./fetchWithCookies";
import { unpackHeaders } from "./unpackHeaders";
import CookieSpec from "./CookieSpec";
import { cookieSpecsFromUrl } from "./cookieSpecsFromUrl";
import { logger } from '@/utils/logger';
import { cliQueryCookies } from "./cliQueryCookies";

async function main() {
  logger.setVerbose(Boolean(parsedArgs.verbose));

  const fetchUrl = parsedArgs.fetch;
  if (fetchUrl) {
    let url: URL;
    try {
      url = new URL(fetchUrl);
    } catch (e) {
      logger.error("Invalid URL", fetchUrl);
      return;
    }

    logger.start("Fetching", url.href);
    const headers = unpackHeaders(parsedArgs.H);

    const handleResponse = async (res: Response) => {
      if (parsedArgs.dumpResponseHeaders) {
        for (const [key, value] of Object.entries(res.headers)) {
          logger.log(`${key}: ${value}`);
        }
      }
      if (parsedArgs.dumpResponseBody) {
        const responseBody = await res.text();
        logger.log(responseBody);
      }
    };

    try {
      const res = await fetchWithCookies(url, { headers });
      logger.debug("Response", res);
      await handleResponse(res);
    } catch (error) {
      logger.error(error);
    }
    return;
  }

  const cookieSpecs: CookieSpec[] = [];
  if (parsedArgs.url) {
    cookieSpecs.push(...cookieSpecsFromUrl(parsedArgs.url));
  } else {
    cookieSpecs.push({
      name: parsedArgs.name || argv[0] || "%",
      domain: parsedArgs.domain || argv[1] || "%",
    });
  }

  if (parsedArgs.verbose) {
    logger.log("cookieSpecs", cookieSpecs);
  }

  try {
    await cliQueryCookies(cookieSpecs);
  } catch (error) {
    logger.error(error);
  }
}

main().catch((error) => {
  logger.error(error);
  process.exit(1);
});

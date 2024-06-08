#!/usr/bin/env bun

import { argv, parsedArgs } from "./argv";
import { fetchWithCookies } from "./fetchWithCookies";
import { unpackHeaders } from "./unpackHeaders";
import CookieSpec from "./CookieSpec";
import { cookieSpecsFromUrl } from "./cookieSpecsFromUrl";
import logger from "./logger";
import { cliQueryCookies } from "./cliQueryCookies";

async function main() {
  if (parsedArgs["help"] || parsedArgs["h"]) {
    logger.log(`Usage: ${argv[1]} [name] [domain] [options]`);
    logger.log(`Options:`);
    logger.log(`  -h, --help: Show this help message`);
    logger.log(`  -v, --verbose: Enable verbose output`);
    logger.log(`  -d, --dump: Dump all results`);
    logger.log(`  -D, --dump-grouped: Dump all results, grouped by profile`);
    logger.log(`  -r, --render: Render all results`);
    logger.log(`  -F, --fetch <url>: Fetch data from the specified URL`);
    logger.log(`  -H <header>: Specify headers for the fetch request`);
    logger.log(`  --dump-response-headers: Dump response headers from fetch request`);
    logger.log(`  --dump-response-body: Dump response body from fetch request`);
    return;
  }

  parsedArgs["verbose"] = parsedArgs["verbose"] || parsedArgs["v"];

  const fetchUrl: string = parsedArgs["fetch"] || parsedArgs["F"];
  if (fetchUrl) {
    let url: URL;
    try {
      url = new URL(fetchUrl);
    } catch (e) {
      logger.error("Invalid URL", fetchUrl);
      return;
    }
    logger.start("Fetching", url.href);
    const headerArgs: string[] | string = parsedArgs["H"];
    const headers = unpackHeaders(headerArgs);
    const onfulfilled = async (res: Response) => {
      if (parsedArgs["dump-response-headers"]) {
        for (const [key, value] of Object.entries(res.headers)) {
          logger.log(`${key}: ${value}`);
        }
      }
      if (parsedArgs["dump-response-body"]) {
        const responseBody = await res.text();
        logger.log(responseBody);
      }
    };
    try {
      const res = await fetchWithCookies(url, { headers });
      logger.debug("Response", res);
      await onfulfilled(res);
    } catch (error) {
      logger.error(error);
    }
    return;
  }

  const cookieSpecs: CookieSpec[] = [];
  const argUrl: string = parsedArgs["url"] || parsedArgs["u"];
  if (argUrl) {
    for (const cookieSpec of cookieSpecsFromUrl(argUrl)) {
      cookieSpecs.push(cookieSpec);
    }
  } else {
    cookieSpecs.push({
      name: parsedArgs["name"] || parsedArgs["_"][0] || "%",
      domain: parsedArgs["domain"] || parsedArgs["_"][1] || "%",
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

main().then(() => process.exit(0), (error) => {
  logger.error(error);
  process.exit(1);
});

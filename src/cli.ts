#!/usr/bin/env ts-node

import { argv, parsedArgs } from "./argv";
import { fetchWithCookies } from "./fetchWithCookies";
import { unpackHeaders } from "./unpackHeaders";
import CookieSpec from "./CookieSpec";
import { cookieSpecsFromUrl } from "./cookieSpecsFromUrl";
import logger from "./logger";
import { cliQueryCookies } from "./cliQueryCookies";

async function main() {
  if (parsedArgs["help"] || parsedArgs["h"]) {
    logger.log(`Usage: ${argv[1]} [name] [domain] [options] `);
    logger.log(`Options:`);
    logger.log(`  -h, --help: Show this help`);
    logger.log(`  -v, --verbose: Show verbose output`);
    logger.log(`  -d, --dump: Dump all results`);
    logger.log(`  -D, --dump-grouped: Dump all results, grouped by profile`);
    logger.log(`  -r, --render: Render all results`);
    return;
  }

  parsedArgs["verbose"] = parsedArgs["verbose"] || parsedArgs["v"];

  const fetchUrl: string = parsedArgs["fetch"] || parsedArgs["F"];
  if (fetchUrl) {
    let url: URL;
    try {
      url = new URL(<string>fetchUrl);
    } catch (e) {
      logger.error("Invalid URL", fetchUrl);
      return;
    }
    logger.start("Fetching", url.href);
    const headerArgs: string[] | string = parsedArgs["H"];
    const headers = unpackHeaders(headerArgs);
    const onfulfilled = (res: Response) => {
      if (parsedArgs["dump-response-headers"]) {
        res.headers.forEach((value: string, key: string) => {
          logger.log(`${key}: ${value}`);
        });
      }
      if (parsedArgs["dump-response-body"]) {
        res.text().then((r) => {
          logger.log(r);
        });
      }
      return;
    };
    return fetchWithCookies(
      url,
      {
        //
        headers,
      },
      //
    ).then(
      (res) => {
        logger.debug("Response", res);
        onfulfilled(res);
      },
      logger.error,
      //
    );
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

  await cliQueryCookies(cookieSpecs).catch(logger.error);
}

main().then((r) => r, logger.error);

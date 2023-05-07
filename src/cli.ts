#!/usr/bin/env ts-node

import { argv, parsedArgs } from "./argv";
import { groupBy } from "lodash";
import { green, red, yellow } from "colorette";
import { resultsRendered } from "./resultsRendered";
import { fetchWithCookies } from "./fetchWithCookies";
import { unpackHeaders } from "./unpackHeaders";
import CookieSpec from "./CookieSpec";
import { comboQueryCookieSpec } from "./comboQueryCookieSpec";
import { cookieSpecsFromUrl } from "./cookieSpecsFromUrl";
import logger from "./logger";

async function cliQueryCookies(cookieSpec: CookieSpec | CookieSpec[]) {
  try {
    const results = await comboQueryCookieSpec(cookieSpec);
    if (results == null || results.length == 0) {
      logger.error(red("No results"));
      return;
    }
    if (parsedArgs["dump"] || parsedArgs["d"]) {
      logger.log(results);
      return;
    }
    if (parsedArgs["dump-grouped"] || parsedArgs["D"]) {
      const groupedByFile = groupBy(results, (r) => r.meta?.file);
      logger.log(green(JSON.stringify(groupedByFile, null, 2)));
      return;
    }
    if (
      parsedArgs["render"] ||
      parsedArgs["render-merged"] ||
      parsedArgs["r"]
    ) {
      logger.log(yellow(resultsRendered(results)));
      return;
    }
    if (parsedArgs["render-grouped"] || parsedArgs["R"]) {
      const groupedByFile = groupBy(results, (r) => r.meta?.file);
      for (const file of Object.keys(groupedByFile)) {
        let results = groupedByFile[file];
        logger.log(green(file) + ": ", yellow(resultsRendered(results)));
      }
      return;
    }
    for (const result of results) {
      logger.log(result.value);
    }
  } catch (e) {
    logger.error(e);
  }
}

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
    fetchWithCookies(
      url,
      {
        //
        headers,
      }
      //
    ).then(
      onfulfilled,
      logger.error
      //
    );
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

  await cliQueryCookies(cookieSpecs).catch(logger.error);
}

main().then((r) => r, logger.error);

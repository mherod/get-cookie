#!/usr/bin/env node

import minimist from "minimist";
import { argv } from "./argv";
import { env } from "./global";
import { queryCookies } from "./queryCookies";
import { groupBy } from "lodash";
import { green, yellow } from "colorette";
import { resultsRendered } from "./resultsRendered";
import { fetchWithCookies } from "./fetchWithCookies";
import { unpackHeaders } from "./unpackHeaders";

const parsedArgs: minimist.ParsedArgs = minimist(argv);

async function cliQueryCookies(name: string, domain: string) {
  try {
    const results = await queryCookies({ name, domain });
    if (results.length > 0) {
      if (argv.includes("--combined-string")) {
        console.log(yellow(resultsRendered(results)));
      } else if (argv.includes("--render") || argv.includes("-r")) {
        console.log(yellow(resultsRendered(results)));
      } else if (argv.includes("--dump") || argv.includes("-d")) {
        console.log(results);
      } else if (argv.includes("--dump-grouped")) {
        const groupedByFile = groupBy(results, (r) => r.meta?.file);
        console.log(green(JSON.stringify(groupedByFile, null, 2)));
      } else if (argv.includes("--combined-string-grouped")) {
        const groupedByFile = groupBy(results, (r) => r.meta?.file);
        for (const file of Object.keys(groupedByFile)) {
          let results = groupedByFile[file];
          console.log(green(file) + ": ", yellow(resultsRendered(results)));
        }
      } else {
        for (const result of results) {
          console.log(result.value);
        }
      }
    } else {
      console.error("No results");
    }
  } catch (e) {
    console.error(e);
  }
}

function main() {
  if (argv && argv.length > 2) {
    const arg2 = argv[2];
    const arg3 = argv[3];
    if (arg2 == "--fetch" || arg2 == "-f") {
      const f = parsedArgs["f"];
      let url: URL;
      try {
        url = new URL(f);
      } catch (e) {
        console.error("Invalid URL", arg3);
        return;
      }
      const headerArgs: string[] | string = parsedArgs["H"];
      const headers = unpackHeaders(headerArgs);
      const onfulfilled = (res: Response) => {
        return res.text().then((r) => {
          console.log(r);
        });
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
        console.error
        //
      );
      return;
    }
    let domain;
    if (arg3 != null && arg3.indexOf(".") > -1) {
      domain = arg3;
    } else {
      domain = "%";
    }

    const tru = `${true}`;

    if (argv.includes("--require-jwt")) {
      env.REQUIRE_JWT = tru;
    }
    if (argv.includes("--verbose")) {
      env.VERBOSE = tru;
    }
    if (argv.includes("--chrome-only")) {
      env.CHROME_ONLY = tru;
    }
    if (argv.includes("--firefox-only")) {
      env.FIREFOX_ONLY = tru;
    }
    if (argv.includes("--ignore-expired")) {
      env.IGNORE_EXPIRED = tru;
    }

    if (argv.includes("--single")) {
      env.SINGLE = tru;
    }

    if (env.VERBOSE) {
      console.log("Verbose mode", argv);
    }

    cliQueryCookies(arg2, domain).catch(console.error);
  }
}

main();

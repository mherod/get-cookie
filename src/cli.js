#!/usr/bin/env node

import { version } from "../package.json";
import { env } from "./global";
import { queryCookies } from "./queryCookies";
import { argv } from "./argv";
import { groupBy, uniqBy } from "lodash";
import { blue, green } from "colorette";

function combinedString(results) {
  return blue(
    uniqBy(results, (r) => r.name)
      .map((r) => r.name + "=" + r.value)
      .join("; ")
  );
}

async function cliQueryCookies(name, domain) {
  try {
    const results = await queryCookies({ name, domain });
    if (results.length > 0) {
      if (argv.includes("--combined-string")) {
        console.log(combinedString(results));
      } else if (argv.includes("--dump")) {
        console.log(results);
      } else if (argv.includes("--dump-grouped")) {
        const groupedByFile = groupBy(results, (r) => r.meta?.file);
        console.log(green(JSON.stringify(groupedByFile, null, 2)));
      } else if (argv.includes("--combined-string-grouped")) {
        const groupedByFile = groupBy(results, (r) => r.meta?.file);
        for (const file of Object.keys(groupedByFile)) {
          let results = groupedByFile[file];
          console.log(green(file) + ": ", combinedString(results));
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

if (argv && argv.length > 2) {
  if (argv.includes("--version") || argv.includes("-v")) {
    console.log(version);
    return;
  }

  const name = argv[2];

  let domain;
  if (argv[3] != null && argv[3].indexOf(".") > -1) {
    domain = argv[3];
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

  cliQueryCookies(name, domain).catch(console.error);
}

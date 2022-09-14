#!/usr/bin/env node

import { version } from "../package.json";
import { env } from "./global";
const { getCookie } = require("./index");

const argv = process.argv;
if (argv) {
  if (argv.length > 2) {
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

    if (argv.includes("--require-jwt")) {
      env.REQUIRE_JWT = "true";
    }
    if (argv.includes("--verbose")) {
      env.VERBOSE = "true";
    }
    if (argv.includes("--chrome-only")) {
      env.CHROME_ONLY = "true";
    }
    if (argv.includes("--firefox-only")) {
      env.FIREFOX_ONLY = "true";
    }
    if (argv.includes("--ignore-expired")) {
      env.IGNORE_EXPIRED = "true";
    }

    if (env.VERBOSE) {
      console.log("Verbose mode", argv);
    }

    getCookie({
      name: name,
      domain: domain,
      requireJwt: env.REQUIRE_JWT === "true",
    })
      .then((cookie) => {
        if (typeof cookie === "string") {
          console.log(cookie);
        }
      })
      .catch((err) => {
        console.error(err);
      });
  }
}

#!/usr/bin/env node

const {getCookie} = require("./index");

if (process.argv) {
    if (process.argv.length > 2) {
        const name = process.argv[2];

        let domain;
        if (process.argv[3] != null && process.argv[3].indexOf(".") > -1) {
            domain = process.argv[3];
        } else {
            domain = '%';
        }

        if (process.argv.includes("--require-jwt")) {
            process.env.REQUIRE_JWT = "true";
        }
        if (process.argv.includes('--verbose')) {
            process.env.VERBOSE = "true";
        }
        if (process.argv.includes("--chrome-only")) {
            process.env.CHROME_ONLY = "true";
        }
        if (process.argv.includes("--firefox-only")) {
            process.env.FIREFOX_ONLY = "true";
        }
        if (process.argv.includes("--ignore-expired")) {
            process.env.IGNORE_EXPIRED = "true";
        }

        if (process.env.VERBOSE) {
            console.log("Verbose mode", process.argv);
        }

        getCookie({
            name: name,
            domain: domain,
            requireJwt: (process.env.REQUIRE_JWT === "true"),
        }).then(cookie => {
            if (typeof cookie === "string") {
                console.log(cookie);
            }
        }).catch(err => {
            console.error(err);
        });
    }
}

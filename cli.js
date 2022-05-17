#!/usr/bin/env node

const {getFirefoxCookie, getChromeCookie} = require("./index");
const {printStringValue} = require("./utils");

if (process.argv) {
    if (process.argv.length > 2) {
        const name = process.argv[2];

        let domain;
        if (process.argv[3] != null && process.argv[3].indexOf(".") > -1) {
            domain = process.argv[3];
        } else {
            domain = '%';
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

        if (process.env.CHROME_ONLY) {
            if (process.env.VERBOSE) {
                console.log('chrome only');
            }
            getChromeCookie({name, domain})
                .then(cookie => {
                    if (cookie && cookie.length > 0) {
                        printStringValue(cookie);
                    } else {
                        console.log('No cookie found');
                    }
                })
                .catch(err => {
                    if (process.env.VERBOSE) {
                        console.error(err);
                    }
                });
        } else if (process.env.FIREFOX_ONLY) {
            if (process.env.VERBOSE) {
                console.log('firefox only');
            }
            getFirefoxCookie({name, domain})
                .then(cookie => {
                    if (cookie && cookie.length > 0) {
                        printStringValue(cookie);
                    } else {
                        console.log('No cookie found');
                    }
                })
                .catch(err => {
                    if (process.env.VERBOSE) {
                        console.error("Error getting Firefox cookie", err);
                    }
                });
        } else {
            getChromeCookie({name, domain})
                .catch(err => {
                    if (process.env.VERBOSE) {
                        console.error("Error getting Chrome cookie", err);
                    }
                })
                .then(r => {
                    if (typeof r === 'string' && r.trim().length > 0) {
                        return r;
                    } else {
                        return getFirefoxCookie({name, domain})
                            .catch(err => {
                                if (process.env.VERBOSE) {
                                    console.error("Error getting Firefox cookie", err);
                                }
                            });
                    }
                })
                .catch((e) => {
                    if (process.env.VERBOSE) {
                        console.error("Error getting Chrome or Firefox cookie", e);
                    }
                })
                .then(printStringValue);
        }
    }
}

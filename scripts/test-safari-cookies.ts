#!/usr/bin/env tsx

import { join } from "path";

import { decodeBinaryCookies } from "../src/core/browsers/decodeBinaryCookies";
import logger from "../src/utils/logger";

const consola = logger.withTag("test-safari-cookies");

function main(): void {
  const homeDir = process.env.HOME;
  if (typeof homeDir !== "string" || homeDir.trim().length === 0) {
    consola.error("HOME environment variable not set or empty");
    process.exit(1);
  }

  const cookieDbPath = join(
    homeDir,
    "Library",
    "Containers",
    "com.apple.Safari",
    "Data",
    "Library",
    "Cookies",
    "Cookies.binarycookies",
  );

  try {
    consola.info("Reading Safari cookies from:", cookieDbPath);
    const cookies = decodeBinaryCookies(cookieDbPath);

    consola.info(`Found ${cookies.length} cookies`);

    // Print a summary of each cookie
    cookies.forEach((cookie, index) => {
      consola.info(`\nCookie ${index + 1}:`);
      consola.info(`  Name: ${cookie.name}`);
      consola.info(`  Domain: ${cookie.domain}`);
      const valueStr = cookie.value;
      consola.info(
        `  Value: ${valueStr.slice(0, 50)}${valueStr.length > 50 ? "..." : ""}`,
      );
      consola.info(`  Expiry: ${new Date(cookie.expiry * 1000).toISOString()}`);
    });
  } catch (error) {
    if (error instanceof Error) {
      consola.error("Failed to read cookies:", error.message);
    } else {
      consola.error("Failed to read cookies: Unknown error");
    }
    process.exit(1);
  }
}

main();

#!/usr/bin/env tsx

import { homedir } from "os";
import { join } from "path";

import { decodeBinaryCookies } from "../src/core/browsers/decodeBinaryCookies";

function main(): void {
  const cookieDbPath = join(
    homedir(),
    "Library/Containers/com.apple.Safari/Data/Library/Cookies/Cookies.binarycookies",
  );

  try {
    const cookies = decodeBinaryCookies(cookieDbPath);
    console.log(`Successfully decoded ${cookies.length} cookies\n`);

    // Display first 5 cookies as a sample
    console.log("Sample cookies (first 5):");
    cookies.slice(0, 5).forEach((cookie, index) => {
      console.log(`\nCookie ${index + 1}:`);
      console.log("  Name:", cookie.name);
      console.log("  Value:", cookie.value);
      console.log("  Domain:", cookie.domain);
      console.log("  Path:", cookie.path);
      console.log("  Expiry:", new Date(cookie.expiry * 1000).toISOString());
      console.log(
        "  Creation:",
        new Date(cookie.creation * 1000).toISOString(),
      );
      console.log("  Flags:", cookie.flags?.toString(16).padStart(8, "0"));
    });
  } catch (error) {
    console.error("Error decoding cookies:", error);
  }
}

main();

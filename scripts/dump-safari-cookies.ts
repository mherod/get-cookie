#!/usr/bin/env tsx

import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

import { consola } from "consola";

function createHexDump(buffer: Buffer, length: number): string {
  let hexDump = "";
  for (let i = 0; i < length; i++) {
    if (i % 16 === 0) {
      if (i > 0) {
        hexDump += "\n";
      }
      hexDump += `${i.toString(16).padStart(4, "0")}: `;
    }
    hexDump += buffer[i].toString(16).padStart(2, "0") + " ";
  }
  return hexDump;
}

function main(): void {
  const cookieDbPath = join(
    homedir(),
    "Library/Containers/com.apple.Safari/Data/Library/Cookies/Cookies.binarycookies",
  );

  try {
    const buffer = readFileSync(cookieDbPath);
    consola.info("First 64 bytes of cookie file:");

    // Print magic bytes as string
    consola.info("Magic bytes:", buffer.toString("utf8", 0, 4));

    // Print number of pages
    const numPages = buffer.readUInt32BE(4);
    consola.info("Number of pages:", numPages);

    // Print page sizes
    consola.info("Page sizes:");
    for (let i = 0; i < Math.min(numPages, 10); i++) {
      const size = buffer.readUInt32BE(8 + i * 4);
      consola.info(`  Page ${i}: ${size} bytes`);
    }

    // Print hex dump
    const hexDump = createHexDump(buffer, 64);
    consola.info("\nHex dump:\n" + hexDump);
  } catch (error) {
    if (error instanceof Error) {
      consola.error("Error reading cookie file:", error.message);
    } else {
      consola.error("Error reading cookie file:", error);
    }
  }
}

main();

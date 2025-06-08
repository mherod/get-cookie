#!/usr/bin/env tsx

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { consola } from "consola";

function dumpPageHeader(buffer: Buffer, offset: number): void {
  const pageMagic = buffer.readUInt32BE(offset);
  const numCookies = buffer.readUInt32BE(offset + 4);

  consola.info(`Page Header at offset ${offset}:`);
  consola.info(`  Magic: 0x${pageMagic.toString(16).padStart(8, "0")}`);
  consola.info(`  Number of cookies: ${numCookies}`);

  // Dump cookie offsets
  consola.info("  Cookie offsets:");
  for (let i = 0; i < numCookies; i++) {
    const cookieOffset = buffer.readUInt32BE(offset + 8 + i * 4);
    consola.info(
      `    Cookie ${i}: offset ${cookieOffset} (0x${cookieOffset.toString(16).padStart(8, "0")})`,
    );
  }
}

function dumpCookieHeader(buffer: Buffer, offset: number): void {
  const size = buffer.readUInt32BE(offset);
  const flags = buffer.readUInt32BE(offset + 4);
  const urlOffset = buffer.readUInt32BE(offset + 8);
  const nameOffset = buffer.readUInt32BE(offset + 12);
  const pathOffset = buffer.readUInt32BE(offset + 16);
  const valueOffset = buffer.readUInt32BE(offset + 20);
  const commentOffset = buffer.readUInt32BE(offset + 24);
  const expiryDate = buffer.readDoubleLE(offset + 28);
  const creationDate = buffer.readDoubleLE(offset + 36);

  consola.info(`\nCookie Header at offset ${offset}:`);
  consola.info(`  Size: ${size} bytes`);
  consola.info(`  Flags: 0x${flags.toString(16).padStart(8, "0")}`);
  consola.info(
    `  URL offset: ${urlOffset} (0x${urlOffset.toString(16).padStart(8, "0")})`,
  );
  consola.info(
    `  Name offset: ${nameOffset} (0x${nameOffset.toString(16).padStart(8, "0")})`,
  );
  consola.info(
    `  Path offset: ${pathOffset} (0x${pathOffset.toString(16).padStart(8, "0")})`,
  );
  consola.info(
    `  Value offset: ${valueOffset} (0x${valueOffset.toString(16).padStart(8, "0")})`,
  );
  consola.info(
    `  Comment offset: ${commentOffset} (0x${commentOffset.toString(16).padStart(8, "0")})`,
  );
  consola.info(`  Expiry date: ${new Date(expiryDate * 1000).toISOString()}`);
  consola.info(
    `  Creation date: ${new Date(creationDate * 1000).toISOString()}`,
  );
}

function main(): void {
  const cookieDbPath = join(
    homedir(),
    "Library/Containers/com.apple.Safari/Data/Library/Cookies/Cookies.binarycookies",
  );

  try {
    const buffer = readFileSync(cookieDbPath);

    // File header
    const magic = buffer.toString("utf8", 0, 4);
    const numPages = buffer.readUInt32BE(4);

    consola.info("File Header:");
    consola.info(`  Magic: ${magic}`);
    consola.info(`  Number of pages: ${numPages}`);

    // Page sizes
    consola.info("\nPage Sizes:");
    const pageSizes: number[] = [];
    for (let i = 0; i < numPages; i++) {
      const size = buffer.readUInt32BE(8 + i * 4);
      pageSizes.push(size);
      consola.info(`  Page ${i}: ${size} bytes`);
    }

    // Start of pages
    const offset = 8 + numPages * 4;

    // Dump first page details
    consola.info("\n=== First Page Details ===");
    dumpPageHeader(buffer, offset);

    // Get first cookie offset
    const firstCookieOffset = buffer.readUInt32BE(offset + 8);
    if (firstCookieOffset > 0) {
      dumpCookieHeader(buffer, offset + firstCookieOffset);
    }
  } catch (error) {
    if (error instanceof Error) {
      consola.error("Error reading cookie file:", error.message);
    } else {
      consola.error("Error reading cookie file:", error);
    }
  }
}

main();

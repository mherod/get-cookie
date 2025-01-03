#!/usr/bin/env tsx

import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

import { consola } from "consola";

function createHexDump(buffer: Buffer, offset: number, length: number): string {
  let hexDump = "";
  for (let i = 0; i < length; i++) {
    if (i % 16 === 0) {
      if (i > 0) {
        hexDump += "\n";
      }
      hexDump += `${(offset + i).toString(16).padStart(4, "0")}: `;
    }
    hexDump += buffer[offset + i].toString(16).padStart(2, "0") + " ";

    // Add ASCII representation at the end of each line
    if ((i + 1) % 16 === 0 || i === length - 1) {
      // Pad with spaces if we're on the last line and it's not full
      const padding = " ".repeat((16 - (i % 16)) * 3);
      hexDump += padding + " | ";

      // Add ASCII representation
      for (let j = i - (i % 16); j <= i; j++) {
        const byte = buffer[offset + j];
        hexDump += byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : ".";
      }
    }
  }
  return hexDump;
}

function dumpCookieAtOffset(buffer: Buffer, offset: number): void {
  consola.info(`\nDumping cookie data at offset ${offset}:`);

  // Read cookie size
  const size = buffer.readUInt32LE(offset);
  consola.info(`Cookie size: ${size} bytes`);

  // Read cookie header
  const version = buffer.readUInt32LE(offset + 4);
  const flags = buffer.readUInt32LE(offset + 8);
  const hasPort = buffer.readUInt32LE(offset + 12);

  consola.info(`Version: ${version}`);
  consola.info(`Flags: ${flags}`);
  consola.info(`Has port: ${hasPort}`);

  // Read offsets
  const urlOffset = buffer.readUInt32LE(offset + 16);
  const nameOffset = buffer.readUInt32LE(offset + 20);
  const pathOffset = buffer.readUInt32LE(offset + 24);
  const valueOffset = buffer.readUInt32LE(offset + 28);

  consola.info(`URL offset: ${urlOffset}`);
  consola.info(`Name offset: ${nameOffset}`);
  consola.info(`Path offset: ${pathOffset}`);
  consola.info(`Value offset: ${valueOffset}`);

  // Dump the raw bytes
  consola.info("\nRaw bytes:");
  consola.info(createHexDump(buffer, offset, Math.min(size, 256)));

  // Try to read strings
  try {
    let end = offset + nameOffset;
    while (end < buffer.length && buffer[end] !== 0) {end++;}
    const name = buffer.toString("utf8", offset + nameOffset, end);
    consola.info(`\nCookie name: "${name}"`);
  } catch (_error) {
    consola.warn("Failed to read cookie name");
  }
}

function dumpFooter(buffer: Buffer): void {
  const footerOffset = buffer.length - 8;
  consola.info("\nFooter analysis:");
  consola.info("Last 16 bytes as hex:");
  consola.info(createHexDump(buffer, footerOffset - 8, 16));

  // Show different interpretations of the footer
  const footerBigInt = buffer.readBigUInt64BE(footerOffset);
  const footerNumber = Number(footerBigInt);
  const footerLittleEndian = buffer.readBigUInt64LE(footerOffset);

  consola.info("\nFooter interpretations:");
  consola.info(`As BigInt (BE): 0x${footerBigInt.toString(16)}`);
  consola.info(`As Number (BE): 0x${footerNumber.toString(16)}`);
  consola.info(`As BigInt (LE): 0x${footerLittleEndian.toString(16)}`);
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

    // Print hex dump of header
    consola.info("\nHeader hex dump:");
    consola.info(createHexDump(buffer, 0, 64));

    // Dump the cookie at the problematic offset
    dumpCookieAtOffset(buffer, 17305);

    // Analyze footer
    dumpFooter(buffer);
  } catch (error) {
    if (error instanceof Error) {
      consola.error("Error reading cookie file:", error.message);
    } else {
      consola.error("Error reading cookie file:", error);
    }
  }
}

main();

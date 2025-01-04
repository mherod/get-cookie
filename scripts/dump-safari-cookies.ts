#!/usr/bin/env tsx

import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

import { createTaggedLogger } from "../src/utils/logHelpers";

const logger = createTaggedLogger("dump-safari-cookies");

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
  logger.info(`\nDumping cookie data at offset ${offset}:`);

  // Read cookie size
  const size = buffer.readUInt32LE(offset);
  logger.info(`Cookie size: ${size} bytes`);

  // Read cookie header
  const version = buffer.readUInt32LE(offset + 4);
  const flags = buffer.readUInt32LE(offset + 8);
  const hasPort = buffer.readUInt32LE(offset + 12);

  logger.info(`Version: ${version}`);
  logger.info(`Flags: ${flags}`);
  logger.info(`Has port: ${hasPort}`);

  // Read offsets
  const urlOffset = buffer.readUInt32LE(offset + 16);
  const nameOffset = buffer.readUInt32LE(offset + 20);
  const pathOffset = buffer.readUInt32LE(offset + 24);
  const valueOffset = buffer.readUInt32LE(offset + 28);

  logger.info(`URL offset: ${urlOffset}`);
  logger.info(`Name offset: ${nameOffset}`);
  logger.info(`Path offset: ${pathOffset}`);
  logger.info(`Value offset: ${valueOffset}`);

  // Dump the raw bytes
  logger.info("\nRaw bytes:");
  logger.info(createHexDump(buffer, offset, Math.min(size, 256)));

  // Try to read strings
  try {
    let end = offset + nameOffset;
    while (end < buffer.length && buffer[end] !== 0) {
      end++;
    }
    const name = buffer.toString("utf8", offset + nameOffset, end);
    logger.info(`\nCookie name: "${name}"`);
  } catch (error) {
    logger.warn("Failed to read cookie name", { error });
  }
}

function dumpFooter(buffer: Buffer): void {
  const footerOffset = buffer.length - 8;
  logger.info("\nFooter analysis:");
  logger.info("Last 16 bytes as hex:");
  logger.info(createHexDump(buffer, footerOffset - 8, 16));

  // Show different interpretations of the footer
  const footerBigInt = buffer.readBigUInt64BE(footerOffset);
  const footerNumber = buffer.readUInt32BE(footerOffset);
  const footerLittleEndian = buffer.readBigUInt64LE(footerOffset);

  logger.info("\nFooter interpretations:");
  logger.info(`As BigInt (BE): 0x${footerBigInt.toString(16)}`);
  logger.info(`As Number (BE): 0x${footerNumber.toString(16)}`);
  logger.info(`As BigInt (LE): 0x${footerLittleEndian.toString(16)}`);
}

function main(): void {
  const cookieDbPath = join(
    homedir(),
    "Library/Containers/com.apple.Safari/Data/Library/Cookies/Cookies.binarycookies",
  );

  try {
    const buffer = readFileSync(cookieDbPath);
    logger.info("First 64 bytes of cookie file:");

    // Print magic bytes as string
    logger.info("Magic bytes:", buffer.toString("utf8", 0, 4));

    // Print number of pages
    const numPages = buffer.readUInt32BE(4);
    logger.info("Number of pages:", numPages);

    // Print page sizes
    logger.info("Page sizes:");
    for (let i = 0; i < Math.min(numPages, 10); i++) {
      const size = buffer.readUInt32BE(8 + i * 4);
      logger.info(`  Page ${i}: ${size} bytes`);
    }

    // Print hex dump of header
    logger.info("\nHeader hex dump:");
    logger.info(createHexDump(buffer, 0, 64));

    // Dump the cookie at the problematic offset
    dumpCookieAtOffset(buffer, 4096);

    dumpFooter(buffer);
  } catch (error) {
    logger.error("Error reading cookie file", { error });
  }
}

main();

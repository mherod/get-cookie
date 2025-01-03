#!/usr/bin/env tsx

import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

import { consola } from "consola";

function validateCookieOffsets(
  buffer: Buffer,
  offset: number,
  numCookies: number,
  bufferLength: number,
): void {
  const cookieOffsetsEnd = offset + 8 + numCookies * 4;
  if (cookieOffsetsEnd > bufferLength) {
    throw new Error(
      `Invalid cookie offsets: end ${cookieOffsetsEnd} exceeds buffer length ${bufferLength}`,
    );
  }

  consola.info("  Cookie offsets:");
  for (let i = 0; i < numCookies; i++) {
    const cookieOffsetBE = buffer.readUInt32BE(offset + 8 + i * 4);
    const cookieOffsetLE = buffer.readUInt32LE(offset + 8 + i * 4);
    const absoluteOffsetBE = offset + cookieOffsetBE;
    const absoluteOffsetLE = offset + cookieOffsetLE;

    consola.info(`    Cookie ${i}:`);
    consola.info(
      `      BE offset: ${cookieOffsetBE} (absolute: ${absoluteOffsetBE})${absoluteOffsetBE >= bufferLength ? " INVALID" : ""}`,
    );
    consola.info(
      `      LE offset: ${cookieOffsetLE} (absolute: ${absoluteOffsetLE})${absoluteOffsetLE >= bufferLength ? " INVALID" : ""}`,
    );
  }
}

function validatePageHeader(
  buffer: Buffer,
  offset: number,
  bufferLength: number,
): void {
  if (offset + 8 > bufferLength) {
    throw new Error(
      `Invalid page header: offset ${offset} exceeds buffer length ${bufferLength}`,
    );
  }

  const pageMagicBE = buffer.readUInt32BE(offset);
  const pageMagicLE = buffer.readUInt32LE(offset);
  const numCookiesBE = buffer.readUInt32BE(offset + 4);
  const numCookiesLE = buffer.readUInt32LE(offset + 4);

  consola.info(`Page Header at offset ${offset}:`);
  consola.info(`  Magic (BE): 0x${pageMagicBE.toString(16).padStart(8, "0")}`);
  consola.info(`  Magic (LE): 0x${pageMagicLE.toString(16).padStart(8, "0")}`);
  consola.info(`  Number of cookies (BE): ${numCookiesBE}`);
  consola.info(`  Number of cookies (LE): ${numCookiesLE}`);

  // Try little-endian for number of cookies since big-endian gave an unreasonable value
  const numCookies = numCookiesLE;

  validateCookieOffsets(buffer, offset, numCookies, bufferLength);
}

function validateStringOffsets(
  buffer: Buffer,
  offset: number,
  bufferLength: number,
  urlOffset: number,
  nameOffset: number,
  pathOffset: number,
  valueOffset: number,
  commentOffset: number,
): void {
  const stringOffsets = [
    { name: "URL", offset: urlOffset },
    { name: "Name", offset: nameOffset },
    { name: "Path", offset: pathOffset },
    { name: "Value", offset: valueOffset },
    { name: "Comment", offset: commentOffset },
  ];

  for (const { name, offset: stringOffset } of stringOffsets) {
    const absoluteOffset = offset + stringOffset;
    if (absoluteOffset >= bufferLength) {
      consola.warn(
        `  ${name} offset: ${stringOffset} (absolute: ${absoluteOffset}) INVALID - exceeds buffer length`,
      );
      continue;
    }
    consola.info(
      `  ${name} offset: ${stringOffset} (absolute: ${absoluteOffset})`,
    );
  }
}

function validateCookieHeader(
  buffer: Buffer,
  offset: number,
  bufferLength: number,
): void {
  if (offset + 44 > bufferLength) {
    throw new Error(
      `Invalid cookie header: offset ${offset} exceeds buffer length ${bufferLength}`,
    );
  }

  const size = buffer.readUInt32BE(offset);
  if (size < 44 || offset + size > bufferLength) {
    throw new Error(`Invalid cookie size ${size} at offset ${offset}`);
  }

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

  validateStringOffsets(
    buffer,
    offset,
    bufferLength,
    urlOffset,
    nameOffset,
    pathOffset,
    valueOffset,
    commentOffset,
  );

  consola.info(`  Expiry date: ${new Date(expiryDate * 1000).toISOString()}`);
  consola.info(
    `  Creation date: ${new Date(creationDate * 1000).toISOString()}`,
  );
}

function validateFileHeader(buffer: Buffer): {
  numPages: number;
  pageSizesEnd: number;
} {
  const bufferLength = buffer.length;

  if (bufferLength < 8) {
    throw new Error("File too small to contain header");
  }

  const magic = buffer.toString("utf8", 0, 4);
  const numPages = buffer.readUInt32BE(4);

  consola.info("\nFile Header:");
  consola.info(`  Magic: ${magic}`);
  consola.info(`  Number of pages: ${numPages}`);

  // Validate page sizes array
  const pageSizesEnd = 8 + numPages * 4;
  if (pageSizesEnd > bufferLength) {
    throw new Error(
      `Invalid page sizes array: end ${pageSizesEnd} exceeds buffer length ${bufferLength}`,
    );
  }

  consola.info("\nPage Sizes:");
  for (let i = 0; i < numPages; i++) {
    const size = buffer.readUInt32BE(8 + i * 4);
    consola.info(`  Page ${i}: ${size} bytes`);
  }

  return { numPages, pageSizesEnd };
}

function validateFirstPage(buffer: Buffer, offset: number): void {
  consola.info("\n=== First Page Details ===");

  try {
    validatePageHeader(buffer, offset, buffer.length);

    const firstCookieOffset = buffer.readUInt32BE(offset + 8);
    if (firstCookieOffset > 0) {
      validateCookieHeader(buffer, offset + firstCookieOffset, buffer.length);
    }
  } catch (error) {
    consola.error("Error validating first page:", error);
  }
}

function main(): void {
  const cookieDbPath = join(
    homedir(),
    "Library/Containers/com.apple.Safari/Data/Library/Cookies/Cookies.binarycookies",
  );

  try {
    const buffer = readFileSync(cookieDbPath);
    consola.info(`Cookie file size: ${buffer.length} bytes`);

    const { pageSizesEnd } = validateFileHeader(buffer);
    validateFirstPage(buffer, pageSizesEnd);
  } catch (error) {
    if (error instanceof Error) {
      consola.error("Error reading cookie file:", error.message);
    } else {
      consola.error("Error reading cookie file:", error);
    }
  }
}

main();

import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

import type { BinaryCookieRow } from "../../types/schemas";
import { BinaryCookieRowSchema } from "../../types/schemas";
import { parseMacDate } from "../../utils/dates";
import { logWarn } from "../../utils/logHelpers";

// Cookie flag constants
const _COOKIE_FLAGS = {
  SECURE: 0x1,
  HTTP_ONLY: 0x4,
  UNKNOWN1: 0x8,
  UNKNOWN2: 0x10,
} as const;

// File structure constants
const _FILE_HEADER_MAGIC = "cook";
const _FILE_FOOTER = 0x28; // Safari 14+ uses this footer value
const _FILE_FOOTER_LEGACY = 0x071720050000004bn; // Pre-Safari 14 footer value

function readNullTerminatedString(
  buffer: Buffer,
  offset: number,
): [string, number] {
  let end = offset;
  while (end < buffer.length && buffer[end] !== 0) {
    end++;
  }
  return [buffer.toString("utf8", offset, end), end + 1];
}

function decodeCookieHeader(
  buffer: Buffer,
  offset: number,
): [BinaryCookieRow, number] {
  // First 4 bytes are the cookie size in little-endian
  const size = buffer.readUInt32LE(offset);

  // Read version and flags
  const version = buffer.readUInt32LE(offset + 4);
  const flags = buffer.readUInt32LE(offset + 8);

  // Check for port
  const hasPort = buffer.readUInt32LE(offset + 12);

  // Read offsets for dynamic fields
  const urlOffset = buffer.readUInt32LE(offset + 16);
  const nameOffset = buffer.readUInt32LE(offset + 20);
  const pathOffset = buffer.readUInt32LE(offset + 24);
  const valueOffset = buffer.readUInt32LE(offset + 28);
  const commentOffset = buffer.readUInt32LE(offset + 32);
  const commentURLOffset = buffer.readUInt32LE(offset + 36);

  // Read dates using parseMacDate
  const expiryDate = Math.floor(
    parseMacDate(buffer.readDoubleLE(offset + 40)).getTime() / 1000,
  );
  const creationDate = Math.floor(
    parseMacDate(buffer.readDoubleLE(offset + 48)).getTime() / 1000,
  );

  let currentOffset = offset + 56; // Fixed header size

  // Read port if present
  let port: number | undefined;
  if (hasPort) {
    port = buffer.readUInt16LE(currentOffset);
    currentOffset += 2;
  }

  // Read strings in order of their offsets
  const offsets = [
    { field: "url", offset: urlOffset },
    { field: "name", offset: nameOffset },
    { field: "path", offset: pathOffset },
    { field: "value", offset: valueOffset },
    { field: "comment", offset: commentOffset },
    { field: "commentURL", offset: commentURLOffset },
  ].sort((a, b) => a.offset - b.offset);

  const fields: Record<string, string> = {};

  for (const { field, offset: stringOffset } of offsets) {
    if (stringOffset > 0) {
      const [value, nextOffset] = readNullTerminatedString(
        buffer,
        offset + stringOffset,
      );
      fields[field] = value;
      currentOffset = Math.max(currentOffset, nextOffset);
    }
  }

  // Create and validate the cookie row
  const cookieRow = BinaryCookieRowSchema.parse({
    name: fields.name,
    value: fields.value,
    domain: fields.url.startsWith(".") ? fields.url.slice(1) : fields.url,
    path: fields.path || "/",
    expiry: Math.floor(expiryDate),
    creation: Math.floor(creationDate),
    flags,
    version,
    port,
    comment: fields.comment,
    commentURL: fields.commentURL,
  });

  return [cookieRow, size];
}

function decodePage(
  buffer: Buffer,
  offset: number,
  _pageSize: number,
): BinaryCookieRow[] {
  // Skip first 4 bytes of page header
  const headerLengthOffset = offset + 4;
  // Next byte is a null terminator
  const _headerLength = buffer.readUInt32BE(headerLengthOffset + 1);
  // Next 4 bytes contain number of cookies
  const numCookies = buffer.readUInt32BE(headerLengthOffset + 5);

  const cookies: BinaryCookieRow[] = [];

  // Read cookie offsets
  const cookieOffsets: number[] = [];
  for (let i = 0; i < numCookies; i++) {
    const cookieOffset = buffer.readUInt32BE(headerLengthOffset + 9 + i * 4);
    cookieOffsets.push(cookieOffset);
  }

  // Read cookies at their offsets
  for (const cookieOffset of cookieOffsets) {
    try {
      const [cookie, _] = decodeCookieHeader(buffer, offset + cookieOffset);
      cookies.push(cookie);
    } catch (error) {
      logWarn(
        "BinaryCookies",
        `Error decoding cookie at offset ${offset + cookieOffset}`,
        { error },
      );
      break;
    }
  }

  return cookies;
}

/**
 * Validates the footer of a Safari cookie file.
 * @param buffer - The buffer containing the cookie file data
 * @returns true if the footer is valid
 */
function validateFooter(buffer: Buffer): boolean {
  // Try reading as two 32-bit values first (Safari 14+)
  const highFooter = buffer.readUInt32BE(buffer.length - 8);
  const lowFooter = buffer.readUInt32BE(buffer.length - 4);
  if (highFooter === _FILE_FOOTER && lowFooter === 0) {
    return true;
  }

  // Try reading as a 64-bit value (pre-Safari 14)
  const footer = buffer.readBigUInt64BE(buffer.length - 8);
  return footer === _FILE_FOOTER_LEGACY;
}

/**
 * Decodes a Safari binary cookie file into an array of cookie objects.
 * @param cookieDbPath - Path to the Safari Cookies.binarycookies file
 * @returns Array of decoded cookie objects
 * @throws {Error} If the file cannot be read or has invalid format
 */
export function decodeBinaryCookies(cookieDbPath: string): BinaryCookieRow[] {
  const buffer = readFileSync(cookieDbPath);

  // Validate magic header
  const magic = buffer.toString("utf8", 0, 4);
  if (magic !== _FILE_HEADER_MAGIC) {
    throw new Error("Invalid cookie file format: wrong magic header");
  }

  // Read number of pages
  const numPages = buffer.readUInt32BE(4);

  // Read the page sizes array (4 bytes per page)
  const pageSizes: number[] = [];
  for (let i = 0; i < numPages; i++) {
    pageSizes.push(buffer.readUInt32BE(8 + i * 4));
  }

  // Skip the page sizes array
  let offset = 8 + numPages * 4;
  const cookies: BinaryCookieRow[] = [];

  // Process each page
  for (let i = 0; i < numPages; i++) {
    try {
      const pageCookies = decodePage(buffer, offset, pageSizes[i]);
      cookies.push(...pageCookies);
      offset += pageSizes[i];
    } catch (error) {
      logWarn("BinaryCookies", `Error decoding page ${i}`, { error });
      offset += pageSizes[i];
    }
  }

  // Validate footer
  if (!validateFooter(buffer)) {
    logWarn("BinaryCookies", "Invalid cookie file format: wrong footer");
  }

  return cookies;
}

/**
 * Retrieves cookies from Safari's binary cookie store.
 * @returns Array of decoded Safari cookies
 */
export function getSafariCookies(): BinaryCookieRow[] {
  const cookieDbPath = join(
    homedir(),
    "Library/Containers/com.apple.Safari/Data/Library/Cookies/Cookies.binarycookies",
  );
  return decodeBinaryCookies(cookieDbPath);
}

import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

import type { BinaryCookieRow } from "../../types/schemas";
import { BinaryCookieRowSchema } from "../../types/schemas";

// Cookie flag constants
const _COOKIE_FLAGS = {
  SECURE: 0x1,
  HTTP_ONLY: 0x4,
  UNKNOWN1: 0x8,
  UNKNOWN2: 0x10,
} as const;

// File structure constants
const _FILE_HEADER_MAGIC = "cook";
const _FILE_FOOTER = 0x071720050000004b;

// The date offset for Safari cookies (until 2017)
const _SAFARI_DATE_OFFSET = 978307200; // Difference between Unix epoch and Mac epoch (2001-01-01 00:00:00)

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

  // Read dates and adjust for Safari epoch
  const expiryDate = buffer.readDoubleLE(offset + 40) + _SAFARI_DATE_OFFSET;
  const creationDate = buffer.readDoubleLE(offset + 48) + _SAFARI_DATE_OFFSET;

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
  pageSize: number,
): BinaryCookieRow[] {
  // Skip first 5 bytes
  const headerLengthOffset = offset + 5;
  // Next 4 bytes contain header length
  const headerLength = buffer.readUInt32BE(headerLengthOffset);

  let currentOffset = offset + headerLength;
  const cookies: BinaryCookieRow[] = [];
  const pageEnd = offset + pageSize;

  // Read cookies until we reach the page end
  while (currentOffset < pageEnd - 8) {
    try {
      const [cookie, size] = decodeCookieHeader(buffer, currentOffset);
      cookies.push(cookie);
      currentOffset += size;
    } catch (error) {
      console.warn(`Error decoding cookie at offset ${currentOffset}:`, error);
      break;
    }
  }

  return cookies;
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
      console.warn(`Error decoding page ${i}:`, error);
      offset += pageSizes[i];
    }
  }

  // Validate footer
  const footer = Number(buffer.readBigUInt64BE(buffer.length - 8));
  if (footer !== _FILE_FOOTER) {
    console.warn("Invalid cookie file format: wrong footer");
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

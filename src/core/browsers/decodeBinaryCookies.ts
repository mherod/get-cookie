import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

interface CookieRow {
  name: string;
  value: string;
  domain: string;
  path: string;
  expiry: number;
  creation: number;
  flags?: number;
}

function readNullTerminatedString(buffer: Buffer, offset: number): string {
  let end = offset;
  while (end < buffer.length && buffer[end] !== 0) {
    end++;
  }
  return buffer.toString("utf8", offset, end);
}

function decodeCookieHeader(
  buffer: Buffer,
  pageStart: number,
  cookieOffset: number,
): [CookieRow, number] {
  const offset = pageStart + cookieOffset;
  const size = buffer.readUInt32LE(offset);
  const flags = buffer.readUInt32LE(offset + 4);
  const urlOffset = buffer.readUInt32LE(offset + 8);
  const nameOffset = buffer.readUInt32LE(offset + 12);
  const pathOffset = buffer.readUInt32LE(offset + 16);
  const valueOffset = buffer.readUInt32LE(offset + 20);
  const expiryDate = buffer.readDoubleLE(offset + 28);
  const creationDate = buffer.readDoubleLE(offset + 36);

  // Read strings using offsets relative to the start of this cookie record
  const domain = readNullTerminatedString(buffer, offset + urlOffset);
  const name = readNullTerminatedString(buffer, offset + nameOffset);
  const path = readNullTerminatedString(buffer, offset + pathOffset);
  const value = readNullTerminatedString(buffer, offset + valueOffset);

  return [
    {
      name,
      value,
      domain,
      path,
      expiry: Math.floor(expiryDate),
      creation: Math.floor(creationDate),
      flags,
    },
    size,
  ];
}

const PAGE_MAGIC = 0x00000100;

function decodePage(buffer: Buffer, offset: number): [CookieRow[], number] {
  const pageMagic = buffer.readUInt32BE(offset);
  if (pageMagic !== PAGE_MAGIC) {
    throw new Error(`Invalid page magic bytes: ${pageMagic.toString(16)}`);
  }

  const numCookies = buffer.readUInt32LE(offset + 4);
  const cookies: CookieRow[] = [];

  // Read cookie offsets
  for (let i = 0; i < numCookies; i++) {
    const cookieOffset = buffer.readUInt32LE(offset + 8 + i * 4);
    try {
      const [cookie] = decodeCookieHeader(buffer, offset, cookieOffset);
      cookies.push(cookie);
    } catch (error) {
      console.warn(
        `Error decoding cookie ${i} at offset ${offset + cookieOffset}:`,
        error,
      );
    }
  }

  // Calculate page size based on the last cookie's offset and size
  const lastCookieOffset = buffer.readUInt32LE(
    offset + 8 + (numCookies - 1) * 4,
  );
  const [_, lastCookieSize] = decodeCookieHeader(
    buffer,
    offset,
    lastCookieOffset,
  );
  const pageSize = lastCookieOffset + lastCookieSize;

  return [cookies, pageSize];
}

/**
 * Decodes a Safari binary cookie file into an array of cookie objects.
 * @param cookieDbPath - Path to the Safari Cookies.binarycookies file
 * @returns Array of decoded cookie objects
 * @throws {Error} If the file cannot be read or has invalid format
 */
export function decodeBinaryCookies(cookieDbPath: string): CookieRow[] {
  const buffer = readFileSync(cookieDbPath);
  const magic = buffer.toString("utf8", 0, 4);
  if (magic !== "cook") {
    throw new Error("Invalid file magic bytes");
  }

  const numPages = buffer.readUInt32BE(4);
  let offset = 8 + numPages * 4; // Skip header and page sizes array
  const cookies: CookieRow[] = [];

  for (let i = 0; i < numPages; i++) {
    try {
      const [pageCookies, pageSize] = decodePage(buffer, offset);
      cookies.push(...pageCookies);
      offset += pageSize;
    } catch (error) {
      console.warn(`Error decoding page ${i}:`, error);
      // Try to skip to the next page using the page sizes array
      const pageSize = buffer.readUInt32BE(8 + i * 4);
      offset += pageSize;
    }
  }

  return cookies;
}

/**
 * Retrieves cookies from Safari's binary cookie store.
 * @returns Array of decoded Safari cookies
 */
export function getSafariCookies(): CookieRow[] {
  const cookieDbPath = join(
    homedir(),
    "Library/Containers/com.apple.Safari/Data/Library/Cookies/Cookies.binarycookies",
  );
  return decodeBinaryCookies(cookieDbPath);
}

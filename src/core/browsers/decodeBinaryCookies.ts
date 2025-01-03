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

// The date offset for Safari cookies (until 2017)
const SAFARI_DATE_OFFSET = 1706047360;

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
): [CookieRow, number] {
  // First 4 bytes are the cookie size in little-endian
  const size = buffer.readUInt32LE(offset);

  // Read the date at offset 0x2B (43 bytes from start)
  const dateOffset = offset + 0x2b;
  const date = buffer.readUInt32LE(dateOffset);
  const timestamp = date - SAFARI_DATE_OFFSET;

  // Dynamic fields start at offset 0x38 (56 bytes from start)
  let currentOffset = offset + 0x38;
  const [domain, nextOffset] = readNullTerminatedString(buffer, currentOffset);
  currentOffset = nextOffset;

  const [name, nextOffset2] = readNullTerminatedString(buffer, currentOffset);
  currentOffset = nextOffset2;

  // The fields are path, then value
  const [path, nextOffset3] = readNullTerminatedString(buffer, currentOffset);
  currentOffset = nextOffset3;

  const [value, _] = readNullTerminatedString(buffer, currentOffset);

  return [
    {
      name,
      value,
      domain: domain.startsWith(".") ? domain.slice(1) : domain,
      path: path || "/", // Default to root path if empty
      expiry: timestamp,
      creation: timestamp, // We don't have creation time in this format
    },
    size,
  ];
}

function decodePage(
  buffer: Buffer,
  offset: number,
  pageSize: number,
): CookieRow[] {
  // Skip first 5 bytes
  const headerLengthOffset = offset + 5;
  // Next 4 bytes contain header length
  const headerLength = buffer.readUInt32BE(headerLengthOffset);

  let currentOffset = offset + headerLength;
  const cookies: CookieRow[] = [];
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
export function decodeBinaryCookies(cookieDbPath: string): CookieRow[] {
  const buffer = readFileSync(cookieDbPath);

  // Skip first 4 bytes (header)
  const numPages = buffer.readUInt32BE(4);

  // Read the page sizes array (4 bytes per page)
  const pageSizes: number[] = [];
  for (let i = 0; i < numPages; i++) {
    pageSizes.push(buffer.readUInt32BE(8 + i * 4));
  }

  // Skip the page sizes array
  let offset = 8 + numPages * 4;
  const cookies: CookieRow[] = [];

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

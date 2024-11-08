import CookieRow from "./CookieRow";
import fs from "fs/promises";

const MAGIC_BYTES: Buffer = Buffer.from([0x63, 0x6F, 0x6B, 0x6B]); // "COOK"
const PAGE_HEADER: Buffer = Buffer.from([0x00, 0x00, 0x01, 0x00]);
const PAGE_TRAILER: Buffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);
const EPOCH_OFFSET: number = 978307200;

const FLAGS = {
  SECURE: 0x01,
  HTTP_ONLY: 0x04
} as const;

export const decodeBinaryCookies = async (cookieDbPath: string): Promise<CookieRow[]> => {
  try {
    await fs.access(cookieDbPath);
  } catch {
    return [];
  }

  const buffer: Buffer = await fs.readFile(cookieDbPath);

  if (!buffer.slice(0, 4).equals(MAGIC_BYTES)) {
    throw new Error("Not a cookie file");
  }

  const count: number = buffer.readUInt32BE(4);
  const cookies: CookieRow[] = [];

  let offset: number = 8;
  for (let i: number = 0; i < count; i++) {
    const pageSize: number = buffer.readUInt32BE(offset);
    offset += 4;
    const page: Buffer = buffer.slice(offset, offset + pageSize);
    offset += pageSize;

    if (!page.slice(0, 4).equals(PAGE_HEADER)) {
      throw new Error("Bad page header");
    }

    const cookieCount: number = page.readUInt32LE(4);
    let pageOffset: number = 8;

    for (let j: number = 0; j < cookieCount; j++) {
      const cookieOffset: number = page.readUInt32LE(pageOffset);
      pageOffset += 4;
      const cookieLength: number = page.readUInt32LE(cookieOffset);
      const cookie: Buffer = page.slice(cookieOffset, cookieOffset + cookieLength);

      const flags: number = cookie.readUInt32LE(8);
      const urlOffset: number = cookie.readUInt32LE(16);
      const nameOffset: number = cookie.readUInt32LE(20);
      const pathOffset: number = cookie.readUInt32LE(24);
      const valueOffset: number = cookie.readUInt32LE(28);
      const expiry: number = cookie.readDoubleLE(40) + EPOCH_OFFSET;

      const extractString = (start: number, end: number): string =>
        cookie.slice(start, end).toString('utf8').replace(/\0/g, '');

      const domain: string = extractString(urlOffset, nameOffset);
      const name: string = extractString(nameOffset, valueOffset);
      const path: string = extractString(pathOffset, valueOffset);
      const value: string = extractString(valueOffset, cookie.length);

      cookies.push({
        domain,
        name,
        value: Buffer.from(value, 'utf8'),
        expiry: new Date(expiry * 1000).getTime(),
        meta: {
          path,
          httpOnly: (flags & FLAGS.HTTP_ONLY) === FLAGS.HTTP_ONLY,
          secure: (flags & FLAGS.SECURE) === FLAGS.SECURE
        }
      });
    }

    const trailerStart: number = cookieCount * 4 + 8;
    if (!page.slice(trailerStart, trailerStart + 4).equals(PAGE_TRAILER)) {
      throw new Error("Bad page trailer");
    }
  }

  return cookies;
};

import CookieRow from "./CookieRow";
import fs from "fs/promises";

export const decodeBinaryCookies = async (cookieDbPath: string): Promise<CookieRow[]> => {
  try {
    // Check if file exists
    await fs.access(cookieDbPath);
  } catch {
    // If file doesn't exist, return empty array
    return [];
  }

  // Magic bytes: "COOK" = 0x636F6F6B
  const magicBytes: Buffer = Buffer.from([0x63, 0x6F, 0x6B, 0x6B]);
  const buffer: Buffer = await fs.readFile(cookieDbPath);

  if (!buffer.slice(0, 4).equals(magicBytes)) {
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

    if (!page.slice(0, 4).equals(Buffer.from([0x00, 0x00, 0x01, 0x00]))) {
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
      const valueOffset: number = cookie.readUInt32LE(28);
      const expiry: number = cookie.readDoubleLE(40) + 978307200;

      const url: string = cookie.slice(urlOffset, nameOffset).toString('utf8').replace(/\0/g, '');
      const name: string = cookie.slice(nameOffset, valueOffset).toString('utf8').replace(/\0/g, '');
      const value: string = cookie.slice(valueOffset, cookie.length).toString('utf8').replace(/\0/g, '');

      cookies.push({
        domain: url,
        name: name,
        value: Buffer.from(value, 'utf8'),
        expiry: new Date(expiry * 1000).getTime(),
        meta: {
          path: cookie.slice(cookie.readUInt32LE(24), valueOffset).toString('utf8').replace(/\0/g, ''),
          httpOnly: (flags & 0x04) === 0x04,
          secure: (flags & 0x01) === 0x01
        }
      });
    }

    if (!page.slice(cookieCount * 4 + 8, cookieCount * 4 + 12).equals(Buffer.from([0x00, 0x00, 0x00, 0x00]))) {
      throw new Error("Bad page trailer");
    }
  }

  return cookies;
};

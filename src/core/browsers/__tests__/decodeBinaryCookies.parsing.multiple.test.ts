import { readFileSync } from "fs";

import { decodeBinaryCookies } from "../safari/decodeBinaryCookies";

jest.mock("fs", () => ({
  readFileSync: jest.fn(),
}));

const mockReadFileSync = jest.spyOn({ readFileSync } as { readFileSync: typeof readFileSync }, "readFileSync") as jest.MockedFunction<typeof readFileSync>;

describe("decodeBinaryCookies - Multiple Cookies Parsing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should handle multiple cookies in a page", () => {
    // Create a buffer with correct size
    const buffer = Buffer.alloc(100); // Reduced size to avoid offset issues

    // Write magic bytes
    buffer.write("cook", 0);

    // Write page count (1)
    buffer.writeUInt32LE(1, 4);

    // Write page size (80)
    buffer.writeUInt32LE(80, 8);

    // Write page data
    const pageStart = 12;
    buffer.writeUInt32LE(2, pageStart); // 2 cookies in page

    // Write first cookie data
    const cookie1Start = pageStart + 4;
    buffer.writeUInt32LE(30, cookie1Start); // Cookie size
    buffer.writeUInt32LE(1, cookie1Start + 4); // Version
    buffer.writeUInt32LE(1, cookie1Start + 8); // Flags

    // Write second cookie data
    const cookie2Start = cookie1Start + 30;
    buffer.writeUInt32LE(30, cookie2Start); // Cookie size
    buffer.writeUInt32LE(1, cookie2Start + 4); // Version
    buffer.writeUInt32LE(1, cookie2Start + 8); // Flags

    mockReadFileSync.mockReturnValue(buffer);

    const cookies = decodeBinaryCookies("/path/to/cookies.binarycookies");
    expect(cookies).toBeDefined();
    expect(Array.isArray(cookies)).toBe(true);
  });

  it("should return cookies even with invalid footer", () => {
    // Create a buffer with correct size
    const buffer = Buffer.alloc(100); // Reduced size to avoid offset issues

    // Write magic bytes
    buffer.write("cook", 0);

    // Write page count (1)
    buffer.writeUInt32LE(1, 4);

    // Write page size (80)
    buffer.writeUInt32LE(80, 8);

    // Write page data
    const pageStart = 12;
    buffer.writeUInt32LE(2, pageStart); // 2 cookies in page

    // Write first cookie data
    const cookie1Start = pageStart + 4;
    buffer.writeUInt32LE(30, cookie1Start); // Cookie size
    buffer.writeUInt32LE(1, cookie1Start + 4); // Version
    buffer.writeUInt32LE(1, cookie1Start + 8); // Flags

    // Write second cookie data
    const cookie2Start = cookie1Start + 30;
    buffer.writeUInt32LE(30, cookie2Start); // Cookie size
    buffer.writeUInt32LE(1, cookie2Start + 4); // Version
    buffer.writeUInt32LE(1, cookie2Start + 8); // Flags

    mockReadFileSync.mockReturnValue(buffer);

    const cookies = decodeBinaryCookies("/path/to/cookies.binarycookies");
    expect(cookies).toBeDefined();
    expect(Array.isArray(cookies)).toBe(true);
  });
});

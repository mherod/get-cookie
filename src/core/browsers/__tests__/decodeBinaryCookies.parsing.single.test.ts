import { readFileSync } from "fs";

import { decodeBinaryCookies } from "../safari/decodeBinaryCookies";

jest.mock("fs", () => ({
  readFileSync: jest.fn(),
}));

const mockReadFileSync = jest.spyOn({ readFileSync } as { readFileSync: typeof readFileSync }, "readFileSync") as jest.MockedFunction<typeof readFileSync>;

describe("decodeBinaryCookies - Single Cookie Parsing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should decode a single cookie with all fields", () => {
    // Create a buffer with correct size
    const buffer = Buffer.alloc(200); // Size that accommodates our data

    // Write magic bytes
    buffer.write("cook", 0);

    // Write page count (1)
    buffer.writeUInt32BE(1, 4);

    // Write page size (80)
    buffer.writeUInt32BE(80, 8);

    // Write page data
    const pageStart = 12;
    buffer.writeUInt32BE(1, pageStart); // 1 cookie in page

    // Write cookie data
    const cookieStart = pageStart + 4;
    buffer.writeUInt32BE(60, cookieStart); // Cookie size
    buffer.writeUInt32BE(1, cookieStart + 4); // Version
    buffer.writeUInt32BE(1, cookieStart + 8); // Flags
    buffer.writeUInt32BE(0, cookieStart + 12); // No port

    // Write string offsets
    buffer.writeUInt32BE(40, cookieStart + 16); // URL offset
    buffer.writeUInt32BE(45, cookieStart + 20); // Name offset
    buffer.writeUInt32BE(50, cookieStart + 24); // Path offset
    buffer.writeUInt32BE(55, cookieStart + 28); // Value offset

    mockReadFileSync.mockReturnValue(buffer);

    const cookies = decodeBinaryCookies("/path/to/cookies.binarycookies");
    expect(cookies).toBeDefined();
    expect(Array.isArray(cookies)).toBe(true);
  });
});

import { readFileSync } from "fs";

import { decodeBinaryCookies } from "../safari/decodeBinaryCookies";

jest.mock("fs", () => ({
  readFileSync: jest.fn(),
}));

const mockReadFileSync = jest.spyOn(
  { readFileSync } as { readFileSync: typeof readFileSync },
  "readFileSync",
) as jest.MockedFunction<typeof readFileSync>;

describe("decodeBinaryCookies - Port Handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should handle cookies with ports", () => {
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
    buffer.writeUInt32BE(1, cookieStart + 12); // Has port
    buffer.writeUInt16BE(8080, cookieStart + 16); // Port value

    mockReadFileSync.mockReturnValue(buffer);

    const cookies = decodeBinaryCookies("/path/to/cookies.binarycookies");
    expect(cookies).toBeDefined();
    expect(Array.isArray(cookies)).toBe(true);
  });
});

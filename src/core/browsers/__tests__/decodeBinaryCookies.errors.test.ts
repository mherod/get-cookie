import { readFileSync } from "fs";

import { decodeBinaryCookies } from "../safari/decodeBinaryCookies";

// Mock fs module
jest.mock("fs", () => ({
  readFileSync: jest.fn(),
}));

const mockReadFileSync = jest.spyOn(
  { readFileSync } as { readFileSync: typeof readFileSync },
  "readFileSync",
) as jest.MockedFunction<typeof readFileSync>;

describe("decodeBinaryCookies - Error Handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should handle corrupted cookie data gracefully", () => {
    const buffer = Buffer.alloc(40);
    buffer.write("cook", 0); // Magic bytes
    buffer.writeUInt32BE(1, 4); // Page count
    buffer.writeUInt32BE(10, 8); // Page size
    buffer.writeUInt32BE(0, 12); // Invalid cookie count

    // Write checksum and footer
    buffer.writeUInt32BE(0, 16);
    buffer.writeBigUInt64BE(BigInt("0x071720050000004b"), 20);

    mockReadFileSync.mockReturnValue(buffer);

    const cookies = decodeBinaryCookies("/path/to/cookies.binarycookies");
    expect(cookies).toBeDefined();
    expect(Array.isArray(cookies)).toBe(true);
    expect(cookies).toHaveLength(0);
  });

  it("should handle invalid page sizes", () => {
    const buffer = Buffer.alloc(40);
    buffer.write("cook", 0); // Magic bytes
    buffer.writeUInt32BE(1, 4); // Page count
    buffer.writeUInt32BE(10, 8); // Page size
    buffer.writeUInt32BE(1, 12); // Cookie count
    buffer.writeUInt32BE(0, 16); // Invalid cookie size

    // Write checksum and footer
    buffer.writeUInt32BE(0, 20);
    buffer.writeBigUInt64BE(BigInt("0x071720050000004b"), 24);

    mockReadFileSync.mockReturnValue(buffer);

    const cookies = decodeBinaryCookies("/path/to/cookies.binarycookies");
    expect(cookies).toBeDefined();
    expect(Array.isArray(cookies)).toBe(true);
    expect(cookies).toHaveLength(0);
  });
});

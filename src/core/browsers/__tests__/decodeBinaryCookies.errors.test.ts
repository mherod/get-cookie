import { readFileSync } from "fs";

import { decodeBinaryCookies } from "../decodeBinaryCookies";

// Mock fs module
jest.mock("fs", () => ({
  readFileSync: jest.fn(),
}));

describe("decodeBinaryCookies - Error Handling", () => {
  const mockReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should handle corrupted cookie data gracefully", () => {
    const buffer = Buffer.alloc(100);
    buffer.write("cook");
    buffer.writeUInt32BE(1, 4); // One page
    buffer.writeUInt32BE(50, 8); // Page size

    // Corrupted page data
    buffer.write("100Y", 12);
    buffer.writeUInt32BE(32, 17);
    buffer.write("corrupted", 44);

    // Footer
    buffer.writeBigUInt64BE(BigInt("510912288576766000"), 92);

    mockReadFileSync.mockReturnValue(buffer);

    const cookies = decodeBinaryCookies("/path/to/cookies.binarycookies");
    expect(cookies).toEqual([]);
  });

  it("should handle invalid page sizes", () => {
    const buffer = Buffer.alloc(100);
    buffer.write("cook");
    buffer.writeUInt32BE(1, 4); // One page
    buffer.writeUInt32BE(999999, 8); // Invalid page size
    buffer.writeUInt32BE(0x28, 92); // Safari 14+ footer value
    buffer.writeUInt32BE(0x00, 96);

    mockReadFileSync.mockReturnValue(buffer);

    const cookies = decodeBinaryCookies("/path/to/cookies.binarycookies");
    expect(cookies).toEqual([]);
  });
});

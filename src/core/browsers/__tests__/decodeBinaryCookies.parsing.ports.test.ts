import { readFileSync } from "fs";

import { decodeBinaryCookies } from "../decodeBinaryCookies";

// Mock fs module
jest.mock("fs", () => ({
  readFileSync: jest.fn(),
}));

describe("decodeBinaryCookies - Port Handling", () => {
  const mockReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should handle cookies with ports", () => {
    const buffer = Buffer.alloc(200);
    buffer.write("cook");
    buffer.writeUInt32BE(1, 4); // One page
    buffer.writeUInt32BE(100, 8); // Page size

    // Page header
    buffer.write("100Y", 12);
    buffer.writeUInt32BE(32, 17);

    // Cookie with port
    const cookieOffset = 44;
    buffer.writeUInt32LE(60, cookieOffset); // Cookie size (increased for port)
    buffer.writeUInt32LE(1, cookieOffset + 4); // Version
    buffer.writeUInt32LE(1, cookieOffset + 8); // Flags
    buffer.writeUInt32LE(1, cookieOffset + 12); // Has port

    // String offsets
    buffer.writeUInt32LE(58, cookieOffset + 16); // URL offset (after port)
    buffer.writeUInt32LE(72, cookieOffset + 20); // Name offset
    buffer.writeUInt32LE(82, cookieOffset + 24); // Path offset
    buffer.writeUInt32LE(87, cookieOffset + 28); // Value offset

    // Dates
    const now = Math.floor(Date.now() / 1000) - 978307200;
    buffer.writeDoubleLE(now + 86400, cookieOffset + 40); // Expiry
    buffer.writeDoubleLE(now, cookieOffset + 48); // Creation

    // Port value (2 bytes)
    buffer.writeUInt16LE(8080, cookieOffset + 56);

    // Strings (offset by 2 bytes for port)
    buffer.write(".example.com\0", cookieOffset + 58);
    buffer.write("api-token\0", cookieOffset + 72);
    buffer.write("/\0", cookieOffset + 82);
    buffer.write("def456\0", cookieOffset + 87);

    // Footer
    buffer.writeBigUInt64BE(BigInt("510912288576766000"), 192);

    mockReadFileSync.mockReturnValue(buffer);

    const cookies = decodeBinaryCookies("/path/to/cookies.binarycookies");
    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toMatchObject({
      name: "api-token",
      value: "def456",
      domain: "example.com",
      path: "/",
      port: 8080,
      flags: 1
    });
  });
});

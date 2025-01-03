import { readFileSync } from "fs";

import { logWarn } from "../../../utils/logHelpers";
import { decodeBinaryCookies } from "../decodeBinaryCookies";

// Mock fs module
jest.mock("fs", () => ({
  readFileSync: jest.fn(),
}));

// Mock logHelpers
jest.mock("../../../utils/logHelpers", () => ({
  logWarn: jest.fn(),
}));

function createTestBuffer(): Buffer {
  const buffer = Buffer.alloc(300);

  // File header
  buffer.write("cook", 0);
  buffer.writeUInt32BE(1, 4); // One page
  buffer.writeUInt32BE(200, 8); // Page size

  // Page header
  buffer.write("100Y", 12); // First 4 bytes of page header
  buffer.write("\0", 16); // Fifth byte
  buffer.writeUInt32BE(32, 17); // Header length (32 bytes)
  buffer.writeUInt32BE(2, 21); // Two cookies
  buffer.writeUInt32BE(44, 25); // First cookie offset
  buffer.writeUInt32BE(120, 29); // Second cookie offset

  // First cookie
  let cookieOffset = 44;
  buffer.writeUInt32LE(76, cookieOffset); // Cookie size
  buffer.writeUInt32LE(1, cookieOffset + 4); // Version
  buffer.writeUInt32LE(1, cookieOffset + 8); // Flags (SECURE)
  buffer.writeUInt32LE(0, cookieOffset + 12); // No port

  // First cookie string offsets (relative to cookie start)
  buffer.writeUInt32LE(56, cookieOffset + 16); // URL offset
  buffer.writeUInt32LE(70, cookieOffset + 20); // Name offset
  buffer.writeUInt32LE(80, cookieOffset + 24); // Path offset
  buffer.writeUInt32LE(85, cookieOffset + 28); // Value offset
  buffer.writeUInt32LE(0, cookieOffset + 32); // Comment offset
  buffer.writeUInt32LE(0, cookieOffset + 36); // CommentURL offset

  // First cookie dates
  const now = Math.floor(Date.now() / 1000) - 978307200;
  buffer.writeDoubleLE(now + 86400, cookieOffset + 40); // Expiry
  buffer.writeDoubleLE(now, cookieOffset + 48); // Creation

  // First cookie strings
  buffer.write(".example.com\0", cookieOffset + 56);
  buffer.write("session-id\0", cookieOffset + 70);
  buffer.write("/\0", cookieOffset + 80);
  buffer.write("abc123\0", cookieOffset + 85);

  // Second cookie
  cookieOffset = 120;
  buffer.writeUInt32LE(76, cookieOffset); // Cookie size
  buffer.writeUInt32LE(1, cookieOffset + 4); // Version
  buffer.writeUInt32LE(4, cookieOffset + 8); // Flags (HTTP_ONLY)
  buffer.writeUInt32LE(0, cookieOffset + 12); // No port

  // Second cookie string offsets (relative to cookie start)
  buffer.writeUInt32LE(56, cookieOffset + 16); // URL offset
  buffer.writeUInt32LE(70, cookieOffset + 20); // Name offset
  buffer.writeUInt32LE(80, cookieOffset + 24); // Path offset
  buffer.writeUInt32LE(85, cookieOffset + 28); // Value offset
  buffer.writeUInt32LE(0, cookieOffset + 32); // Comment offset
  buffer.writeUInt32LE(0, cookieOffset + 36); // CommentURL offset

  // Second cookie dates
  buffer.writeDoubleLE(now + 86400, cookieOffset + 40); // Expiry
  buffer.writeDoubleLE(now, cookieOffset + 48); // Creation

  // Second cookie strings
  buffer.write(".example.org\0", cookieOffset + 56);
  buffer.write("auth-token\0", cookieOffset + 70);
  buffer.write("/api/v1\0", cookieOffset + 80);
  buffer.write("xyz789\0", cookieOffset + 85);

  // Footer
  buffer.writeUInt32BE(0x28, 292); // Safari 14+ footer value
  buffer.writeUInt32BE(0x00, 296);

  return buffer;
}

describe("decodeBinaryCookies - Multiple Cookies Parsing", () => {
  const mockReadFileSync = readFileSync as jest.MockedFunction<
    typeof readFileSync
  >;
  const mockLogWarn = logWarn as jest.MockedFunction<typeof logWarn>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should handle multiple cookies in a page", () => {
    const buffer = createTestBuffer();
    mockReadFileSync.mockReturnValue(buffer);

    const cookies = decodeBinaryCookies("/path/to/cookies.binarycookies");
    expect(cookies).toHaveLength(2);
    expect(cookies[0]).toMatchObject({
      name: "session-id",
      value: "abc123",
      domain: "example.com",
      path: "/",
      flags: 1,
    });
    expect(cookies[1]).toMatchObject({
      name: "auth-token",
      value: "xyz789",
      domain: "example.org",
      path: "/api/v1",
      flags: 4,
    });
  });

  it("should return cookies even with invalid footer", () => {
    const buffer = createTestBuffer();
    // Corrupt the footer
    buffer.writeUInt32BE(0x00, 292);
    buffer.writeUInt32BE(0x00, 296);
    mockReadFileSync.mockReturnValue(buffer);

    const cookies = decodeBinaryCookies("/path/to/cookies.binarycookies");
    expect(cookies).toHaveLength(2);
    expect(mockLogWarn).toHaveBeenCalledWith(
      "BinaryCookies",
      "Invalid cookie file format: wrong footer",
    );
  });
});

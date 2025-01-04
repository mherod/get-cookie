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
  buffer.writeUInt32BE(280, 8); // Page size (increased to accommodate both cookies)

  // Page header (20 bytes total)
  buffer.write("100Y", 12); // First 4 bytes of page header
  buffer.write("\0", 16); // Fifth byte
  buffer.writeUInt32BE(20, 17); // Header length (20 bytes)
  buffer.writeUInt32BE(2, 21); // Two cookies
  buffer.writeUInt32BE(32, 25); // First cookie offset
  buffer.writeUInt32BE(108, 29); // Second cookie offset

  // First cookie
  let cookieOffset = 32;
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
  buffer.write("https://example.com\0", cookieOffset + 56);
  buffer.write("session-id\0", cookieOffset + 70);
  buffer.write("/\0", cookieOffset + 80);
  buffer.write("abc123\0", cookieOffset + 85);

  // Second cookie
  cookieOffset = 108;
  buffer.writeUInt32LE(76, cookieOffset); // Cookie size
  buffer.writeUInt32LE(1, cookieOffset + 4); // Version
  buffer.writeUInt32LE(5, cookieOffset + 8); // Flags (SECURE + HTTP_ONLY)
  buffer.writeUInt32LE(0, cookieOffset + 12); // No port

  // Second cookie string offsets
  buffer.writeUInt32LE(56, cookieOffset + 16); // URL offset
  buffer.writeUInt32LE(70, cookieOffset + 20); // Name offset
  buffer.writeUInt32LE(80, cookieOffset + 24); // Path offset
  buffer.writeUInt32LE(85, cookieOffset + 28); // Value offset
  buffer.writeUInt32LE(0, cookieOffset + 32); // Comment offset
  buffer.writeUInt32LE(0, cookieOffset + 36); // CommentURL offset

  // Second cookie dates
  buffer.writeDoubleLE(now + 172800, cookieOffset + 40); // Expiry
  buffer.writeDoubleLE(now, cookieOffset + 48); // Creation

  // Second cookie strings
  buffer.write("https://example.com\0", cookieOffset + 56);
  buffer.write("auth-token\0", cookieOffset + 70);
  buffer.write("/api\0", cookieOffset + 80);
  buffer.write("xyz789\0", cookieOffset + 85);

  // Footer
  buffer.writeUInt32LE(0x28, buffer.length - 4);

  return buffer;
}

describe("decodeBinaryCookies - Multiple Cookies Parsing", () => {
  const mockReadFileSync = readFileSync as jest.MockedFunction<
    typeof readFileSync
  >;
  const mockLogWarn = logWarn as jest.MockedFunction<typeof logWarn>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReadFileSync.mockReturnValue(createTestBuffer());
  });

  it("should handle multiple cookies in a page", () => {
    const cookies = decodeBinaryCookies("/path/to/cookies.binarycookies");
    expect(cookies).toHaveLength(2);
    expect(cookies[0]).toMatchObject({
      name: "session-id",
      value: "abc123",
      domain: "example.com",
      path: "/",
      isSecure: true,
      isHttpOnly: false,
    });
    expect(cookies[1]).toMatchObject({
      name: "auth-token",
      value: "xyz789",
      domain: "example.com",
      path: "/api",
      isSecure: true,
      isHttpOnly: true,
    });
  });

  it("should return cookies even with invalid footer", () => {
    const invalidFooterBuffer = createTestBuffer();
    invalidFooterBuffer.writeUInt32LE(0x29, invalidFooterBuffer.length - 4); // Wrong footer value
    mockReadFileSync.mockReturnValue(invalidFooterBuffer);

    const cookies = decodeBinaryCookies("/path/to/cookies.binarycookies");
    expect(cookies).toHaveLength(2);
    expect(mockLogWarn).toHaveBeenCalledWith(
      "BinaryCookies",
      "Invalid cookie file format: wrong footer",
    );
  });
});

import { readFileSync } from "fs";

import { decodeBinaryCookies } from "../decodeBinaryCookies";

// Mock fs module
jest.mock("fs", () => ({
  readFileSync: jest.fn(),
}));

function createTestBuffer(): Buffer {
  const buffer = Buffer.alloc(200);

  // File header
  buffer.write("cook", 0);
  buffer.writeUInt32BE(1, 4); // One page
  buffer.writeUInt32BE(180, 8); // Page size

  // Page header
  buffer.write("100Y", 12);
  buffer.write("\0", 16);
  buffer.writeUInt32BE(20, 17); // Header length
  buffer.writeUInt32BE(1, 21); // One cookie
  buffer.writeUInt32BE(32, 25); // Cookie offset

  // Cookie header
  const cookieOffset = 32;
  buffer.writeUInt32LE(76, cookieOffset); // Cookie size
  buffer.writeUInt32LE(1, cookieOffset + 4); // Version
  buffer.writeUInt32LE(5, cookieOffset + 8); // Flags (SECURE + HTTP_ONLY)
  buffer.writeUInt32LE(0, cookieOffset + 12); // No port

  // Cookie string offsets
  buffer.writeUInt32LE(56, cookieOffset + 16); // URL offset
  buffer.writeUInt32LE(70, cookieOffset + 20); // Name offset
  buffer.writeUInt32LE(80, cookieOffset + 24); // Path offset
  buffer.writeUInt32LE(85, cookieOffset + 28); // Value offset
  buffer.writeUInt32LE(0, cookieOffset + 32); // Comment offset
  buffer.writeUInt32LE(0, cookieOffset + 36); // CommentURL offset

  // Cookie dates
  const now = Math.floor(Date.now() / 1000) - 978307200;
  buffer.writeDoubleLE(now + 86400, cookieOffset + 40); // Expiry
  buffer.writeDoubleLE(now, cookieOffset + 48); // Creation

  // Cookie strings
  buffer.write("https://example.com\0", cookieOffset + 56);
  buffer.write("session-id\0", cookieOffset + 70);
  buffer.write("/\0", cookieOffset + 80);
  buffer.write("abc123\0", cookieOffset + 85);

  // Footer
  buffer.writeUInt32LE(0x28, buffer.length - 4);

  return buffer;
}

describe("decodeBinaryCookies - Single Cookie Parsing", () => {
  const mockReadFileSync = readFileSync as jest.MockedFunction<
    typeof readFileSync
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReadFileSync.mockReturnValue(createTestBuffer());
  });

  it("should decode a single cookie with all fields", () => {
    const cookies = decodeBinaryCookies("/path/to/cookies.binarycookies");
    expect(cookies).toHaveLength(1);

    const cookie = cookies[0];
    expect(cookie).toMatchObject({
      name: "session-id",
      value: "abc123",
      domain: "example.com",
      path: "/",
      isSecure: true,
      isHttpOnly: true,
    });
  });
});

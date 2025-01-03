import { readFileSync } from "fs";

import { BinaryCookieRowSchema } from "../../../types/schemas";
import { decodeBinaryCookies } from "../decodeBinaryCookies";

// Mock fs module
jest.mock("fs", () => ({
  readFileSync: jest.fn(),
}));

describe("decodeBinaryCookies - Single Cookie Parsing", () => {
  const mockReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should decode a single cookie with all fields", () => {
    // Create a buffer for a single cookie page
    const buffer = Buffer.alloc(200);

    // File header
    buffer.write("cook"); // Magic
    buffer.writeUInt32BE(1, 4); // One page
    buffer.writeUInt32BE(100, 8); // Page size

    // Page header (starting at offset 12)
    buffer.write("100Y", 12); // Page magic
    buffer.writeUInt32BE(32, 17); // Header size (5 + this value)

    // Cookie header (starting at offset 44)
    buffer.writeUInt32LE(56, 44); // Cookie size
    buffer.writeUInt32LE(1, 48); // Version
    buffer.writeUInt32LE(5, 52); // Flags (SECURE | HTTP_ONLY)
    buffer.writeUInt32LE(0, 56); // No port

    // String offsets
    const baseOffset = 44; // Start of cookie
    buffer.writeUInt32LE(56, baseOffset + 16); // URL offset
    buffer.writeUInt32LE(70, baseOffset + 20); // Name offset
    buffer.writeUInt32LE(80, baseOffset + 24); // Path offset
    buffer.writeUInt32LE(85, baseOffset + 28); // Value offset

    // Dates
    const now = Math.floor(Date.now() / 1000) - 978307200;
    buffer.writeDoubleLE(now + 86400, baseOffset + 40); // Expiry (tomorrow)
    buffer.writeDoubleLE(now, baseOffset + 48); // Creation (now)

    // Strings
    buffer.write(".example.com\0", baseOffset + 56);
    buffer.write("sessionId\0", baseOffset + 70);
    buffer.write("/\0", baseOffset + 80);
    buffer.write("abc123\0", baseOffset + 85);

    // Footer
    buffer.writeBigUInt64BE(BigInt("510912288576766000"), 192);

    mockReadFileSync.mockReturnValue(buffer);

    const cookies = decodeBinaryCookies("/path/to/cookies.binarycookies");
    expect(cookies).toHaveLength(1);

    const cookie = cookies[0];
    expect(cookie).toMatchObject({
      name: "sessionId",
      value: "abc123",
      domain: "example.com",
      path: "/",
      flags: 5,
      version: 1
    });

    // Validate schema
    expect(() => BinaryCookieRowSchema.parse(cookie)).not.toThrow();
  });
});

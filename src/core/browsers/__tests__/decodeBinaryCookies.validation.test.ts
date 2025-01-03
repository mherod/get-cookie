import { readFileSync } from "fs";

import { decodeBinaryCookies } from "../decodeBinaryCookies";

// Mock fs module
jest.mock("fs", () => ({
  readFileSync: jest.fn(),
}));

describe("decodeBinaryCookies - File Validation", () => {
  const mockReadFileSync = readFileSync as jest.MockedFunction<
    typeof readFileSync
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should handle empty cookie file", () => {
    // Create a buffer with the correct size to include footer
    const buffer = Buffer.alloc(20);
    buffer.write("cook"); // Magic
    buffer.writeUInt32BE(0, 4); // No pages
    buffer.writeUInt32BE(20, 8); // File size
    // Write the expected footer value
    buffer.writeUInt32BE(0x28, 12); // Safari 14+ footer value
    buffer.writeUInt32BE(0x00, 16);

    mockReadFileSync.mockReturnValue(buffer);

    const cookies = decodeBinaryCookies("/path/to/cookies.binarycookies");
    expect(cookies).toEqual([]);
  });

  it("should handle file read errors", () => {
    mockReadFileSync.mockImplementation(() => {
      throw new Error("Failed to read file");
    });

    expect(() => {
      decodeBinaryCookies("/path/to/cookies.binarycookies");
    }).toThrow("Failed to read file");
  });

  it("should handle different footer values gracefully", () => {
    const buffer = Buffer.alloc(20);
    buffer.write("cook"); // Magic
    buffer.writeUInt32BE(0, 4); // No pages
    buffer.writeUInt32BE(20, 8); // File size
    buffer.writeBigUInt64BE(BigInt(12), 12); // Different footer value

    mockReadFileSync.mockReturnValue(buffer);

    // Should not throw and should process the file despite footer mismatch
    const cookies = decodeBinaryCookies("/path/to/cookies.binarycookies");
    expect(cookies).toEqual([]);
  });

  it("should throw on invalid footer value", () => {
    const buffer = Buffer.alloc(20);
    buffer.write("cook"); // Magic
    buffer.writeUInt32BE(0, 4); // No pages
    buffer.writeUInt32BE(20, 8); // File size
    buffer.writeBigUInt64BE(BigInt(12), 12); // Different footer value

    mockReadFileSync.mockReturnValue(buffer);

    expect(() => {
      decodeBinaryCookies("/path/to/cookies.binarycookies");
    }).toThrow("Invalid cookie file format: wrong footer");
  });

  it("should throw on invalid magic header", () => {
    const buffer = Buffer.alloc(20);
    buffer.write("invalid"); // Wrong magic
    mockReadFileSync.mockReturnValue(buffer);

    expect(() => {
      decodeBinaryCookies("/path/to/cookies.binarycookies");
    }).toThrow("Invalid cookie file format: wrong magic header");
  });
});

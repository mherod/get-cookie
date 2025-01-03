import { readFileSync } from "fs";

import { decodeBinaryCookies } from "../decodeBinaryCookies";

// Mock fs module
jest.mock("fs", () => ({
  readFileSync: jest.fn(),
}));

describe("decodeBinaryCookies", () => {
  const mockReadFileSync = readFileSync as jest.MockedFunction<
    typeof readFileSync
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should handle empty cookie file", () => {
    const buffer = Buffer.alloc(12);
    buffer.write("cook"); // Magic
    buffer.writeUInt32BE(0, 4); // No pages
    buffer.writeUInt32BE(12, 8); // File size

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
});

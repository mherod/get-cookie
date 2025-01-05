import { decodeBuffer } from "../../bufferUtils";

describe("decodeBuffer - error handling", () => {
  it("should fallback to hex for invalid UTF-8", () => {
    // Create an invalid UTF-8 sequence
    const input = Buffer.from([0xff, 0xfe, 0xfd]);
    const result = decodeBuffer(input);
    expect(result).toBe("fffefd");
  });

  it("should fallback to hex for buffer with replacement characters", () => {
    // Create a buffer with the replacement character
    const input = Buffer.from([0xef, 0xbf, 0xbd]);
    const result = decodeBuffer(input);
    expect(result).toBe("efbfbd");
  });

  it("should handle repeated replacement characters", () => {
    const input = Buffer.from([
      0xef,
      0xbf,
      0xbd, // Replacement character
      0x20, // Space
      0xef,
      0xbf,
      0xbd, // Another replacement character
    ]);
    const result = decodeBuffer(input);
    expect(result).toBe("efbfbd20efbfbd");
  });

  it("should handle incomplete UTF-8 sequences", () => {
    // Start of a 3-byte UTF-8 sequence but missing bytes
    const input = Buffer.from([0xe2, 0x82]);
    const result = decodeBuffer(input);
    expect(result).toBe("e282");
  });

  it("should handle overlong UTF-8 sequences", () => {
    // Overlong encoding of ASCII character 'A'
    const input = Buffer.from([0xc1, 0x81]);
    const result = decodeBuffer(input);
    expect(result).toBe("c181");
  });

  it("should handle mixed valid and invalid UTF-8", () => {
    // Mix of valid ASCII and invalid UTF-8
    const input = Buffer.concat([
      Buffer.from("Hello", "utf8"),
      Buffer.from([0xff]),
      Buffer.from("World", "utf8"),
    ]);
    const result = decodeBuffer(input);
    expect(result).toBe("48656c6c6fff576f726c64"); // "HelloWorld" in hex
  });
});

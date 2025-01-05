import { decodeBuffer } from "../../bufferUtils";

describe("decodeBuffer - binary handling", () => {
  it("should handle binary data", () => {
    const input = Buffer.from([0x00, 0x01, 0x02, 0x03]);
    const result = decodeBuffer(input);
    expect(result).toBe("00010203");
  });

  it("should handle control characters as binary", () => {
    const input = Buffer.from([0x1b, 0x07, 0x00]); // ESC, BEL, NUL
    const result = decodeBuffer(input);
    expect(result).toBe("1b0700");
  });

  it("should handle large binary data", () => {
    const input = Buffer.from(Array.from({ length: 256 }, (_, i) => i));
    const result = decodeBuffer(input);
    expect(result).toMatch(/^[0-9a-f]+$/);
    expect(result.length).toBe(512); // Each byte becomes 2 hex chars
  });

  it("should handle very large binary data", () => {
    const size = 1000000;
    const input = Buffer.from(Array.from({ length: size }, (_, i) => i % 256));
    const result = decodeBuffer(input);
    expect(result).toMatch(/^[0-9a-f]+$/);
    expect(result.length).toBe(size * 2); // Each byte becomes 2 hex chars
  });

  it("should handle mixed text and control characters", () => {
    const input = Buffer.concat([
      Buffer.from("Start"),
      Buffer.from([0x1b]), // ESC
      Buffer.from("Middle"),
      Buffer.from([0x00]), // NUL
      Buffer.from("End"),
    ]);
    const result = decodeBuffer(input);
    // Should be hex since it contains control characters
    expect(result).toBe("5374617274" + "1b" + "4d6964646c65" + "00" + "456e64");
  });
});

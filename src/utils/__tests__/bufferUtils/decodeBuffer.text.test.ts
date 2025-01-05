import { decodeBuffer } from "../../bufferUtils";

describe("decodeBuffer - text handling", () => {
  it("should decode valid UTF-8 buffer", () => {
    const input = Buffer.from("Hello, world!", "utf8");
    const result = decodeBuffer(input);
    expect(result).toBe("Hello, world!");
  });

  it("should handle empty buffer", () => {
    const input = Buffer.from([]);
    const result = decodeBuffer(input);
    expect(result).toBe("");
  });

  it("should handle various whitespace characters", () => {
    const input = Buffer.from("Line 1\nLine 2\tTabbed\rCarriage Return");
    const result = decodeBuffer(input);
    expect(result).toBe("Line 1\nLine 2\tTabbed\rCarriage Return");
  });

  it("should handle multi-byte UTF-8 characters", () => {
    const input = Buffer.from("Hello 世界!", "utf8");
    const result = decodeBuffer(input);
    expect(result).toBe("Hello 世界!");
  });

  it("should handle zero-width characters", () => {
    const input = Buffer.from("a\u200Bb\u200Cc\u200Dd", "utf8");
    const result = decodeBuffer(input);
    expect(result).toBe("a\u200Bb\u200Cc\u200Dd");
  });

  it("should handle emoji characters", () => {
    const input = Buffer.from("Hello 👋 World 🌍!", "utf8");
    const result = decodeBuffer(input);
    expect(result).toBe("Hello 👋 World 🌍!");
  });

  it("should handle combining characters", () => {
    const input = Buffer.from("e\u0301", "utf8"); // é using combining acute accent
    const result = decodeBuffer(input);
    expect(result).toBe("e\u0301");
  });

  it("should handle surrogate pairs", () => {
    const input = Buffer.from("🌈", "utf8");
    const result = decodeBuffer(input);
    expect(result).toBe("🌈");
  });

  it("should handle UTF-8 byte order mark (BOM)", () => {
    const input = Buffer.concat([
      Buffer.from([0xef, 0xbb, 0xbf]), // BOM
      Buffer.from("Hello", "utf8"),
    ]);
    const result = decodeBuffer(input);
    expect(result).toBe("\uFEFFHello");
  });
});

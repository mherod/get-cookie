import { toBuffer } from "../../bufferUtils";

describe("toBuffer - basic types", () => {
  it("should handle existing Buffer input", () => {
    const input = Buffer.from("test");
    const result = toBuffer(input);
    expect(result).toBe(input);
  });

  it("should handle string input", () => {
    const input = "test";
    const result = toBuffer(input);
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.toString()).toBe("test");
  });

  it("should handle string with special characters", () => {
    const input = "Hello 世界!";
    const result = toBuffer(input);
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.toString()).toBe("Hello 世界!");
  });

  it("should handle number input", () => {
    const input = 123;
    const result = toBuffer(input);
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.toString()).toBe("123");
  });

  it("should handle null input", () => {
    const input = null;
    const result = toBuffer(input);
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.toString()).toBe("null");
  });

  it("should handle undefined input", () => {
    const input = undefined;
    const result = toBuffer(input);
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.toString()).toBe("undefined");
  });

  it("should handle object input", () => {
    const input = { test: "value" };
    const result = toBuffer(input);
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.toString()).toBe("[object Object]");
  });

  it("should handle symbols", () => {
    const input = Symbol("test");
    const result = toBuffer(input);
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.toString()).toBe("Symbol(test)");
  });
});

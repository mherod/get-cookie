import {
  BinaryParsingError,
  CookieExtractionError,
  isBinaryParsingError,
} from "../errors";

describe("BinaryParsingError", () => {
  it("should create error with correct properties", () => {
    const context = { bufferLength: 1024 };
    const error = new BinaryParsingError(
      "Parsing failed",
      "Safari",
      0x42,
      context,
    );

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(CookieExtractionError);
    expect(error).toBeInstanceOf(BinaryParsingError);
    expect(error.name).toBe("BinaryParsingError");
    expect(error.message).toBe("Parsing failed");
    expect(error.browser).toBe("Safari");
    expect(error.offset).toBe(0x42);
    expect(error.context).toEqual({
      ...context,
      offset: 0x42,
    });
  });

  it("should include offset in context", () => {
    const error = new BinaryParsingError("Failed", "Safari", 256);

    expect(error.context.offset).toBe(256);
    expect(error.offset).toBe(256);
  });

  it("should be correctly identified by type guard", () => {
    const error = new BinaryParsingError("Test", "Safari", 123);
    const regularError = new Error("Regular error");

    expect(isBinaryParsingError(error)).toBe(true);
    expect(isBinaryParsingError(regularError)).toBe(false);
  });

  it("should maintain proper inheritance", () => {
    const error = new BinaryParsingError("Test", "Safari", 123);

    expect(error instanceof BinaryParsingError).toBe(true);
    expect(error instanceof CookieExtractionError).toBe(true);
    expect(error instanceof Error).toBe(true);
  });
});

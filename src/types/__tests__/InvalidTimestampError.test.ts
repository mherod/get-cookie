import {
  CookieExtractionError,
  InvalidTimestampError,
  isInvalidTimestampError,
} from "../errors";

describe("InvalidTimestampError", () => {
  it("should create error with correct properties", () => {
    const expectedRange = { min: 0, max: 1000000000 };
    const context = { cookieName: "session" };
    const error = new InvalidTimestampError(
      "Invalid timestamp",
      "Safari",
      -123456789,
      expectedRange,
      context,
    );

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(CookieExtractionError);
    expect(error).toBeInstanceOf(InvalidTimestampError);
    expect(error.name).toBe("InvalidTimestampError");
    expect(error.message).toBe("Invalid timestamp");
    expect(error.browser).toBe("Safari");
    expect(error.timestamp).toBe(-123456789);
    expect(error.expectedRange).toEqual(expectedRange);
    expect(error.context).toEqual({
      ...context,
      timestamp: -123456789,
      expectedRange: expectedRange,
    });
  });

  it("should include timestamp and expectedRange in context", () => {
    const expectedRange = { min: 100, max: 200 };
    const error = new InvalidTimestampError(
      "Invalid",
      "Safari",
      50,
      expectedRange,
    );

    expect(error.context.timestamp).toBe(50);
    expect(error.context.expectedRange).toEqual(expectedRange);
    expect(error.timestamp).toBe(50);
    expect(error.expectedRange).toEqual(expectedRange);
  });

  it("should be correctly identified by type guard", () => {
    const error = new InvalidTimestampError("Test", "Safari", 123, {
      min: 0,
      max: 1000,
    });
    const regularError = new Error("Regular error");

    expect(isInvalidTimestampError(error)).toBe(true);
    expect(isInvalidTimestampError(regularError)).toBe(false);
  });

  it("should maintain proper inheritance", () => {
    const error = new InvalidTimestampError("Test", "Safari", 123, {
      min: 0,
      max: 1000,
    });

    expect(error instanceof InvalidTimestampError).toBe(true);
    expect(error instanceof CookieExtractionError).toBe(true);
    expect(error instanceof Error).toBe(true);
  });
});

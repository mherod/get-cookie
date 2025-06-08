import { CookieExtractionError, isCookieExtractionError } from "../errors";

describe("CookieExtractionError", () => {
  it("should create error with correct properties", () => {
    const context = { profilePath: "/path/to/profile" };
    const error = new CookieExtractionError("Test error", "Chrome", context);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(CookieExtractionError);
    expect(error.name).toBe("CookieExtractionError");
    expect(error.message).toBe("Test error");
    expect(error.browser).toBe("Chrome");
    expect(error.context).toEqual(context);
  });

  it("should create error with empty context when not provided", () => {
    const error = new CookieExtractionError("Test error", "Firefox");

    expect(error.context).toEqual({});
    expect(error.browser).toBe("Firefox");
    expect(error.message).toBe("Test error");
  });

  it("should be correctly identified by type guard", () => {
    const error = new CookieExtractionError("Test", "Chrome");
    const regularError = new Error("Regular error");

    expect(isCookieExtractionError(error)).toBe(true);
    expect(isCookieExtractionError(regularError)).toBe(false);
    expect(isCookieExtractionError(null)).toBe(false);
    expect(isCookieExtractionError(undefined)).toBe(false);
    expect(isCookieExtractionError("string")).toBe(false);
  });
});

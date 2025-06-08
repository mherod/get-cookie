import {
  BrowserLockError,
  CookieExtractionError,
  isBrowserLockError,
} from "../errors";

describe("BrowserLockError", () => {
  it("should create error with correct properties", () => {
    const context = { processCount: 2 };
    const error = new BrowserLockError(
      "Database locked",
      "/path/to/cookies.sqlite",
      "Firefox",
      context,
    );

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(CookieExtractionError);
    expect(error).toBeInstanceOf(BrowserLockError);
    expect(error.name).toBe("BrowserLockError");
    expect(error.message).toBe("Database locked");
    expect(error.browser).toBe("Firefox");
    expect(error.filePath).toBe("/path/to/cookies.sqlite");
    expect(error.context).toEqual({
      ...context,
      filePath: "/path/to/cookies.sqlite",
    });
  });

  it("should include filePath in context", () => {
    const error = new BrowserLockError(
      "Database locked",
      "/test/path",
      "Chrome",
    );

    expect(error.context.filePath).toBe("/test/path");
    expect(error.filePath).toBe("/test/path");
  });

  it("should be correctly identified by type guard", () => {
    const error = new BrowserLockError("Test", "/path", "Chrome");
    const regularError = new Error("Regular error");

    expect(isBrowserLockError(error)).toBe(true);
    expect(isBrowserLockError(regularError)).toBe(false);
  });

  it("should maintain proper inheritance", () => {
    const error = new BrowserLockError("Test", "/path", "Chrome");

    expect(error instanceof BrowserLockError).toBe(true);
    expect(error instanceof CookieExtractionError).toBe(true);
    expect(error instanceof Error).toBe(true);
  });
});

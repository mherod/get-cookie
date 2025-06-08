import {
  CookieExtractionError,
  BrowserLockError,
  DecryptionError,
  InvalidTimestampError,
  BinaryParsingError,
  isCookieExtractionError,
  isBrowserLockError,
  isDecryptionError,
  isInvalidTimestampError,
  isBinaryParsingError,
} from "../errors";

describe("Custom Error Types", () => {
  describe("CookieExtractionError", () => {
    it("should create error with correct properties", () => {
      const context = { profilePath: "/path/to/profile" };
      const error = new CookieExtractionError(
        "Test error",
        "Chrome",
        context
      );

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
    });
  });

  describe("BrowserLockError", () => {
    it("should create error with correct properties", () => {
      const filePath = "/path/to/cookies.sqlite";
      const context = { processCount: 2 };
      const error = new BrowserLockError(
        "Database locked",
        filePath,
        "Firefox",
        context
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(CookieExtractionError);
      expect(error).toBeInstanceOf(BrowserLockError);
      expect(error.name).toBe("BrowserLockError");
      expect(error.message).toBe("Database locked");
      expect(error.browser).toBe("Firefox");
      expect(error.filePath).toBe(filePath);
      expect(error.context).toEqual({ ...context, filePath });
    });

    it("should include filePath in context", () => {
      const filePath = "/path/to/cookies.sqlite";
      const error = new BrowserLockError("Database locked", filePath, "Firefox");

      expect(error.context.filePath).toBe(filePath);
    });
  });

  describe("DecryptionError", () => {
    it("should create error with correct properties", () => {
      const encryptionType = "AES-128-CBC";
      const context = { keySource: "keychain" };
      const error = new DecryptionError(
        "Decryption failed",
        "Chrome",
        encryptionType,
        context
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(CookieExtractionError);
      expect(error).toBeInstanceOf(DecryptionError);
      expect(error.name).toBe("DecryptionError");
      expect(error.message).toBe("Decryption failed");
      expect(error.browser).toBe("Chrome");
      expect(error.encryptionType).toBe(encryptionType);
      expect(error.context).toEqual({ ...context, encryptionType });
    });

    it("should include encryptionType in context", () => {
      const encryptionType = "AES-256-GCM";
      const error = new DecryptionError("Decryption failed", "Chrome", encryptionType);

      expect(error.context.encryptionType).toBe(encryptionType);
    });
  });

  describe("InvalidTimestampError", () => {
    it("should create error with correct properties", () => {
      const timestamp = -123456;
      const expectedRange = { min: 0, max: 1000000000 };
      const context = { cookieName: "session" };
      const error = new InvalidTimestampError(
        "Invalid timestamp",
        "Safari",
        timestamp,
        expectedRange,
        context
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(CookieExtractionError);
      expect(error).toBeInstanceOf(InvalidTimestampError);
      expect(error.name).toBe("InvalidTimestampError");
      expect(error.message).toBe("Invalid timestamp");
      expect(error.browser).toBe("Safari");
      expect(error.timestamp).toBe(timestamp);
      expect(error.expectedRange).toEqual(expectedRange);
      expect(error.context).toEqual({ ...context, timestamp, expectedRange });
    });

    it("should include timestamp and expectedRange in context", () => {
      const timestamp = 999999999999;
      const expectedRange = { min: 0, max: 1000000000 };
      const error = new InvalidTimestampError(
        "Invalid timestamp",
        "Safari",
        timestamp,
        expectedRange
      );

      expect(error.context.timestamp).toBe(timestamp);
      expect(error.context.expectedRange).toEqual(expectedRange);
    });
  });

  describe("BinaryParsingError", () => {
    it("should create error with correct properties", () => {
      const offset = 0x42;
      const context = { bufferLength: 1024 };
      const error = new BinaryParsingError(
        "Parsing failed",
        "Safari",
        offset,
        context
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(CookieExtractionError);
      expect(error).toBeInstanceOf(BinaryParsingError);
      expect(error.name).toBe("BinaryParsingError");
      expect(error.message).toBe("Parsing failed");
      expect(error.browser).toBe("Safari");
      expect(error.offset).toBe(offset);
      expect(error.context).toEqual({ ...context, offset });
    });

    it("should include offset in context", () => {
      const offset = 128;
      const error = new BinaryParsingError("Parsing failed", "Safari", offset);

      expect(error.context.offset).toBe(offset);
    });
  });

  describe("Type Guards", () => {
    it("should correctly identify CookieExtractionError", () => {
      const error = new CookieExtractionError("Test", "Chrome");
      const regularError = new Error("Regular error");

      expect(isCookieExtractionError(error)).toBe(true);
      expect(isCookieExtractionError(regularError)).toBe(false);
      expect(isCookieExtractionError(null)).toBe(false);
      expect(isCookieExtractionError(undefined)).toBe(false);
    });

    it("should correctly identify BrowserLockError", () => {
      const error = new BrowserLockError("Locked", "/path", "Firefox");
      const baseError = new CookieExtractionError("Test", "Chrome");

      expect(isBrowserLockError(error)).toBe(true);
      expect(isBrowserLockError(baseError)).toBe(false);
      expect(isBrowserLockError(new Error("Regular"))).toBe(false);
    });

    it("should correctly identify DecryptionError", () => {
      const error = new DecryptionError("Failed", "Chrome", "AES");
      const baseError = new CookieExtractionError("Test", "Chrome");

      expect(isDecryptionError(error)).toBe(true);
      expect(isDecryptionError(baseError)).toBe(false);
      expect(isDecryptionError(new Error("Regular"))).toBe(false);
    });

    it("should correctly identify InvalidTimestampError", () => {
      const error = new InvalidTimestampError("Invalid", "Safari", 123, { min: 0, max: 100 });
      const baseError = new CookieExtractionError("Test", "Chrome");

      expect(isInvalidTimestampError(error)).toBe(true);
      expect(isInvalidTimestampError(baseError)).toBe(false);
      expect(isInvalidTimestampError(new Error("Regular"))).toBe(false);
    });

    it("should correctly identify BinaryParsingError", () => {
      const error = new BinaryParsingError("Failed", "Safari", 64);
      const baseError = new CookieExtractionError("Test", "Chrome");

      expect(isBinaryParsingError(error)).toBe(true);
      expect(isBinaryParsingError(baseError)).toBe(false);
      expect(isBinaryParsingError(new Error("Regular"))).toBe(false);
    });
  });

  describe("Inheritance Chain", () => {
    it("should maintain proper inheritance for BrowserLockError", () => {
      const error = new BrowserLockError("Locked", "/path", "Firefox");

      expect(error instanceof Error).toBe(true);
      expect(error instanceof CookieExtractionError).toBe(true);
      expect(error instanceof BrowserLockError).toBe(true);
    });

    it("should maintain proper inheritance for DecryptionError", () => {
      const error = new DecryptionError("Failed", "Chrome", "AES");

      expect(error instanceof Error).toBe(true);
      expect(error instanceof CookieExtractionError).toBe(true);
      expect(error instanceof DecryptionError).toBe(true);
    });

    it("should maintain proper inheritance for InvalidTimestampError", () => {
      const error = new InvalidTimestampError("Invalid", "Safari", 123, { min: 0, max: 100 });

      expect(error instanceof Error).toBe(true);
      expect(error instanceof CookieExtractionError).toBe(true);
      expect(error instanceof InvalidTimestampError).toBe(true);
    });

    it("should maintain proper inheritance for BinaryParsingError", () => {
      const error = new BinaryParsingError("Failed", "Safari", 64);

      expect(error instanceof Error).toBe(true);
      expect(error instanceof CookieExtractionError).toBe(true);
      expect(error instanceof BinaryParsingError).toBe(true);
    });
  });
});
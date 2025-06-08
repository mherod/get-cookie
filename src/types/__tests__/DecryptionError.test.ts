import {
  CookieExtractionError,
  DecryptionError,
  isDecryptionError,
} from "../errors";

describe("DecryptionError", () => {
  it("should create error with correct properties", () => {
    const context = { keySource: "keychain" };
    const error = new DecryptionError(
      "Decryption failed",
      "Chrome",
      "AES-128-CBC",
      context,
    );

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(CookieExtractionError);
    expect(error).toBeInstanceOf(DecryptionError);
    expect(error.name).toBe("DecryptionError");
    expect(error.message).toBe("Decryption failed");
    expect(error.browser).toBe("Chrome");
    expect(error.encryptionType).toBe("AES-128-CBC");
    expect(error.context).toEqual({
      ...context,
      encryptionType: "AES-128-CBC",
    });
  });

  it("should include encryptionType in context", () => {
    const error = new DecryptionError("Failed", "Chrome", "AES-256-GCM");

    expect(error.context.encryptionType).toBe("AES-256-GCM");
    expect(error.encryptionType).toBe("AES-256-GCM");
  });

  it("should be correctly identified by type guard", () => {
    const error = new DecryptionError("Test", "Chrome", "AES");
    const regularError = new Error("Regular error");

    expect(isDecryptionError(error)).toBe(true);
    expect(isDecryptionError(regularError)).toBe(false);
  });

  it("should maintain proper inheritance", () => {
    const error = new DecryptionError("Test", "Chrome", "AES");

    expect(error instanceof DecryptionError).toBe(true);
    expect(error instanceof CookieExtractionError).toBe(true);
    expect(error instanceof Error).toBe(true);
  });
});

import {
  CookieExtractionError,
  BrowserLockError,
  DecryptionError,
  InvalidTimestampError,
  BinaryParsingError,
} from "../errors";

// Integration test to ensure all error types work together
describe("Error Types Integration", () => {
  it("should export all error types", () => {
    expect(CookieExtractionError).toBeDefined();
    expect(BrowserLockError).toBeDefined();
    expect(DecryptionError).toBeDefined();
    expect(InvalidTimestampError).toBeDefined();
    expect(BinaryParsingError).toBeDefined();
  });
});

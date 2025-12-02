import { parseArgv } from "../argv";
import { validateToken } from "../jwt";
import logger from "../logger";

// Mock logger and argv
jest.mock("../logger", () => ({
  debug: jest.fn(),
  withTag: () => ({
    debug: jest.fn(),
  }),
}));

jest.mock("../argv", () => ({
  parseArgv: jest
    .fn()
    .mockReturnValue({ values: { verbose: false }, positionals: [] }),
}));

const validToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
const expiredToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiZXhwIjoxNTE2MjM5MDIyfQ.4yPWb5RFj0fptBGkuUj6gkZh3h4bBCz5Wd5GGXc5K4M";
const invalidSignatureToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.INVALID_SIGNATURE";
const secretKey = "your-256-bit-secret";

describe("isValidJwt - Basic Validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (parseArgv as jest.Mock).mockReturnValue({
      values: { verbose: false },
      positionals: [],
    });
  });

  it("should validate a well-formed JWT", () => {
    const result = validateToken(validToken);
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.decodedPayload).toBeDefined();
    expect(result.header).toBeDefined();
  });

  it("should reject an empty token", () => {
    const result = validateToken("");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Token is empty or whitespace");
  });

  it("should reject a whitespace token", () => {
    const result = validateToken("   ");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Token is empty or whitespace");
  });

  it("should handle null token", () => {
    const result = validateToken("" as unknown as string);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("Token is empty or whitespace");
  });
});

describe("isValidJwt - Format Validation", () => {
  const invalidFormatTokens = ["invalid", "a.b", "a.b.c.d", "!@#.$%^.&*()"];

  const nonBase64Tokens = [
    "not.a.jwt",
    "header.payload.signature",
    "abc.def.ghi",
  ];

  it.each(
    invalidFormatTokens,
  )("should reject token with invalid format: %s", (token) => {
    const result = validateToken(token);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe(
      "Invalid JWT format - must be three dot-separated base64url-encoded strings",
    );
  });

  it.each(
    nonBase64Tokens,
  )("should reject non-base64url encoded token: %s", (token) => {
    const result = validateToken(token);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Failed to decode token");
  });
});

describe("isValidJwt - Expiration Validation", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2024-01-01"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should accept a token with no expiration", () => {
    const result = validateToken(validToken);
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("should reject an expired token", () => {
    const result = validateToken(expiredToken);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Token has expired");
  });

  it("should accept a token that expires in the future", () => {
    const futureToken =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiZXhwIjoxNzM1Njg5NjAwfQ.RxwB7uk4E7EhhR1wVg7kK8zGdM4_RnlHhF9U8gZEa0g";
    const result = validateToken(futureToken);
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });
});

describe("isValidJwt - Signature Verification", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (parseArgv as jest.Mock).mockReturnValue({
      values: { verbose: true },
      positionals: [],
    });
  });

  it("should verify signature when secret key is provided", () => {
    const result = validateToken(invalidSignatureToken, secretKey);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("invalid signature");
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining("JWT verification failed"),
    );
  });

  it("should skip signature verification when no secret key is provided", () => {
    const result = validateToken(validToken);
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("should handle non-string secret key", () => {
    const result = validateToken(validToken, 123 as unknown as string);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain(
      "secretOrPublicKey is not valid key material",
    );
    expect(logger.debug).toHaveBeenCalled();
  });

  it("should handle valid Buffer secret key", () => {
    const result = validateToken(validToken, Buffer.from(secretKey));
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });
});

describe("isValidJwt - Payload and Header Information", () => {
  it("should return decoded payload and header for valid tokens", () => {
    const result = validateToken(validToken);
    expect(result.decodedPayload).toEqual({
      sub: "1234567890",
      name: "John Doe",
      iat: 1516239022,
    });
    expect(result.header).toEqual({
      alg: "HS256",
      typ: "JWT",
    });
  });

  it("should not return decoded information for invalid tokens", () => {
    const result = validateToken("invalid.token.here");
    expect(result.decodedPayload).toBeUndefined();
    expect(result.header).toBeUndefined();
  });
});

describe("isValidJwt - Verbose Logging", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (parseArgv as jest.Mock).mockReturnValue({
      values: { verbose: true },
      positionals: [],
    });
  });

  it("should log decoded token in verbose mode", () => {
    validateToken(validToken);
    expect(logger.debug).toHaveBeenCalledWith(
      "Decoded JWT token:",
      expect.any(Object),
    );
  });

  it("should log failed decode in verbose mode", () => {
    validateToken("invalid.token.here");
    expect(logger.debug).toHaveBeenCalledWith(
      "Decoded JWT token:",
      "Failed to decode",
    );
  });

  it("should log verification errors in verbose mode", () => {
    validateToken(invalidSignatureToken, secretKey);
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining("JWT verification failed"),
    );
  });

  it("should log undefined token error in verbose mode", () => {
    const invalidInput = undefined as unknown as string;
    validateToken(invalidInput);
    expect(logger.debug).toHaveBeenCalledWith(
      "JWT validation error: Token is undefined",
    );
  });
});

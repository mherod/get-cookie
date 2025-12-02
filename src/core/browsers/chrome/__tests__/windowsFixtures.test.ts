/**
 * Tests for Windows-specific cookie encryption fixtures
 *
 * These tests verify that the Windows v10 encryption fixtures work correctly
 * for both encryption and decryption, enabling reliable cross-platform testing.
 */

import {
  WINDOWS_TEST_KEY,
  WINDOWS_ALT_TEST_KEY,
  V10_PREFIX,
  DPAPI_PREFIX,
  DETERMINISTIC_NONCE,
  encryptWindowsV10Cookie,
  decryptWindowsV10Cookie,
  createMockLocalState,
  createMockLocalStateJson,
  WINDOWS_TEST_COOKIES,
  WINDOWS_ERROR_CASES,
  generateWindowsTestCookies,
  validateV10Format,
  verifyRoundTrip,
} from "./fixtures/windowsFixtures";

describe("Windows Cookie Fixtures - Constants", () => {
  it("should have correct key lengths", () => {
    expect(WINDOWS_TEST_KEY.length).toBe(32); // AES-256 requires 32 bytes
    expect(WINDOWS_ALT_TEST_KEY.length).toBe(32);
  });

  it("should have correct prefix values", () => {
    expect(V10_PREFIX.toString("utf8")).toBe("v10");
    expect(DPAPI_PREFIX.toString("utf8")).toBe("DPAPI");
  });

  it("should have deterministic nonce of correct length", () => {
    expect(DETERMINISTIC_NONCE.length).toBe(12); // AES-GCM requires 12-byte nonce
  });
});

describe("Windows Cookie Fixtures - encryptWindowsV10Cookie", () => {
  it("should encrypt a simple value", () => {
    const plaintext = "test_value";
    const encrypted = encryptWindowsV10Cookie(plaintext);

    expect(encrypted).toBeInstanceOf(Buffer);
    expect(encrypted.subarray(0, 3).equals(V10_PREFIX)).toBe(true);
    // Minimum length: 3 (prefix) + 12 (nonce) + 1 (min ciphertext) + 16 (auth tag)
    expect(encrypted.length).toBeGreaterThanOrEqual(32);
  });

  it("should produce different outputs with different nonces", () => {
    const plaintext = "same_value";
    const encrypted1 = encryptWindowsV10Cookie(plaintext);
    const encrypted2 = encryptWindowsV10Cookie(plaintext);

    // Random nonces should produce different ciphertexts
    expect(encrypted1.equals(encrypted2)).toBe(false);
  });

  it("should produce same output with deterministic nonce", () => {
    const plaintext = "deterministic_test";
    const encrypted1 = encryptWindowsV10Cookie(
      plaintext,
      WINDOWS_TEST_KEY,
      DETERMINISTIC_NONCE,
    );
    const encrypted2 = encryptWindowsV10Cookie(
      plaintext,
      WINDOWS_TEST_KEY,
      DETERMINISTIC_NONCE,
    );

    expect(encrypted1.equals(encrypted2)).toBe(true);
  });

  it("should throw on invalid nonce length", () => {
    expect(() =>
      encryptWindowsV10Cookie("test", WINDOWS_TEST_KEY, Buffer.alloc(8)),
    ).toThrow("Nonce must be exactly 12 bytes");
  });

  it("should throw on invalid key length", () => {
    expect(() => encryptWindowsV10Cookie("test", Buffer.alloc(16))).toThrow(
      "Key must be exactly 32 bytes for AES-256",
    );
  });

  it("should handle empty string", () => {
    const encrypted = encryptWindowsV10Cookie("");
    expect(encrypted.subarray(0, 3).equals(V10_PREFIX)).toBe(true);
  });

  it("should handle unicode strings", () => {
    const plaintext = "こんにちは世界 🌍";
    const encrypted = encryptWindowsV10Cookie(plaintext);
    const decrypted = decryptWindowsV10Cookie(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("should handle long strings", () => {
    const plaintext = "x".repeat(10000);
    const encrypted = encryptWindowsV10Cookie(plaintext);
    const decrypted = decryptWindowsV10Cookie(encrypted);
    expect(decrypted).toBe(plaintext);
  });
});

describe("Windows Cookie Fixtures - decryptWindowsV10Cookie", () => {
  it("should decrypt an encrypted value", () => {
    const plaintext = "secret_cookie_value";
    const encrypted = encryptWindowsV10Cookie(plaintext);
    const decrypted = decryptWindowsV10Cookie(encrypted);

    expect(decrypted).toBe(plaintext);
  });

  it("should throw on invalid prefix", () => {
    const invalidData = Buffer.concat([Buffer.from("v99"), Buffer.alloc(30)]);

    expect(() => decryptWindowsV10Cookie(invalidData)).toThrow(
      "Not a v10 encrypted cookie",
    );
  });

  it("should throw on too short data", () => {
    const shortData = Buffer.concat([V10_PREFIX, Buffer.alloc(10)]);

    expect(() => decryptWindowsV10Cookie(shortData)).toThrow(
      "Invalid v10 cookie: too short",
    );
  });

  it("should throw on wrong key", () => {
    const encrypted = encryptWindowsV10Cookie("test", WINDOWS_TEST_KEY);

    expect(() =>
      decryptWindowsV10Cookie(encrypted, WINDOWS_ALT_TEST_KEY),
    ).toThrow();
  });
});

describe("Windows Cookie Fixtures - Round-trip encryption", () => {
  const testCases = [
    { name: "simple string", value: "hello" },
    { name: "empty string", value: "" },
    { name: "JSON object", value: '{"key":"value","nested":{"a":1}}' },
    { name: "URL encoded", value: "value%20with%20spaces" },
    { name: "special chars", value: "!@#$%^&*()_+-=[]{}|;':\",./<>?" },
    { name: "unicode", value: "日本語テスト 🎉" },
    { name: "base64-like", value: "YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXo=" },
  ];

  testCases.forEach(({ name, value }) => {
    it(`should round-trip ${name}`, () => {
      const encrypted = encryptWindowsV10Cookie(value);
      const decrypted = decryptWindowsV10Cookie(encrypted);
      expect(decrypted).toBe(value);
    });
  });
});

describe("Windows Cookie Fixtures - createMockLocalState", () => {
  it("should create valid Local State structure", () => {
    const localState = createMockLocalState();

    expect(localState).toHaveProperty("os_crypt");
    expect(localState.os_crypt).toHaveProperty("encrypted_key");
    expect(typeof localState.os_crypt.encrypted_key).toBe("string");
  });

  it("should include DPAPI prefix in encrypted key", () => {
    const localState = createMockLocalState();
    const keyBuffer = Buffer.from(localState.os_crypt.encrypted_key, "base64");

    expect(keyBuffer.subarray(0, 5).equals(DPAPI_PREFIX)).toBe(true);
  });

  it("should embed the test key after DPAPI prefix", () => {
    const localState = createMockLocalState(WINDOWS_TEST_KEY);
    const keyBuffer = Buffer.from(localState.os_crypt.encrypted_key, "base64");
    const extractedKey = keyBuffer.subarray(5);

    expect(extractedKey.equals(WINDOWS_TEST_KEY)).toBe(true);
  });

  it("should use custom key when provided", () => {
    const localState = createMockLocalState(WINDOWS_ALT_TEST_KEY);
    const keyBuffer = Buffer.from(localState.os_crypt.encrypted_key, "base64");
    const extractedKey = keyBuffer.subarray(5);

    expect(extractedKey.equals(WINDOWS_ALT_TEST_KEY)).toBe(true);
  });
});

describe("Windows Cookie Fixtures - createMockLocalStateJson", () => {
  it("should create valid JSON string", () => {
    const json = createMockLocalStateJson();

    expect(() => JSON.parse(json) as unknown).not.toThrow();
  });

  it("should be parseable back to Local State structure", () => {
    const json = createMockLocalStateJson();
    const parsed = JSON.parse(json) as {
      os_crypt?: { encrypted_key?: string };
    };

    expect(parsed).toHaveProperty("os_crypt.encrypted_key");
  });
});

describe("Windows Cookie Fixtures - WINDOWS_TEST_COOKIES", () => {
  it("should have session cookie with correct properties", () => {
    const { session } = WINDOWS_TEST_COOKIES;

    expect(session.name).toBe("test_session");
    expect(session.value).toBe("session_123456");
    expect(session.host).toBe(".example.com");
    expect(session.path).toBe("/");
  });

  it("should decrypt session cookie correctly", () => {
    const { session } = WINDOWS_TEST_COOKIES;
    const decrypted = decryptWindowsV10Cookie(session.encrypted);

    expect(decrypted).toBe(session.value);
  });

  it("should have auth_token cookie with JWT-like value", () => {
    const { auth_token } = WINDOWS_TEST_COOKIES;

    expect(auth_token.value).toContain("eyJ");
    const decrypted = decryptWindowsV10Cookie(auth_token.encrypted);
    expect(decrypted).toBe(auth_token.value);
  });

  it("should handle empty cookie value", () => {
    const { empty } = WINDOWS_TEST_COOKIES;

    expect(empty.value).toBe("");
    const decrypted = decryptWindowsV10Cookie(empty.encrypted);
    expect(decrypted).toBe("");
  });

  it("should handle unicode cookie value", () => {
    const { unicode } = WINDOWS_TEST_COOKIES;

    expect(unicode.value).toBe("こんにちは世界");
    const decrypted = decryptWindowsV10Cookie(unicode.encrypted);
    expect(decrypted).toBe(unicode.value);
  });

  it("should handle long cookie value", () => {
    const { long_value } = WINDOWS_TEST_COOKIES;

    expect(long_value.value.length).toBe(4096);
    const decrypted = decryptWindowsV10Cookie(long_value.encrypted);
    expect(decrypted).toBe(long_value.value);
  });
});

describe("Windows Cookie Fixtures - WINDOWS_ERROR_CASES", () => {
  it("should have invalidPrefix case", () => {
    expect(() =>
      decryptWindowsV10Cookie(WINDOWS_ERROR_CASES.invalidPrefix.encrypted),
    ).toThrow(WINDOWS_ERROR_CASES.invalidPrefix.expectedError);
  });

  it("should have tooShort case", () => {
    expect(() =>
      decryptWindowsV10Cookie(WINDOWS_ERROR_CASES.tooShort.encrypted),
    ).toThrow(WINDOWS_ERROR_CASES.tooShort.expectedError);
  });

  it("should have corruptedAuthTag case", () => {
    expect(() =>
      decryptWindowsV10Cookie(WINDOWS_ERROR_CASES.corruptedAuthTag.encrypted),
    ).toThrow();
  });

  it("should have wrongKey case", () => {
    expect(() =>
      decryptWindowsV10Cookie(
        WINDOWS_ERROR_CASES.wrongKey.encrypted,
        WINDOWS_ERROR_CASES.wrongKey.decryptKey,
      ),
    ).toThrow();
  });
});

describe("Windows Cookie Fixtures - generateWindowsTestCookies", () => {
  it("should generate specified number of cookies", () => {
    const cookies = generateWindowsTestCookies({ count: 10 });

    expect(cookies).toHaveLength(10);
  });

  it("should generate unique cookie names", () => {
    const cookies = generateWindowsTestCookies({ count: 20 });
    const names = cookies.map((c) => c.name);
    const uniqueNames = new Set(names);

    expect(uniqueNames.size).toBe(20);
  });

  it("should cycle through domains", () => {
    const cookies = generateWindowsTestCookies({
      count: 8,
      domains: [".a.com", ".b.com"],
    });

    const hosts = cookies.map((c) => c.host);
    expect(hosts.filter((h) => h === ".a.com")).toHaveLength(4);
    expect(hosts.filter((h) => h === ".b.com")).toHaveLength(4);
  });

  it("should produce decryptable cookies", () => {
    const cookies = generateWindowsTestCookies({ count: 5 });

    cookies.forEach((cookie) => {
      const decrypted = decryptWindowsV10Cookie(cookie.encrypted);
      expect(decrypted).toBe(cookie.value);
    });
  });

  it("should use deterministic values when requested", () => {
    const cookies1 = generateWindowsTestCookies({
      count: 5,
      deterministic: true,
    });
    const cookies2 = generateWindowsTestCookies({
      count: 5,
      deterministic: true,
    });

    cookies1.forEach((c1, i) => {
      const c2 = cookies2[i];
      expect(c1.value).toBe(c2?.value);
      expect(c1.encrypted.equals(c2?.encrypted ?? Buffer.alloc(0))).toBe(true);
    });
  });

  it("should use random values by default", () => {
    const cookies1 = generateWindowsTestCookies({ count: 5 });
    const cookies2 = generateWindowsTestCookies({ count: 5 });

    // At least some values should differ
    const differentValues = cookies1.filter(
      (c1, i) => c1.value !== cookies2[i]?.value,
    );
    expect(differentValues.length).toBeGreaterThan(0);
  });
});

describe("Windows Cookie Fixtures - validateV10Format", () => {
  it("should validate correct v10 format", () => {
    const encrypted = encryptWindowsV10Cookie("test");
    const result = validateV10Format(encrypted);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.details.hasPrefix).toBe(true);
    expect(result.details.prefixValue).toBe("v10");
  });

  it("should detect missing prefix", () => {
    const invalid = Buffer.from("xyz" + "0".repeat(50));
    const result = validateV10Format(invalid);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Missing or invalid v10 prefix");
  });

  it("should detect too short data", () => {
    const tooShort = Buffer.concat([V10_PREFIX, Buffer.alloc(10)]);
    const result = validateV10Format(tooShort);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Too short"))).toBe(true);
  });

  it("should provide correct details", () => {
    const plaintext = "hello";
    const encrypted = encryptWindowsV10Cookie(plaintext);
    const result = validateV10Format(encrypted);

    expect(result.details.totalLength).toBe(encrypted.length);
    expect(result.details.nonceLength).toBe(12);
    expect(result.details.authTagLength).toBe(16);
    expect(result.details.ciphertextLength).toBe(
      encrypted.length - 3 - 12 - 16,
    );
  });
});

describe("Windows Cookie Fixtures - verifyRoundTrip", () => {
  it("should return true for valid encryption", () => {
    expect(verifyRoundTrip("test_value")).toBe(true);
  });

  it("should return true for empty string", () => {
    expect(verifyRoundTrip("")).toBe(true);
  });

  it("should return true for unicode", () => {
    expect(verifyRoundTrip("日本語")).toBe(true);
  });

  it("should work with custom key", () => {
    expect(verifyRoundTrip("test", WINDOWS_ALT_TEST_KEY)).toBe(true);
  });
});

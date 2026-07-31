import {
  firefoxExpiryToDate,
  isFirefoxCookieUnexpired,
} from "../FirefoxCookieQueryStrategy";

describe("firefoxExpiryToDate — Firefox 142 schema units change", () => {
  it("treats expiry as seconds for schema < 16 (Firefox <= 141)", () => {
    const seconds = 1_900_000_000; // ~2030
    expect(firefoxExpiryToDate(seconds, 15)).toEqual(new Date(seconds * 1000));
  });

  it("treats expiry as milliseconds for schema >= 16 (Firefox 142+)", () => {
    const milliseconds = 1_900_000_000_000;
    expect(firefoxExpiryToDate(milliseconds, 16)).toEqual(
      new Date(milliseconds),
    );
  });

  it("does not 1000x-inflate a millisecond expiry on schema 16", () => {
    const milliseconds = 1_900_000_000_000;
    const result = firefoxExpiryToDate(milliseconds, 16);
    // Regression guard for the bug: seconds-style * 1000 would land ~year 62,000
    expect(result).toBeInstanceOf(Date);
    expect((result as Date).getUTCFullYear()).toBeLessThan(2100);
  });

  it("returns Infinity for non-positive expiry regardless of schema", () => {
    expect(firefoxExpiryToDate(0, 16)).toBe("Infinity");
    expect(firefoxExpiryToDate(-1, 15)).toBe("Infinity");
    expect(firefoxExpiryToDate(null, 16)).toBe("Infinity");
  });
});

describe("isFirefoxCookieUnexpired — schema-aware SQL replacement", () => {
  const nowMs = 1_800_000_000_000;
  const nowSeconds = nowMs / 1000;

  it("compares schema < 16 expiry values in seconds", () => {
    expect(isFirefoxCookieUnexpired(nowSeconds + 1, 15, nowMs)).toBe(true);
    expect(isFirefoxCookieUnexpired(nowSeconds - 1, 15, nowMs)).toBe(false);
  });

  it("compares schema >= 16 expiry values in milliseconds", () => {
    expect(isFirefoxCookieUnexpired(nowMs + 1, 16, nowMs)).toBe(true);
    expect(isFirefoxCookieUnexpired(nowMs - 1, 16, nowMs)).toBe(false);
  });

  it("preserves the existing exclusion of session cookies", () => {
    expect(isFirefoxCookieUnexpired(0, 15, nowMs)).toBe(false);
    expect(isFirefoxCookieUnexpired(0, 16, nowMs)).toBe(false);
    expect(isFirefoxCookieUnexpired(null, 16, nowMs)).toBe(false);
  });
});

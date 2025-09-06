import {
  CHROME_EPOCH_OFFSET_SECONDS,
  chromeTimestampToDate,
  dateToChromeTimestamp,
  formatChromeTimestamp,
  isChromeSessionCookie,
  MICROSECONDS_PER_SECOND,
  MILLISECONDS_PER_SECOND,
} from "../chromeDates";

describe("Chrome Date Utilities - Constants", () => {
  it("should have correct Chrome epoch offset", () => {
    // 369 years between 1601 and 1970
    // 369 * 365.25 * 24 * 60 * 60 ≈ 11644473600 seconds
    expect(CHROME_EPOCH_OFFSET_SECONDS).toBe(11644473600);
  });

  it("should have correct microseconds per second", () => {
    expect(MICROSECONDS_PER_SECOND).toBe(1000000);
  });

  it("should have correct milliseconds per second", () => {
    expect(MILLISECONDS_PER_SECOND).toBe(1000);
  });
});

describe("chromeTimestampToDate - null/undefined handling", () => {
  it("should return undefined for null", () => {
    expect(chromeTimestampToDate(null)).toBeUndefined();
  });

  it("should return undefined for undefined", () => {
    expect(chromeTimestampToDate(undefined)).toBeUndefined();
  });

  it("should return undefined for NaN", () => {
    expect(chromeTimestampToDate(Number.NaN)).toBeUndefined();
  });
});

describe("chromeTimestampToDate - session cookies", () => {
  it("should return Infinity for 0", () => {
    expect(chromeTimestampToDate(0)).toBe("Infinity");
  });

  it("should return Infinity for negative values", () => {
    expect(chromeTimestampToDate(-1)).toBe("Infinity");
    expect(chromeTimestampToDate(-1000000)).toBe("Infinity");
  });
});

describe("chromeTimestampToDate - valid dates", () => {
  it("should convert Chrome timestamp for Unix epoch (1970-01-01)", () => {
    // Unix epoch in Chrome timestamp
    const chromeTimestamp =
      CHROME_EPOCH_OFFSET_SECONDS * MICROSECONDS_PER_SECOND;
    const result = chromeTimestampToDate(chromeTimestamp);
    expect(result).toBeInstanceOf(Date);
    const date = result as Date;
    expect(date.toISOString()).toBe("1970-01-01T00:00:00.000Z");
  });

  it("should convert Chrome timestamp for year 2000", () => {
    // Year 2000 in Chrome timestamp (Jan 1, 2000 00:00:00)
    const year2000Unix = new Date("2000-01-01T00:00:00.000Z").getTime() / 1000;
    const chromeTimestamp =
      (year2000Unix + CHROME_EPOCH_OFFSET_SECONDS) * MICROSECONDS_PER_SECOND;
    const result = chromeTimestampToDate(chromeTimestamp);
    expect(result).toBeInstanceOf(Date);
    const date = result as Date;
    expect(date.getFullYear()).toBe(2000);
    expect(date.getMonth()).toBe(0); // January (0-indexed)
    expect(date.getDate()).toBe(1);
  });

  it("should convert Chrome timestamp for current era", () => {
    // Test with 2025-12-28T21:52:50.046Z
    const chromeTimestamp = 13411432370046760;
    const result = chromeTimestampToDate(chromeTimestamp);
    expect(result).toBeInstanceOf(Date);
    const date = result as Date;
    expect(date.getFullYear()).toBe(2025);
    expect(date.getMonth()).toBe(11); // December (0-indexed)
    expect(date.getDate()).toBe(28);
  });
});

describe("chromeTimestampToDate - edge cases", () => {
  it("should treat far future dates as session cookies", () => {
    // Year 4000 would be unreasonable
    const farFutureTimestamp = 64092211200 * MICROSECONDS_PER_SECOND; // seconds since 1601 for year 4000
    expect(chromeTimestampToDate(farFutureTimestamp)).toBe("Infinity");
  });

  it("should treat pre-1970 Chrome timestamps as session cookies", () => {
    // Any date before Unix epoch when converted
    const pre1970 = 1000000; // Very small Chrome timestamp
    expect(chromeTimestampToDate(pre1970)).toBe("Infinity");
  });
});

describe("dateToChromeTimestamp", () => {
  it("should convert Unix epoch to Chrome timestamp", () => {
    const date = new Date("1970-01-01T00:00:00.000Z");
    const result = dateToChromeTimestamp(date);
    expect(result).toBe(CHROME_EPOCH_OFFSET_SECONDS * MICROSECONDS_PER_SECOND);
  });

  it("should convert year 2000 to Chrome timestamp", () => {
    const date = new Date("2000-01-01T00:00:00.000Z");
    const result = dateToChromeTimestamp(date);
    const expectedUnixSeconds = date.getTime() / 1000;
    const expectedChromeSeconds =
      expectedUnixSeconds + CHROME_EPOCH_OFFSET_SECONDS;
    expect(result).toBe(expectedChromeSeconds * MICROSECONDS_PER_SECOND);
  });

  it("should convert year 2025 to Chrome timestamp", () => {
    const date = new Date("2025-12-28T21:52:50.046Z");
    const result = dateToChromeTimestamp(date);
    // Should be close to our test value
    expect(result).toBeCloseTo(13411432370046000, -4); // Within 10000 microseconds
  });
});

describe("formatChromeTimestamp", () => {
  it("should format session cookies as 'Session'", () => {
    expect(formatChromeTimestamp(0)).toBe("Session");
    expect(formatChromeTimestamp(-1)).toBe("Session");
  });

  it("should format null as 'Session'", () => {
    expect(formatChromeTimestamp(null)).toBe("Session");
  });

  it("should format undefined as 'Session'", () => {
    expect(formatChromeTimestamp(undefined)).toBe("Session");
  });

  it("should format valid Chrome timestamps as ISO strings", () => {
    // Unix epoch
    const epochTimestamp =
      CHROME_EPOCH_OFFSET_SECONDS * MICROSECONDS_PER_SECOND;
    expect(formatChromeTimestamp(epochTimestamp)).toBe(
      "1970-01-01T00:00:00.000Z",
    );

    // Year 2025
    const chromeTimestamp = 13411432370046760;
    const result = formatChromeTimestamp(chromeTimestamp);
    expect(result).toMatch(/^2025-12-28T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});

describe("isChromeSessionCookie", () => {
  it("should return true for session cookie values", () => {
    expect(isChromeSessionCookie(0)).toBe(true);
    expect(isChromeSessionCookie(-1)).toBe(true);
    expect(isChromeSessionCookie(-1000000)).toBe(true);
  });

  it("should return true for null and undefined", () => {
    expect(isChromeSessionCookie(null)).toBe(true);
    expect(isChromeSessionCookie(undefined)).toBe(true);
  });

  it("should return false for valid timestamps", () => {
    const validTimestamp =
      CHROME_EPOCH_OFFSET_SECONDS * MICROSECONDS_PER_SECOND;
    expect(isChromeSessionCookie(validTimestamp)).toBe(false);
  });

  it("should return true for far future dates", () => {
    const farFutureTimestamp = 64092211200 * MICROSECONDS_PER_SECOND;
    expect(isChromeSessionCookie(farFutureTimestamp)).toBe(true);
  });

  it("should handle round trip consistency", () => {
    const dates = [
      new Date("1970-01-01T00:00:00.000Z"),
      new Date("2000-01-01T00:00:00.000Z"),
      new Date("2025-12-31T23:59:59.999Z"),
    ];

    for (const date of dates) {
      const chromeTimestamp = dateToChromeTimestamp(date);
      expect(isChromeSessionCookie(chromeTimestamp)).toBe(false);
      const convertedBack = chromeTimestampToDate(chromeTimestamp);
      expect(convertedBack).toBeInstanceOf(Date);
    }
  });
});

describe("Chrome Date Integration Tests", () => {
  it("should handle multiple round trips", () => {
    const dates = [
      new Date("1970-01-01T00:00:00.000Z"),
      new Date("2000-01-01T00:00:00.000Z"),
      new Date("2025-12-31T23:59:59.999Z"),
      new Date("2030-06-15T12:00:00.000Z"),
    ];

    for (const originalDate of dates) {
      const chromeTimestamp = dateToChromeTimestamp(originalDate);
      const convertedBack = chromeTimestampToDate(chromeTimestamp);
      expect(convertedBack).toBeInstanceOf(Date);
      expect((convertedBack as Date).toISOString()).toBe(
        originalDate.toISOString(),
      );
    }
  });
});

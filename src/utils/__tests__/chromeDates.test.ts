import {
  CHROME_EPOCH_OFFSET_SECONDS,
  MICROSECONDS_PER_SECOND,
  MILLISECONDS_PER_SECOND,
  chromeTimestampToDate,
  dateToChromeTimestamp,
  formatChromeTimestamp,
  isChromeSessionCookie,
} from "../chromeDates";

describe("Chrome Date Utilities", () => {
  describe("Constants", () => {
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

  describe("chromeTimestampToDate", () => {
    describe("null/undefined handling", () => {
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

    describe("session cookies", () => {
      it("should return Infinity for 0", () => {
        expect(chromeTimestampToDate(0)).toBe("Infinity");
      });

      it("should return Infinity for negative values", () => {
        expect(chromeTimestampToDate(-1)).toBe("Infinity");
        expect(chromeTimestampToDate(-1000000)).toBe("Infinity");
      });
    });

    describe("valid dates", () => {
      it("should convert Chrome timestamp for Unix epoch (1970-01-01)", () => {
        // Unix epoch in Chrome timestamp
        const chromeTimestamp =
          CHROME_EPOCH_OFFSET_SECONDS * MICROSECONDS_PER_SECOND;
        const result = chromeTimestampToDate(chromeTimestamp);
        expect(result).toBeInstanceOf(Date);
        expect((result as Date).toISOString()).toBe("1970-01-01T00:00:00.000Z");
      });

      it("should convert Chrome timestamp for year 2000", () => {
        // 2000-01-01 00:00:00 UTC
        const unixTimestamp = Date.UTC(2000, 0, 1) / 1000; // seconds
        const chromeTimestamp =
          (unixTimestamp + CHROME_EPOCH_OFFSET_SECONDS) *
          MICROSECONDS_PER_SECOND;
        const result = chromeTimestampToDate(chromeTimestamp);
        expect(result).toBeInstanceOf(Date);
        expect((result as Date).toISOString()).toBe("2000-01-01T00:00:00.000Z");
      });

      it("should convert Chrome timestamp for year 2025", () => {
        // 2025-12-28 21:52:50.046 UTC
        const expectedDate = new Date("2025-12-28T21:52:50.046Z");
        const unixTimestampMs = expectedDate.getTime(); // milliseconds
        const unixTimestampSeconds = unixTimestampMs / 1000; // seconds
        // Note: Converting to microseconds and back may lose sub-millisecond precision
        const chromeTimestamp = Math.floor(
          (unixTimestampSeconds + CHROME_EPOCH_OFFSET_SECONDS) *
            MICROSECONDS_PER_SECOND,
        );
        const result = chromeTimestampToDate(chromeTimestamp);
        expect(result).toBeInstanceOf(Date);
        // Check the date is correct to the second (microsecond precision may be lost)
        const resultDate = result as Date;
        expect(resultDate.getFullYear()).toBe(2025);
        expect(resultDate.getMonth()).toBe(11); // December
        expect(resultDate.getDate()).toBe(28);
        expect(resultDate.getHours()).toBe(21);
        expect(resultDate.getMinutes()).toBe(52);
        expect(resultDate.getSeconds()).toBe(50);
      });

      it("should handle real Chrome cookie timestamp", () => {
        // Real example from Chrome database: _octo cookie
        const chromeTimestamp = 13411432370046760;
        const result = chromeTimestampToDate(chromeTimestamp);
        expect(result).toBeInstanceOf(Date);
        const date = result as Date;
        expect(date.getFullYear()).toBe(2025);
        expect(date.getMonth()).toBe(11); // December (0-indexed)
        expect(date.getDate()).toBe(28);
      });
    });

    describe("edge cases", () => {
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
  });

  describe("dateToChromeTimestamp", () => {
    it("should convert Unix epoch to Chrome timestamp", () => {
      const date = new Date("1970-01-01T00:00:00.000Z");
      const result = dateToChromeTimestamp(date);
      expect(result).toBe(
        CHROME_EPOCH_OFFSET_SECONDS * MICROSECONDS_PER_SECOND,
      );
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

    it("should return 0 for invalid dates", () => {
      const invalidDate = new Date("invalid");
      expect(dateToChromeTimestamp(invalidDate)).toBe(0);
    });

    it("should handle null/undefined gracefully", () => {
      expect(dateToChromeTimestamp(null as unknown as Date)).toBe(0);
      expect(dateToChromeTimestamp(undefined as unknown as Date)).toBe(0);
    });
  });

  describe("isChromeSessionCookie", () => {
    it("should identify null as session cookie", () => {
      expect(isChromeSessionCookie(null)).toBe(true);
    });

    it("should identify undefined as session cookie", () => {
      expect(isChromeSessionCookie(undefined)).toBe(true);
    });

    it("should identify 0 as session cookie", () => {
      expect(isChromeSessionCookie(0)).toBe(true);
    });

    it("should identify negative values as session cookies", () => {
      expect(isChromeSessionCookie(-1)).toBe(true);
      expect(isChromeSessionCookie(-1000000)).toBe(true);
    });

    it("should not identify valid timestamps as session cookies", () => {
      expect(isChromeSessionCookie(13411432370046760)).toBe(false);
      expect(isChromeSessionCookie(1000000)).toBe(false);
    });
  });

  describe("formatChromeTimestamp", () => {
    it("should format undefined as 'No expiry'", () => {
      expect(formatChromeTimestamp(undefined)).toBe("No expiry");
      expect(formatChromeTimestamp(null)).toBe("No expiry");
    });

    it("should format session cookies as 'Session cookie'", () => {
      expect(formatChromeTimestamp(0)).toBe("Session cookie");
      expect(formatChromeTimestamp(-1)).toBe("Session cookie");
    });

    it("should format valid dates as ISO strings", () => {
      const chromeTimestamp = 13411432370046760;
      const result = formatChromeTimestamp(chromeTimestamp);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(result).toContain("2025-12-28");
    });
  });

  describe("Round-trip conversion", () => {
    it("should convert Date -> Chrome -> Date correctly", () => {
      const originalDate = new Date("2025-06-15T12:30:45.000Z"); // Use whole seconds
      const chromeTimestamp = dateToChromeTimestamp(originalDate);
      const convertedBack = chromeTimestampToDate(chromeTimestamp);

      expect(convertedBack).toBeInstanceOf(Date);
      expect((convertedBack as Date).toISOString()).toBe(
        originalDate.toISOString(),
      );
    });

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
});

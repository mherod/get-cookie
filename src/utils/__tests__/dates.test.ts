import { isValidMacDate, parseMacDate, toMacDate } from "../dates";

describe("Mac Date Utils", () => {
  describe("parseMacDate", () => {
    it("should convert Mac epoch (0) to 2001-01-01", () => {
      const date = parseMacDate(0);
      expect(date.toISOString()).toBe("2001-01-01T00:00:00.000Z");
    });

    it("should handle current dates", () => {
      const now = new Date();
      const macDate = toMacDate(now);
      const parsedDate = parseMacDate(macDate);

      // Compare timestamps rounded to seconds to avoid millisecond differences
      expect(Math.floor(parsedDate.getTime() / 1000)).toBe(
        Math.floor(now.getTime() / 1000),
      );
    });

    it("should handle dates before Mac epoch", () => {
      const date = parseMacDate(-978307200); // Unix epoch
      expect(date.toISOString()).toBe("1970-01-01T00:00:00.000Z");
    });
  });

  describe("toMacDate", () => {
    it("should convert 2001-01-01 to Mac epoch (0)", () => {
      const date = new Date("2001-01-01T00:00:00Z");
      expect(toMacDate(date)).toBe(0);
    });

    it("should handle Unix epoch", () => {
      const date = new Date("1970-01-01T00:00:00Z");
      expect(toMacDate(date)).toBe(-978307200);
    });

    it("should be reversible with parseMacDate", () => {
      const originalDate = new Date("2023-01-01T12:34:56Z");
      const macDate = toMacDate(originalDate);
      const parsedDate = parseMacDate(macDate);

      // Compare timestamps rounded to seconds
      expect(Math.floor(parsedDate.getTime() / 1000)).toBe(
        Math.floor(originalDate.getTime() / 1000),
      );
    });
  });

  describe("isValidMacDate", () => {
    it("should accept Mac epoch", () => {
      expect(isValidMacDate(0)).toBe(true);
    });

    it("should accept current dates", () => {
      const now = toMacDate(new Date());
      expect(isValidMacDate(now)).toBe(true);
    });

    it("should reject dates before Mac epoch", () => {
      expect(isValidMacDate(-1)).toBe(false);
      expect(isValidMacDate(-978307200)).toBe(false);
    });

    it("should reject dates too far in the future", () => {
      expect(isValidMacDate(3124137601)).toBe(false); // After 2100-01-01
    });
  });
});

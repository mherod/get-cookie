import { describe, expect, test } from "@jest/globals";

import { ChromeDateSchema, ExportedCookieDateSchema } from "../schemas";

describe("ChromeDateSchema", () => {
  test("accepts valid Chrome dates", () => {
    expect(ChromeDateSchema.parse(13303830968000000)).toBeInstanceOf(Date);
    expect(ChromeDateSchema.parse(0)).toBeInstanceOf(Date);
  });

  test("rejects invalid Chrome dates", () => {
    expect(() => ChromeDateSchema.parse(-1)).toThrow();
    expect(() => ChromeDateSchema.parse(1.5)).toThrow();
    expect(() => ChromeDateSchema.parse("invalid")).toThrow();
  });
});

describe("ExportedCookieDateSchema", () => {
  test("accepts 'Infinity'", () => {
    expect(ExportedCookieDateSchema.parse("Infinity")).toBe("Infinity");
  });

  test("accepts Date objects", () => {
    const now = new Date();
    expect(ExportedCookieDateSchema.parse(now)).toBeInstanceOf(Date);
  });

  test("accepts and converts timestamps", () => {
    const timestamp = 1735689600000; // Some future date
    const result = ExportedCookieDateSchema.parse(timestamp);
    expect(result).toBeInstanceOf(Date);
    if (result instanceof Date) {
      expect(result.getTime()).toBe(timestamp);
    }
  });

  test("rejects invalid dates", () => {
    expect(() => ExportedCookieDateSchema.parse(-1)).toThrow();
    expect(() => ExportedCookieDateSchema.parse("invalid")).toThrow();
    expect(() => ExportedCookieDateSchema.parse({})).toThrow();
    expect(() => ExportedCookieDateSchema.parse(null)).toThrow();
  });
});

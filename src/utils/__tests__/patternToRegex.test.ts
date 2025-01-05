import { stringToRegex } from "../patternToRegex";

describe("stringToRegex", () => {
  it("should convert a simple pattern without wildcards", () => {
    const pattern = "example.com";
    const regex = stringToRegex(pattern);
    expect(regex).toBeInstanceOf(RegExp);
    expect(regex.test("example.com")).toBe(true);
    expect(regex.test("exampleXcom")).toBe(false);
  });

  it("should replace % with .*", () => {
    const pattern = "%.example.com";
    const regex = stringToRegex(pattern);
    expect(regex).toBeInstanceOf(RegExp);
    expect(regex.test("sub.example.com")).toBe(true);
    expect(regex.test("sub.exampleXcom")).toBe(false);
  });

  it("should replace * with .*", () => {
    const pattern = "api.*.domain.com";
    const regex = stringToRegex(pattern);
    expect(regex).toBeInstanceOf(RegExp);
    expect(regex.test("api.v2.domain.com")).toBe(true);
    expect(regex.test("apiv2domain.com")).toBe(false);
  });

  it("should correctly handle multiple wildcards", () => {
    const pattern = "*.something.%";
    const regex = stringToRegex(pattern);
    expect(regex).toBeInstanceOf(RegExp);
    expect(regex.test("anything.something.somethingelse")).toBe(true);
    expect(regex.test("anything-nothing")).toBe(false);
  });

  it("should handle empty string", () => {
    const pattern = "";
    const regex = stringToRegex(pattern);
    expect(regex).toBeInstanceOf(RegExp);
    expect(regex.test("")).toBe(true);
    expect(regex.source).toBe("(?:)");
  });

  it("should handle multiple dots correctly", () => {
    const pattern = "test.example.co.uk";
    const regex = stringToRegex(pattern);
    expect(regex).toBeInstanceOf(RegExp);
    expect(regex.test("test.example.co.uk")).toBe(true);
    expect(regex.test("testXexampleXcoXuk")).toBe(false);
  });

  it("should handle mix of dots and wildcards", () => {
    const pattern = "%.test.*.co.%";
    const regex = stringToRegex(pattern);
    expect(regex).toBeInstanceOf(RegExp);
    expect(regex.test("sub.test.example.co.uk")).toBe(true);
    expect(regex.test("sub.test.example.org")).toBe(false);
  });
});

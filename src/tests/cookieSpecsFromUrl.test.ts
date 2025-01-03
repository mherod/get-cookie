import { uniqBy } from "lodash-es";

import { cookieSpecsFromUrl } from "../core/cookies/cookieSpecsFromUrl";
import { isCookieSpec } from "../types/CookieSpec";

describe("cookieSpecsFromUrl basic functionality", () => {
  it("should return an array of cookie specs", () => {
    const url = "https://example.com/";
    const result = cookieSpecsFromUrl(url);
    expect(Array.isArray(result)).toBe(true);
    const firstSpec = result[0];
    expect(isCookieSpec(firstSpec)).toBe(true);
  });

  it("should handle string URLs", () => {
    const url = "https://example.com/";
    const result = cookieSpecsFromUrl(url);
    const firstSpec = result[0];
    expect(firstSpec.domain).toContain("example.com");
  });

  it("should handle URL objects", () => {
    const urlObj = new URL("https://example.com/");
    const result = cookieSpecsFromUrl(urlObj.toString());
    const firstSpec = result[0];
    expect(firstSpec.domain).toContain("example.com");
  });
});

describe("cookieSpecsFromUrl edge cases", () => {
  it("should handle empty string URL", () => {
    const url = "";
    const result = cookieSpecsFromUrl(url);
    expect(result).toEqual([]);
  });

  it("should throw error for invalid URL", () => {
    const url = "invalid_url";
    expect(() => cookieSpecsFromUrl(url)).toThrow(/Invalid URL/);
  });

  it("should return unique cookie specs", () => {
    const url = "https://example.com/";
    const result = cookieSpecsFromUrl(url);
    const uniqueResults = uniqBy(result, JSON.stringify);
    expect(result.length).toEqual(uniqueResults.length);
  });
});

describe("cookieSpecsFromUrl domain handling", () => {
  it("should return correct cookie specs for URL with subdomain", () => {
    const url = "https://sub.example.com/";
    const result = cookieSpecsFromUrl(url);
    expect(result).toContainEqual({ name: "%", domain: "sub.example.com" });
    expect(result).toContainEqual({ name: "%", domain: "%.example.com" });
    expect(result).toContainEqual({ name: "%", domain: "example.com" });
  });

  it("should return correct cookie specs for URL with multiple subdomains", () => {
    const url = "https://sub.sub2.example.com/";
    const result = cookieSpecsFromUrl(url);
    expect(result).toContainEqual({
      name: "%",
      domain: "sub.sub2.example.com",
    });
    expect(result).toContainEqual({
      name: "%",
      domain: "%.sub2.example.com",
    });
    expect(result).toContainEqual({
      name: "%",
      domain: "%.example.com",
    });
    expect(result).toContainEqual({
      name: "%",
      domain: "example.com",
    });
  });
});

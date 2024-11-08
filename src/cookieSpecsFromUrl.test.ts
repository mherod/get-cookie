import { cookieSpecsFromUrl } from "./cookieSpecsFromUrl";
import { isCookieSpec } from "./CookieSpec";
import { uniqBy } from "lodash";
import { describe, it, expect } from "vitest";

describe("cookieSpecsFromUrl", () => {
  it("should return an array of cookie specs", () => {
    const url: string = "https://example.com/";
    const result: any[] = cookieSpecsFromUrl(url);
    expect(result).toBeInstanceOf(Array);
    expect(isCookieSpec(result[0])).toBe(true);
  });

  it("should handle string URLs", () => {
    const url: string = "https://example.com/";
    const result: any[] = cookieSpecsFromUrl(url);
    expect(result[0].domain).toContain("example.com");
  });

  it("should handle URL objects", () => {
    const url: URL = new URL("https://example.com/");
    const result: any[] = cookieSpecsFromUrl(url);
    expect(result[0].domain).toContain("example.com");
  });

  it("should handle empty string URL", () => {
    const url: string = "";
    const result: any[] = cookieSpecsFromUrl(url);
    expect(result).toEqual([]);
  });

  it("should handle invalid URL", () => {
    const url = 'invalid_url';
    expect(() => cookieSpecsFromUrl(url)).toThrow('Invalid URL');
  });

  it("should return unique cookie specs", () => {
    const url: string = "https://example.com/";
    const result: any[] = cookieSpecsFromUrl(url);
    const uniqueResults: any[] = uniqBy(result, JSON.stringify);
    expect(result.length).toEqual(uniqueResults.length);
  });

  it("should return correct cookie specs for URL with subdomain", () => {
    const url: string = "https://sub.example.com/";
    const result: any[] = cookieSpecsFromUrl(url);
    expect(result).toContainEqual({ name: "%", domain: "sub.example.com" });
    expect(result).toContainEqual({ name: "%", domain: "%.example.com" });
    expect(result).toContainEqual({ name: "%", domain: "example.com" });
  });

  it("should return correct cookie specs for URL with multiple subdomains", () => {
    const url: string = "https://sub.sub2.example.com/";
    const result: any[] = cookieSpecsFromUrl(url);
    expect(result).toContainEqual({
      name: "%",
      domain: "sub.sub2.example.com",
    });
    expect(result).toContainEqual({ name: "%", domain: "%.example.com" });
    expect(result).toContainEqual({ name: "%", domain: "example.com" });
  });
});

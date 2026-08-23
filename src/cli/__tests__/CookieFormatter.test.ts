import type { ExportedCookie } from "../../types/schemas";
import { formatCookies, validateOutputFormat } from "../CookieFormatter";

const sampleCookies: ExportedCookie[] = [
  {
    name: "session",
    domain: "example.com",
    value: "val123",
    meta: { file: "/path/to/cookies.db", browser: "Chrome" },
  },
  {
    name: "auth",
    domain: "api.example.com",
    value: "val456",
    meta: { file: "/path/to/cookies.db", browser: "Chrome" },
  },
  {
    name: "duplicate",
    domain: "example.com",
    value: "val123", // Duplicate value for default mode
    meta: { file: "/path/to/other.db", browser: "Firefox" },
  },
];

describe("CookieFormatter", () => {
  describe("validateOutputFormat", () => {
    it("should pass for output: json", () => {
      expect(() => validateOutputFormat({ output: "json" })).not.toThrow();
    });

    it("should pass when output is undefined", () => {
      expect(() => validateOutputFormat({})).not.toThrow();
    });

    it("should throw for invalid output formats", () => {
      expect(() => validateOutputFormat({ output: "invalid" })).toThrow(
        "Invalid output format: 'invalid'. Valid formats are: json",
      );
      expect(() => validateOutputFormat({ output: "xml" })).toThrow(
        "Invalid output format: 'xml'. Valid formats are: json",
      );
      expect(() => validateOutputFormat({ output: "" })).toThrow(
        "Invalid output format: ''. Valid formats are: json",
      );
      expect(() => validateOutputFormat({ output: "JSON" })).toThrow(
        "Invalid output format: 'JSON'. Valid formats are: json",
      );
    });
  });

  describe("formatCookies", () => {
    it("should format as JSON when output: json", () => {
      const output = formatCookies(sampleCookies, { output: "json" });
      const parsed = JSON.parse(output);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(3);
      expect(parsed[0].name).toBe("session");
    });

    it("should return [] for empty cookies in json mode", () => {
      expect(formatCookies([], { output: "json" })).toBe("[]");
    });

    it("should format as grouped dump when dump-grouped or D is true", () => {
      const output = formatCookies(sampleCookies, { "dump-grouped": true });
      const parsed = JSON.parse(output);
      expect(parsed["/path/to/cookies.db"]).toBeDefined();
      expect(parsed["/path/to/other.db"]).toBeDefined();
      expect(parsed["/path/to/cookies.db"].length).toBe(2);

      const altOutput = formatCookies(sampleCookies, { D: true });
      expect(altOutput).toBe(output);
    });

    it("should return {} for empty cookies in grouped dump mode", () => {
      expect(formatCookies([], { "dump-grouped": true })).toBe("{}");
    });

    it("should format as dump JSON when dump or d is true", () => {
      const output = formatCookies(sampleCookies, { dump: true });
      const parsed = JSON.parse(output);
      expect(parsed.length).toBe(3);

      const altOutput = formatCookies(sampleCookies, { d: true });
      expect(altOutput).toBe(output);
    });

    it("should format as merged render when render or r is true", () => {
      const output = formatCookies(sampleCookies, { render: true });
      expect(output).toContain("session=val123");
      expect(output).toContain("auth=val456");
    });

    it("should format as grouped render when render-grouped or R is true", () => {
      const output = formatCookies(sampleCookies, { "render-grouped": true });
      expect(output).toContain("/path/to/cookies.db");
      expect(output).toContain("session=val123");
    });

    it("should format default output with unique non-empty string values", () => {
      const output = formatCookies(sampleCookies, {});
      const lines = output.split("\n");
      expect(lines).toEqual(["val123", "val456"]);
    });

    it("should return empty string for empty cookies in default mode", () => {
      expect(formatCookies([], {})).toBe("");
    });
  });
});

import { join } from "node:path";

import { selectSafariCookiePath } from "../SafariCookieQueryStrategy";

const HOME = "/Users/test";
const containerPath = join(
  HOME,
  "Library",
  "Containers",
  "com.apple.Safari",
  "Data",
  "Library",
  "Cookies",
  "Cookies.binarycookies",
);
const legacyPath = join(HOME, "Library", "Cookies", "Cookies.binarycookies");

describe("selectSafariCookiePath — legacy path fallback", () => {
  it("prefers the sandboxed Containers path when it exists", () => {
    expect(selectSafariCookiePath(HOME, (p) => p === containerPath)).toBe(
      containerPath,
    );
  });

  it("prefers Containers even when both paths exist", () => {
    expect(selectSafariCookiePath(HOME, () => true)).toBe(containerPath);
  });

  it("falls back to the legacy path when only it exists", () => {
    expect(selectSafariCookiePath(HOME, (p) => p === legacyPath)).toBe(
      legacyPath,
    );
  });

  it("returns the Containers path when neither exists (for the not-found error)", () => {
    expect(selectSafariCookiePath(HOME, () => false)).toBe(containerPath);
  });
});

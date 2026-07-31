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

  it("uses the most recently modified path when both exist", () => {
    const modifiedAt = (path: string): number =>
      path === legacyPath ? 200 : 100;

    expect(selectSafariCookiePath(HOME, () => true, modifiedAt)).toBe(
      legacyPath,
    );
  });

  it("prefers Containers when both exist and it is newer", () => {
    const modifiedAt = (path: string): number =>
      path === containerPath ? 200 : 100;

    expect(selectSafariCookiePath(HOME, () => true, modifiedAt)).toBe(
      containerPath,
    );
  });

  it("prefers Containers when modification metadata is unavailable", () => {
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

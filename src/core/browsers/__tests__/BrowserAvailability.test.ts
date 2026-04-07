/**
 * Tests for BrowserAvailability exports
 */

import { describe, it, expect } from "@jest/globals";
import { homedir } from "node:os";
import { join } from "node:path";

import {
  BROWSER_PATHS,
  CHROMIUM_DATA_DIRS,
  FIREFOX_DATA_DIRS,
} from "../BrowserAvailability";

describe("CHROMIUM_DATA_DIRS", () => {
  it("has entries for darwin, win32, and linux", () => {
    expect(CHROMIUM_DATA_DIRS).toHaveProperty("darwin");
    expect(CHROMIUM_DATA_DIRS).toHaveProperty("win32");
    expect(CHROMIUM_DATA_DIRS).toHaveProperty("linux");
  });

  describe("darwin paths", () => {
    const darwin = CHROMIUM_DATA_DIRS["darwin"];

    it("has a chrome entry", () => {
      expect(typeof darwin?.["chrome"]).toBe("string");
    });

    it("chrome path points to Google/Chrome under Application Support", () => {
      expect(darwin?.["chrome"]).toBe(
        join(homedir(), "Library", "Application Support", "Google", "Chrome"),
      );
    });

    it("has edge, arc, opera, and opera-gx entries", () => {
      expect(typeof darwin?.["edge"]).toBe("string");
      expect(typeof darwin?.["arc"]).toBe("string");
      expect(typeof darwin?.["opera"]).toBe("string");
      expect(typeof darwin?.["opera-gx"]).toBe("string");
    });

    it("opera-gx path uses com.operasoftware.OperaGX bundle", () => {
      expect(darwin?.["opera-gx"]).toContain("com.operasoftware.OperaGX");
    });
  });

  describe("win32 paths", () => {
    const win32 = CHROMIUM_DATA_DIRS["win32"];

    it("has chrome, edge, opera, and opera-gx entries", () => {
      expect(typeof win32?.["chrome"]).toBe("string");
      expect(typeof win32?.["edge"]).toBe("string");
      expect(typeof win32?.["opera"]).toBe("string");
      expect(typeof win32?.["opera-gx"]).toBe("string");
    });

    it("chrome path includes User Data suffix", () => {
      expect(win32?.["chrome"]).toContain("User Data");
    });

    it("edge path includes User Data suffix", () => {
      expect(win32?.["edge"]).toContain("User Data");
    });
  });

  describe("linux paths", () => {
    const linux = CHROMIUM_DATA_DIRS["linux"];

    it("has chrome, edge, opera, and opera-gx entries", () => {
      expect(typeof linux?.["chrome"]).toBe("string");
      expect(typeof linux?.["edge"]).toBe("string");
      expect(typeof linux?.["opera"]).toBe("string");
      expect(typeof linux?.["opera-gx"]).toBe("string");
    });

    it("chrome path is under .config/google-chrome", () => {
      expect(linux?.["chrome"]).toBe(
        join(homedir(), ".config", "google-chrome"),
      );
    });

    it("edge path is under .config/microsoft-edge", () => {
      expect(linux?.["edge"]).toBe(
        join(homedir(), ".config", "microsoft-edge"),
      );
    });
  });
});

describe("FIREFOX_DATA_DIRS", () => {
  it("has entries for darwin, win32, and linux", () => {
    expect(FIREFOX_DATA_DIRS).toHaveProperty("darwin");
    expect(FIREFOX_DATA_DIRS).toHaveProperty("win32");
    expect(FIREFOX_DATA_DIRS).toHaveProperty("linux");
  });

  describe("linux paths", () => {
    const linux = FIREFOX_DATA_DIRS["linux"];

    it("includes the traditional ~/.mozilla/firefox path", () => {
      expect(linux).toContainEqual(
        join(homedir(), ".mozilla", "firefox"),
      );
    });

    it("includes the XDG-style ~/.config/mozilla/firefox path", () => {
      expect(linux).toContainEqual(
        join(homedir(), ".config", "mozilla", "firefox"),
      );
    });
  });
});

describe("BROWSER_PATHS", () => {
  describe("linux firefox paths", () => {
    const firefoxPaths = BROWSER_PATHS.linux.firefox;

    it("includes the traditional ~/.mozilla/firefox path", () => {
      expect(firefoxPaths).toContainEqual(`${homedir()}/.mozilla/firefox`);
    });

    it("includes the XDG-style ~/.config/mozilla/firefox path", () => {
      expect(firefoxPaths).toContainEqual(
        `${homedir()}/.config/mozilla/firefox`,
      );
    });
  });
});

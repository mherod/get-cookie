import { platform as osPlatform } from "node:os";
import {
  assertPlatformSupported,
  getExecutableExtension,
  getPathSeparator,
  getPlatform,
  getPlatformDisplayName,
  isLinux,
  isMacOS,
  isPlatform,
  isPlatformSupported,
  isUnixLike,
  isWindows,
} from "../platformUtils";

// Mock the os module
jest.mock("node:os", () => ({
  platform: jest.fn(),
}));

describe("platformUtils", () => {
  const mockPlatform = osPlatform as jest.MockedFunction<typeof osPlatform>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getPlatform", () => {
    it("should return darwin for macOS", () => {
      mockPlatform.mockReturnValue("darwin");
      expect(getPlatform()).toBe("darwin");
    });

    it("should return win32 for Windows", () => {
      mockPlatform.mockReturnValue("win32");
      expect(getPlatform()).toBe("win32");
    });

    it("should return linux for Linux", () => {
      mockPlatform.mockReturnValue("linux");
      expect(getPlatform()).toBe("linux");
    });

    it("should return unknown for unsupported platforms", () => {
      mockPlatform.mockReturnValue("freebsd" as NodeJS.Platform);
      expect(getPlatform()).toBe("unknown");
    });
  });

  describe("Platform check functions", () => {
    describe("isMacOS", () => {
      it("should return true for darwin", () => {
        mockPlatform.mockReturnValue("darwin");
        expect(isMacOS()).toBe(true);
      });

      it("should return false for other platforms", () => {
        mockPlatform.mockReturnValue("win32");
        expect(isMacOS()).toBe(false);
      });
    });

    describe("isWindows", () => {
      it("should return true for win32", () => {
        mockPlatform.mockReturnValue("win32");
        expect(isWindows()).toBe(true);
      });

      it("should return false for other platforms", () => {
        mockPlatform.mockReturnValue("darwin");
        expect(isWindows()).toBe(false);
      });
    });

    describe("isLinux", () => {
      it("should return true for linux", () => {
        mockPlatform.mockReturnValue("linux");
        expect(isLinux()).toBe(true);
      });

      it("should return false for other platforms", () => {
        mockPlatform.mockReturnValue("win32");
        expect(isLinux()).toBe(false);
      });
    });

    describe("isUnixLike", () => {
      it("should return true for darwin", () => {
        mockPlatform.mockReturnValue("darwin");
        expect(isUnixLike()).toBe(true);
      });

      it("should return true for linux", () => {
        mockPlatform.mockReturnValue("linux");
        expect(isUnixLike()).toBe(true);
      });

      it("should return false for Windows", () => {
        mockPlatform.mockReturnValue("win32");
        expect(isUnixLike()).toBe(false);
      });
    });
  });

  describe("isPlatformSupported", () => {
    it("should return true for supported platforms", () => {
      const supportedPlatforms = ["darwin", "win32", "linux"] as const;
      for (const platform of supportedPlatforms) {
        mockPlatform.mockReturnValue(platform);
        expect(isPlatformSupported()).toBe(true);
      }
    });

    it("should return false for unsupported platforms", () => {
      mockPlatform.mockReturnValue("freebsd" as NodeJS.Platform);
      expect(isPlatformSupported()).toBe(false);
    });
  });

  describe("getPlatformDisplayName", () => {
    it("should return macOS for darwin", () => {
      mockPlatform.mockReturnValue("darwin");
      expect(getPlatformDisplayName()).toBe("macOS");
    });

    it("should return Windows for win32", () => {
      mockPlatform.mockReturnValue("win32");
      expect(getPlatformDisplayName()).toBe("Windows");
    });

    it("should return Linux for linux", () => {
      mockPlatform.mockReturnValue("linux");
      expect(getPlatformDisplayName()).toBe("Linux");
    });

    it("should return Unknown Platform for unsupported", () => {
      mockPlatform.mockReturnValue("freebsd" as NodeJS.Platform);
      expect(getPlatformDisplayName()).toBe("Unknown Platform");
    });
  });

  describe("assertPlatformSupported", () => {
    it("should not throw for supported platforms", () => {
      const supportedPlatforms = ["darwin", "win32", "linux"] as const;
      for (const platform of supportedPlatforms) {
        mockPlatform.mockReturnValue(platform);
        expect(() => assertPlatformSupported()).not.toThrow();
      }
    });

    it("should throw for unsupported platforms", () => {
      mockPlatform.mockReturnValue("freebsd" as NodeJS.Platform);
      expect(() => assertPlatformSupported()).toThrow(
        "Platform freebsd is not supported. Supported platforms: macOS, Windows, Linux",
      );
    });
  });

  describe("getPathSeparator", () => {
    it("should return backslash for Windows", () => {
      mockPlatform.mockReturnValue("win32");
      expect(getPathSeparator()).toBe("\\");
    });

    it("should return forward slash for Unix-like systems", () => {
      mockPlatform.mockReturnValue("darwin");
      expect(getPathSeparator()).toBe("/");

      mockPlatform.mockReturnValue("linux");
      expect(getPathSeparator()).toBe("/");
    });
  });

  describe("getExecutableExtension", () => {
    it("should return .exe for Windows", () => {
      mockPlatform.mockReturnValue("win32");
      expect(getExecutableExtension()).toBe(".exe");
    });

    it("should return empty string for Unix-like systems", () => {
      mockPlatform.mockReturnValue("darwin");
      expect(getExecutableExtension()).toBe("");

      mockPlatform.mockReturnValue("linux");
      expect(getExecutableExtension()).toBe("");
    });
  });

  describe("isPlatform", () => {
    it("should correctly match platform strings", () => {
      mockPlatform.mockReturnValue("darwin");
      expect(isPlatform("darwin")).toBe(true);
      expect(isPlatform("win32")).toBe(false);
    });

    it("should handle any platform string", () => {
      mockPlatform.mockReturnValue("freebsd" as NodeJS.Platform);
      expect(isPlatform("freebsd")).toBe(true);
      expect(isPlatform("darwin")).toBe(false);
    });
  });
});

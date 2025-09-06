import { platform as osPlatform } from "node:os";

import {
  assertPlatformSupported,
  clearPlatformCache,
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

const mockPlatform = osPlatform as jest.MockedFunction<typeof osPlatform>;

// Clear platform cache before each test to ensure clean state
beforeEach(() => {
  clearPlatformCache();
});

describe("platformUtils - getPlatform", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  it("should return the actual platform from os.platform()", () => {
    mockPlatform.mockReturnValue("freebsd");
    expect(getPlatform()).toBe("freebsd");
  });

  it("should cache the result", () => {
    mockPlatform.mockReturnValue("darwin");
    getPlatform();
    getPlatform();
    expect(mockPlatform).toHaveBeenCalledTimes(1);
  });
});

describe("platformUtils - isMacOS", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return true for darwin", () => {
    mockPlatform.mockReturnValue("darwin");
    expect(isMacOS()).toBe(true);
  });

  it("should return false for non-darwin", () => {
    mockPlatform.mockReturnValue("win32");
    expect(isMacOS()).toBe(false);
  });
});

describe("platformUtils - isWindows", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return true for win32", () => {
    mockPlatform.mockReturnValue("win32");
    expect(isWindows()).toBe(true);
  });

  it("should return false for non-win32", () => {
    mockPlatform.mockReturnValue("darwin");
    expect(isWindows()).toBe(false);
  });
});

describe("platformUtils - isLinux", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return true for linux", () => {
    mockPlatform.mockReturnValue("linux");
    expect(isLinux()).toBe(true);
  });

  it("should return false for non-linux", () => {
    mockPlatform.mockReturnValue("darwin");
    expect(isLinux()).toBe(false);
  });
});

describe("platformUtils - isUnixLike", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  it("should return true for other Unix-like systems", () => {
    mockPlatform.mockReturnValue("freebsd");
    expect(isUnixLike()).toBe(true);
  });
});

describe("platformUtils - isPlatformSupported", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return true for darwin", () => {
    mockPlatform.mockReturnValue("darwin");
    expect(isPlatformSupported()).toBe(true);
  });

  it("should return true for win32", () => {
    mockPlatform.mockReturnValue("win32");
    expect(isPlatformSupported()).toBe(true);
  });

  it("should return true for linux", () => {
    mockPlatform.mockReturnValue("linux");
    expect(isPlatformSupported()).toBe(true);
  });

  it("should return false for unsupported platforms", () => {
    mockPlatform.mockReturnValue("aix");
    expect(isPlatformSupported()).toBe(false);
  });
});

describe("platformUtils - getPlatformDisplayName", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  it("should return the raw platform name for unknown platforms", () => {
    mockPlatform.mockReturnValue("aix");
    expect(getPlatformDisplayName()).toBe("aix");
  });
});

describe("platformUtils - assertPlatformSupported", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should not throw for supported platforms", () => {
    mockPlatform.mockReturnValue("darwin");
    expect(() => assertPlatformSupported()).not.toThrow();
  });

  it("should throw for unsupported platforms", () => {
    mockPlatform.mockReturnValue("aix");
    expect(() => assertPlatformSupported()).toThrow(
      "Unsupported platform: aix",
    );
  });

  it("should include supported platforms in error message", () => {
    mockPlatform.mockReturnValue("aix");
    expect(() => assertPlatformSupported()).toThrow(
      "Supported platforms are: darwin, win32, linux",
    );
  });
});

describe("platformUtils - getPathSeparator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

describe("platformUtils - getExecutableExtension", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

describe("platformUtils - isPlatform", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return true when platform matches", () => {
    mockPlatform.mockReturnValue("darwin");
    expect(isPlatform("darwin")).toBe(true);
  });

  it("should return false when platform doesn't match", () => {
    mockPlatform.mockReturnValue("darwin");
    expect(isPlatform("win32")).toBe(false);
  });

  it("should work with multiple platform arguments", () => {
    mockPlatform.mockReturnValue("linux");
    expect(isPlatform("darwin", "linux", "win32")).toBe(true);
    expect(isPlatform("darwin", "win32")).toBe(false);
  });
});

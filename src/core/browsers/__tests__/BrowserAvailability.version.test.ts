/**
 * Tests for getBrowserVersionAsync and its platform-specific command selection.
 *
 * Kept in a separate file from BrowserAvailability.test.ts so the platform
 * mocks here do not perturb the deterministic homedir-based path assertions
 * in the sibling suite.
 */

import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from "@jest/globals";

jest.mock("@utils/execSimple", () => ({
  execSimple: jest.fn(),
}));

jest.mock("@utils/platformUtils", () => {
  const actual = jest.requireActual<typeof import("@utils/platformUtils")>(
    "@utils/platformUtils",
  );
  return {
    ...actual,
    getPlatform: jest.fn().mockReturnValue("darwin"),
    isMacOS: jest.fn().mockReturnValue(true),
    isWindows: jest.fn().mockReturnValue(false),
    isLinux: jest.fn().mockReturnValue(false),
  };
});

import { getBrowserVersionAsync } from "../BrowserAvailability";
import { execSimple } from "@utils/execSimple";
import { isMacOS, isLinux } from "@utils/platformUtils";

const mockExecSimple = execSimple as jest.MockedFunction<typeof execSimple>;
const mockIsMacOS = isMacOS as jest.MockedFunction<typeof isMacOS>;
const mockIsLinux = isLinux as jest.MockedFunction<typeof isLinux>;

function setMacOS(): void {
  mockIsMacOS.mockReturnValue(true);
  mockIsLinux.mockReturnValue(false);
}

function setLinux(): void {
  mockIsMacOS.mockReturnValue(false);
  mockIsLinux.mockReturnValue(true);
}

function setWindows(): void {
  // Both helpers return false on Windows; the function falls through.
  mockIsMacOS.mockReturnValue(false);
  mockIsLinux.mockReturnValue(false);
}

describe("getBrowserVersionAsync", () => {
  beforeEach(() => {
    mockExecSimple.mockReset();
    setMacOS();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("successful version detection", () => {
    it("returns trimmed stdout for a macOS browser command", async () => {
      mockExecSimple.mockResolvedValueOnce({
        stdout: "Google Chrome 130.0.6723.117\n",
        stderr: "",
      });

      await expect(getBrowserVersionAsync("chrome")).resolves.toBe(
        "Google Chrome 130.0.6723.117",
      );
      expect(mockExecSimple).toHaveBeenCalledTimes(1);
      expect(mockExecSimple).toHaveBeenCalledWith(
        expect.stringContaining("Google\\ Chrome"),
      );
    });

    it("returns trimmed stdout for a Linux browser command", async () => {
      setLinux();
      mockExecSimple.mockResolvedValueOnce({
        stdout: "Mozilla Firefox 131.0\n",
        stderr: "",
      });

      await expect(getBrowserVersionAsync("firefox")).resolves.toBe(
        "Mozilla Firefox 131.0",
      );
      expect(mockExecSimple).toHaveBeenCalledTimes(1);
      expect(mockExecSimple).toHaveBeenCalledWith(
        expect.stringContaining("firefox --version"),
      );
    });

    it("trims surrounding whitespace from the version string", async () => {
      mockExecSimple.mockResolvedValueOnce({
        stdout: "   Brave Browser 1.71.121   \n",
        stderr: "",
      });

      await expect(getBrowserVersionAsync("brave")).resolves.toBe(
        "Brave Browser 1.71.121",
      );
    });
  });

  describe("platform-specific command selection", () => {
    it("uses the macOS .app bundle path on darwin", async () => {
      setMacOS();
      mockExecSimple.mockResolvedValueOnce({ stdout: "x\n", stderr: "" });

      await getBrowserVersionAsync("edge");

      expect(mockExecSimple).toHaveBeenCalledWith(
        expect.stringContaining("/Applications/Microsoft\\ Edge.app"),
      );
    });

    it("uses the bare CLI command on linux", async () => {
      setLinux();
      mockExecSimple.mockResolvedValueOnce({ stdout: "y\n", stderr: "" });

      await getBrowserVersionAsync("chrome");

      const command = mockExecSimple.mock.calls[0]?.[0] ?? "";
      expect(command).toContain("google-chrome --version");
      expect(command).not.toContain("/Applications/");
    });

    it("does not invoke execSimple when no command exists for the browser on the platform", async () => {
      setLinux();
      // Linux has no command entry for safari; the function should short-circuit.
      const result = await getBrowserVersionAsync("safari");

      expect(result).toBeUndefined();
      expect(mockExecSimple).not.toHaveBeenCalled();
    });
  });

  describe("failure modes", () => {
    it("returns undefined when execSimple rejects", async () => {
      mockExecSimple.mockRejectedValueOnce(new Error("ENOENT"));

      await expect(getBrowserVersionAsync("chrome")).resolves.toBeUndefined();
    });

    it("returns undefined when stdout is empty after trimming", async () => {
      mockExecSimple.mockResolvedValueOnce({ stdout: "   \n", stderr: "" });

      await expect(getBrowserVersionAsync("chrome")).resolves.toBeUndefined();
    });

    it("returns undefined on Windows where version detection is unsupported", async () => {
      setWindows();

      const result = await getBrowserVersionAsync("chrome");

      expect(result).toBeUndefined();
      expect(mockExecSimple).not.toHaveBeenCalled();
    });
  });
});

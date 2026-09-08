import { exec, execFile } from "node:child_process";

import * as browserControl from "@utils/browserControl";
import { execSimple } from "@utils/execSimple";
import { isWindows } from "@utils/platformUtils";
import { isBrowserRunning } from "@utils/processDetector";

import type { ExportedCookie } from "../../../../types/schemas";
import { clearPlatformControlInstance } from "../../platform/PlatformBrowserControl";
import { ChromiumCookieQueryStrategy } from "../ChromiumCookieQueryStrategy";

jest.mock("node:child_process", () => {
  const mockExec = jest.fn();
  const mockExecFile = jest.fn();
  const custom = Symbol.for("nodejs.util.promisify.custom");
  Object.defineProperty(mockExec, custom, {
    value: mockExec,
    configurable: true,
  });
  Object.defineProperty(mockExecFile, custom, {
    value: mockExecFile,
    configurable: true,
  });
  return {
    ...jest.requireActual("node:child_process"),
    exec: mockExec,
    execFile: mockExecFile,
  };
});
jest.mock("@utils/execSimple", () => ({ execSimple: jest.fn() }));
jest.mock("@utils/fileHandleDetector", () => ({
  detectFileHandles: jest.fn().mockResolvedValue([]),
}));
jest.mock("@utils/platformUtils", () => ({
  ...jest.requireActual("@utils/platformUtils"),
  getPlatform: jest.fn(() => "darwin"),
  isMacOS: jest.fn(() => true),
  isWindows: jest.fn(() => false),
  isPlatformSupported: jest.fn(() => true),
}));
jest.mock("../../chrome/getChromiumPassword", () => ({
  getChromiumPassword: jest.fn().mockResolvedValue("password"),
}));

const mockExec = exec as unknown as jest.Mock<
  Promise<{ stdout: string; stderr: string }>,
  [string]
>;
const mockExecFile = execFile as unknown as jest.Mock<
  Promise<{ stdout: string; stderr: string }>
>;

class LockedStrategy extends ChromiumCookieQueryStrategy {
  private attempts = 0;
  protected override async processFile(): Promise<ExportedCookie[]> {
    if (this.attempts++ === 0) {
      throw new Error("database is locked");
    }
    return [{ domain: "example.com", name: "session", value: "recovered" }];
  }
}

const browsers = [
  { selector: "chromium", name: "Chromium", process: "chrome.exe" },
  { selector: "whale", name: "Whale", process: "whale.exe" },
] as const;
const forBrowser = describe.each(browsers);
forBrowser("$name lock recovery", ({ selector, name, process }) => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearPlatformControlInstance();
    jest.mocked(isWindows).mockReturnValue(false);
    jest.mocked(execSimple).mockResolvedValue({
      stdout: `user 123 0 0 0 0 ?? S 0 0 /Applications/${name}.app/Contents/MacOS/${name}`,
      stderr: "",
    });
    mockExecFile.mockResolvedValue({ stdout: "", stderr: "" });
  });
  afterEach(() => jest.restoreAllMocks());

  it("detects, closes and relaunches the selected browser after a locked query", async () => {
    const close = jest
      .spyOn(browserControl, "closeBrowserGracefully")
      .mockResolvedValue(true);
    const wait = jest
      .spyOn(browserControl, "waitForBrowserToClose")
      .mockResolvedValue(true);
    const rows = await new LockedStrategy(selector).queryCookies(
      "session",
      "example.com",
      "/test/Cookies",
    );
    expect(rows[0]?.value).toBe("recovered");
    expect(execSimple).toHaveBeenCalledWith(
      `ps aux | grep -i '${selector}' | grep -v grep`,
    );
    expect(close).toHaveBeenCalledWith(name, {
      interactive: true,
      force: false,
    });
    expect(wait).toHaveBeenCalledWith(name, 5000);
    expect(mockExecFile).toHaveBeenCalledWith(
      "osascript",
      ["-e", `tell application "${name}" to activate`],
      expect.any(Object),
    );
  });

  it("uses the selected macOS application for graceful quit", async () => {
    mockExec
      .mockResolvedValueOnce({ stdout: "true", stderr: "" })
      .mockResolvedValueOnce({ stdout: "", stderr: "" })
      .mockResolvedValueOnce({ stdout: "false", stderr: "" });
    await expect(
      browserControl.closeBrowserGracefully(name, { force: true }),
    ).resolves.toBe(true);
    expect(mockExec).toHaveBeenCalledWith(
      `osascript -e 'tell application "${name}" to quit'`,
    );
    expect(
      mockExec.mock.calls.every(
        ([command]) => !command.includes("Google Chrome"),
      ),
    ).toBe(true);
  });

  it("uses the browser executable for Windows process detection", async () => {
    jest.mocked(isWindows).mockReturnValue(true);
    jest.mocked(execSimple).mockResolvedValue({
      stdout: `"${process}","123","Console","1","1,024 K"`,
      stderr: "",
    });
    expect(await isBrowserRunning(name)).toEqual([
      expect.objectContaining({ pid: 123, command: process }),
    ]);
    expect(execSimple).toHaveBeenCalledWith(
      `tasklist /FI "IMAGENAME eq ${process}" /FO CSV | findstr /i "${process}"`,
    );
  });
});

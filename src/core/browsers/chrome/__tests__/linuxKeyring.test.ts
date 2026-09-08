import { execFile } from "node:child_process";
import {
  getLinuxKeyringOverride,
  usesRawCookieValues,
  withCookieQueryOptions,
  withRawCookieValues,
} from "../../../cookies/CookieQueryContext";
import {
  getChromiumPassword,
  resetChromiumPasswordCache,
} from "../getChromiumPassword";
import {
  getChromePassword,
  selectLinuxKeyring,
} from "../linux/getChromePassword";

jest.mock("node:child_process", () => {
  const execute = jest.fn();
  Object.assign(execute, { [require("node:util").promisify.custom]: execute });
  return { ...jest.requireActual("node:child_process"), execFile: execute };
});
jest.mock("@utils/platformUtils", () => ({
  getPlatform: () => "linux",
  assertPlatformSupported: jest.fn(),
}));
const execute = execFile as unknown as jest.Mock;

describe("Linux Safe Storage", () => {
  beforeEach(() => {
    execute.mockReset().mockRejectedValue(new Error("command unavailable"));
    resetChromiumPasswordCache();
  });
  const desktops: Array<[NodeJS.ProcessEnv, string]> = [
    [{ XDG_CURRENT_DESKTOP: "ubuntu:GNOME" }, "gnome"],
    [{ XDG_CURRENT_DESKTOP: "KDE", KDE_SESSION_VERSION: "6" }, "kwallet6"],
    [{ XDG_CURRENT_DESKTOP: "KDE", KDE_SESSION_VERSION: "5" }, "kwallet5"],
    [{ DESKTOP_SESSION: "kde4" }, "kwallet"],
    [{ DESKTOP_SESSION: "xfce" }, "gnome"],
    [{ GNOME_DESKTOP_SESSION_ID: "legacy" }, "gnome"],
    [{ KDE_FULL_SESSION: "true", KDE_SESSION_VERSION: "5" }, "kwallet5"],
    [{}, "basic"],
  ];
  const forDesktop = it.each(desktops);
  forDesktop("selects the desktop store for %j", (env, expected) => {
    expect(selectLinuxKeyring(undefined, env)).toBe(expected);
    expect(selectLinuxKeyring("basic", env)).toBe("basic");
    expect(selectLinuxKeyring("gnome", env)).toBe("gnome");
  });
  it("uses basic storage without a subprocess", async () => {
    expect(await getChromePassword("chrome", "basic")).toBe("peanuts");
    expect(execute).not.toHaveBeenCalled();
  });
  const names = [
    ["chrome", "chrome"],
    ["brave", "brave"],
    ["edge", "chromium"],
    ["opera", "chromium"],
    ["vivaldi", "chrome"],
    ["whale", "whale"],
  ] as const;
  const forBrowser = it.each(names);
  forBrowser("looks up the Linux label for %s", async (browser, name) => {
    execute.mockResolvedValueOnce({ stdout: " secret with spaces \n" });
    expect(await getChromePassword(browser, "gnome")).toBe(
      " secret with spaces ",
    );
    expect(execute).toHaveBeenCalledWith(
      "secret-tool",
      ["lookup", "application", `${name}-libsecret-password-v2`],
      expect.objectContaining({ timeout: 5000 }),
    );
  });
  it("falls back to GNOME item labels", async () => {
    execute
      .mockResolvedValueOnce({ stdout: "" })
      .mockResolvedValueOnce({ stdout: "" })
      .mockResolvedValueOnce({ stdout: "label-secret\n" });
    expect(await getChromePassword("brave", "gnome")).toBe("label-secret");
    expect(execute).toHaveBeenLastCalledWith(
      "python3",
      ["-c", expect.stringContaining("item.get_label()"), "Brave Safe Storage"],
      expect.any(Object),
    );
  });
  it("passes the network wallet literally with the browser Keys folder", async () => {
    const wallet = "wallet $(never-execute)";
    execute
      .mockResolvedValueOnce({ stdout: `${wallet}\n` })
      .mockResolvedValueOnce({ stdout: "wallet-secret\n" });
    expect(await getChromePassword("edge", "kwallet")).toBe("wallet-secret");
    expect(execute).toHaveBeenLastCalledWith(
      "kwallet-query",
      [
        "--read-password",
        "Chromium Safe Storage",
        "--folder",
        "Chromium Keys",
        wallet,
      ],
      expect.any(Object),
    );
  });
  it("uses the default wallet after D-Bus failure, then basic storage for a missing entry", async () => {
    execute
      .mockRejectedValueOnce(new Error("D-Bus unavailable"))
      .mockResolvedValueOnce({ stdout: "Failed to read entry\n" });
    expect(await getChromePassword("brave", "kwallet")).toBe("peanuts");
    expect(execute).toHaveBeenLastCalledWith(
      "kwallet-query",
      [
        "--read-password",
        "Brave Safe Storage",
        "--folder",
        "Brave Keys",
        "kdewallet",
      ],
      expect.any(Object),
    );
  });
  it("falls back when all selected backend commands fail", async () => {
    expect(await getChromePassword("chrome", "gnome")).toBe("peanuts");
    expect(execute).toHaveBeenCalledTimes(3);
  });
  it("isolates concurrent overrides through raw-value queries and caching", async () => {
    execute.mockResolvedValue({ stdout: "gnome-secret\n" });
    const query = (keyring: "basic" | "gnome") =>
      withCookieQueryOptions({ keyring }, () =>
        withRawCookieValues(async () => {
          await Promise.resolve();
          expect(getLinuxKeyringOverride()).toBe(keyring);
          expect(usesRawCookieValues()).toBe(true);
          return getChromiumPassword("chrome");
        }),
      );
    expect(
      await Promise.all([query("basic"), query("gnome"), query("basic")]),
    ).toEqual(["peanuts", "gnome-secret", "peanuts"]);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(getLinuxKeyringOverride()).toBeUndefined();
    expect(usesRawCookieValues()).toBe(false);
  });
});

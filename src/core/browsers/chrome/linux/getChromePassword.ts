import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { LinuxKeyring } from "../../../cookies/CookieQueryContext";
import type { ChromiumBrowser } from "../ChromiumBrowsers";

const execute = promisify(execFile);
type KeyringBackend = "basic" | "gnome" | "kwallet" | "kwallet5" | "kwallet6";

// Linux labels differ from macOS for Edge, Opera and Vivaldi.
// https://github.com/yt-dlp/yt-dlp/blob/master/yt_dlp/cookies.py
const KEYRING_NAMES: Record<ChromiumBrowser, string> = {
  chrome: "Chrome",
  chromium: "Chromium",
  brave: "Brave",
  edge: "Chromium",
  arc: "Arc",
  opera: "Chromium",
  "opera-gx": "Chromium",
  vivaldi: "Chrome",
  whale: "Whale",
};

/** Selects the desktop's keyring without invoking any external commands. */
export function selectLinuxKeyring(
  override?: LinuxKeyring,
  env: NodeJS.ProcessEnv = process.env,
): KeyringBackend {
  const wallet =
    env.KDE_SESSION_VERSION === "6"
      ? "kwallet6"
      : env.KDE_SESSION_VERSION === "5"
        ? "kwallet5"
        : "kwallet";
  if (override === "kwallet") {
    return wallet;
  }
  if (override !== undefined) {
    return override;
  }
  const desktops = (env.XDG_CURRENT_DESKTOP ?? "").toLowerCase().split(":");
  for (const desktop of desktops) {
    if (desktop.trim() === "kde") {
      return wallet;
    }
    if (
      [
        "gnome",
        "unity",
        "x-cinnamon",
        "cinnamon",
        "mate",
        "xfce",
        "pantheon",
        "deepin",
        "ukui",
      ].includes(desktop.trim())
    ) {
      return "gnome";
    }
  }
  const session = (env.DESKTOP_SESSION ?? "").toLowerCase();
  if (session.includes("kde") || session.includes("plasma")) {
    return wallet;
  }
  if (
    [
      "gnome",
      "mate",
      "unity",
      "cinnamon",
      "xfce",
      "xubuntu",
      "deepin",
      "pantheon",
      "ukui",
    ].some((name) => session.includes(name))
  ) {
    return "gnome";
  }
  if (env.GNOME_DESKTOP_SESSION_ID) {
    return "gnome";
  }
  if (env.KDE_FULL_SESSION && env.KDE_FULL_SESSION !== "false") {
    return wallet;
  }
  return "basic";
}

async function readCommand(
  command: string,
  args: string[],
): Promise<string | undefined> {
  try {
    // Wallet names come from D-Bus; pass them as arguments, never shell source.
    const { stdout } = await execute(command, args, {
      encoding: "utf8",
      timeout: 5000,
      maxBuffer: 64 * 1024,
    });
    const value = stdout.replace(/\r?\n$/, "");
    return value &&
      value !== "None" &&
      !value.toLowerCase().startsWith("failed to read")
      ? value
      : undefined;
  } catch {
    return undefined;
  }
}

async function readGnomePassword(name: string): Promise<string | undefined> {
  const application = name.toLowerCase();
  for (const app of [`${application}-libsecret-password-v2`, application]) {
    const password = await readCommand("secret-tool", [
      "lookup",
      "application",
      app,
    ]);
    if (password !== undefined) {
      return password;
    }
  }
  return readCommand("python3", [
    "-c",
    "import contextlib, secretstorage, sys\nwith contextlib.closing(secretstorage.dbus_init()) as connection:\n for item in secretstorage.get_default_collection(connection).get_all_items():\n  if item.get_label() == sys.argv[1]:\n   sys.stdout.buffer.write(item.get_secret() + b'\\n'); break",
    `${name} Safe Storage`,
  ]);
}

async function readWalletPassword(
  name: string,
  backend: KeyringBackend,
): Promise<string | undefined> {
  const daemon =
    backend === "kwallet6"
      ? "kwalletd6"
      : backend === "kwallet5"
        ? "kwalletd5"
        : "kwalletd";
  const wallet =
    (
      await readCommand("dbus-send", [
        "--session",
        "--print-reply=literal",
        `--dest=org.kde.${daemon}`,
        `/modules/${daemon}`,
        "org.kde.KWallet.networkWallet",
      ])
    )?.trim() || "kdewallet";
  return readCommand("kwallet-query", [
    "--read-password",
    `${name} Safe Storage`,
    "--folder",
    `${name} Keys`,
    wallet,
  ]);
}

/** Reads the selected browser's Linux Safe Storage password, then falls back to basic storage. */
export async function getChromePassword(
  browser: ChromiumBrowser = "chrome",
  override?: LinuxKeyring,
): Promise<string> {
  const backend = selectLinuxKeyring(override);
  if (backend === "basic") {
    return "peanuts";
  }
  const name = KEYRING_NAMES[browser];
  if (!name) {
    throw new Error(`Unknown browser type: ${browser}`);
  }
  const password =
    backend === "gnome"
      ? await readGnomePassword(name)
      : await readWalletPassword(name, backend);
  return password ?? "peanuts";
}

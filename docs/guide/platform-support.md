# Platform Support Guide

For the definitive selector-by-platform table, use the
[Browser Support Reference](./browser-support.md). This page covers the
operating-system requirements behind that matrix.

## Supported operating systems

Chromium and Firefox strategies are implemented for macOS, Linux, and Windows.
Safari is intentionally skipped outside macOS. The code does not support other
Node.js platform values.

## macOS

Chromium-family browsers need readable profile files plus access to a Safe
Storage secret in Keychain. The service name depends on the browser, for
example `Chrome Safe Storage`, `Microsoft Edge Safe Storage`, or
`Brave Safe Storage`.

Firefox reads `cookies.sqlite` from Firefox profile directories. Safari reads
the modern `com.apple.Safari` container cookie file first and falls back to
the legacy `~/Library/Cookies/Cookies.binarycookies` path.

Safari access can require Full Disk Access for the terminal or host
application. On a locked database, an interactive macOS run may ask before
closing the browser, retrying, and relaunching it. `--force` suppresses those
interactive remediation prompts; it does not bypass Keychain, file, or
container permissions.

## Linux

Chromium-family strategies read the browser's user-data directory and try these
Safe Storage sources in order:

1. GNOME Keyring through `secret-tool`
2. Python's `keyring` module
3. KWallet
4. Chromium's historical `peanuts` fallback

Firefox discovery covers native `~/.mozilla/firefox`, XDG
`$XDG_CONFIG_HOME/mozilla/firefox`, Snap, and Flatpak profile roots. Safari is
not available on Linux.

The current code uses local SQLite access, so readable profile directories and
cookie files are required. A missing keyring can make encrypted Chromium
cookies unreadable even when the database itself is accessible.

## Windows

Chromium-family browsers read `Local State`, unwrap the master key with
Windows DPAPI, and decrypt modern `v10` cookies with AES-256-GCM. Real DPAPI
decryption requires the optional native `@primno/dpapi` package to be
available in the installation.

Firefox discovery covers roaming profile roots for regular Firefox, Firefox
Developer Edition, and Firefox ESR. Safari is not available on Windows.

Arc is a special case: the query strategy has a Windows path, while browser
availability detection still marks Arc unavailable. Treat Windows Arc as
verify-locally rather than a guaranteed support promise; see the
[canonical matrix](./browser-support.md).

## Runtime requirements

The package declares Node.js `^20`, `^22`, `^24`, `^25`, or `^26`.
The root import auto-detects the runtime. Use
`@mherod/get-cookie/node` to force `better-sqlite3`, or
`@mherod/get-cookie/bun` to force `bun:sqlite`.

## Practical checks

Use the CLI itself before inspecting private browser directories manually:

```bash
get-cookie --browser chrome --list-profiles
get-cookie --browser firefox --list-profiles
get-cookie % example.com --browser chrome --verbose
```

For permission and decryption caveats, see [Security & Privacy](./security.md).
For symptoms and recovery steps, see [Troubleshooting](./troubleshooting.md).

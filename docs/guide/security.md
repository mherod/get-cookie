# Security & Privacy Guide

`get-cookie` reads authentication material from local browser stores. Treat
every returned value as a live credential, even when it looks harmless.

## What the tool accesses

- Chromium-family cookie databases and their platform Safe Storage secret
- Firefox `cookies.sqlite` files and optional `containers.json`
- Safari's macOS `Cookies.binarycookies` file

Extraction and decryption happen locally in the process. The package does not
need a remote service to read cookies, but your own shell commands, logs, files,
and downstream HTTP clients can still expose the values.

## Safe handling

- Run only against accounts and browser profiles you are authorized to access.
- Avoid pasting raw output into chat, issue trackers, CI logs, or shared
  terminals.
- Prefer the default value-only output for a single cookie; `--dump`,
  `--dump-grouped`, and `--output json` include complete cookie objects and
  source metadata.
- Do not commit cookie exports, shell transcripts, or generated JSON files.
- Redact cookie values, JWTs, usernames in paths, and `--jwt-secret` values
  before sharing diagnostics.
- Remember that a secret passed with `--jwt-secret` may be visible in shell
  history or process listings.

## Platform credential boundaries

### macOS

Chromium-family decryption calls the `security` command for a browser-specific
Safe Storage entry. If a non-Chrome browser's entry is unavailable, the code
can try `Chrome Safe Storage` as a fallback. Do not copy or log the returned
secret.

Safari uses macOS container-protected files. When access is denied, an
interactive run can guide you to Full Disk Access for the terminal or host
application. Grant the narrowest access you need and revoke it when it is no
longer required.

### Windows

Chromium-family decryption reads the encrypted key from `Local State` and
unwraps it with DPAPI in the current Windows user context. The optional native
`@primno/dpapi` binding is required for real encrypted cookies; do not export
or persist the unwrapped key.

Firefox uses readable SQLite files without an extra browser encryption layer.
Filesystem access to the profile is therefore the main boundary.

### Linux

Chromium-family decryption tries `secret-tool`, Python `keyring`, and
KWallet before using Chromium's historical `peanuts` fallback. A fallback
result does not mean every cookie can be decrypted; it must match how that
browser stored its data.

Firefox reads local SQLite files from native, XDG, Snap, or Flatpak profile
roots. Keep those directories private to the owning user.

## Browser locks and prompts

When a database is locked, an interactive macOS run can ask whether to close
the browser, retry the read, and relaunch it. This is a user-visible state
change. Decline the prompt if closing the browser would be disruptive.

`--force` suppresses interactive close and Safari permission prompts. It does
not grant access, unlock a database, or bypass encryption.

## Reporting problems safely

Use `--verbose` and report the OS, runtime, browser selector, profile name,
and exact error text. Redact:

- cookie names and values when they identify an account
- JWT payloads and signing secrets
- account emails shown by `--list-profiles`
- absolute paths containing usernames

For symptom-specific recovery, see [Troubleshooting](./troubleshooting.md).

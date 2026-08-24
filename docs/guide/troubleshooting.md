# Troubleshooting Guide

Start with the exact symptom below. Use `--verbose` for diagnostics, and
redact cookie values, JWTs, account emails, and personal paths before sharing
output.

## The CLI says `No results`

First verify the query shape and selector:

```bash
get-cookie % example.com --browser chrome --verbose
get-cookie --browser chrome --list-profiles
```

Then check:

- Use `%` for all names. A standalone `*` is accepted, but partial shell
  globs such as `session*` are not name wildcards.
- For a single-label host such as `localhost`, pass that domain explicitly.
  The default SQL-backed domain pattern `%` can omit single-label stored
  domains.
- Pass the bare domain, such as `example.com`; normal domain matching already
  includes subdomains.
- Use `--url https://app.example.com/path` only for local inspection when you
  want the hostname and parent-domain specs generated for you. It currently
  does not stop at public suffixes. More generally, `--render` does not prove
  exact destination applicability, so do not send rendered output as a generic
  outgoing request header.
- Add `--include-all` if deduplication may be hiding another row.
- `--include-expired` is currently accepted but not applied by
  `CookieQueryService`; browser-specific expiry behavior still controls the
  result. Do not assume the flag can recover an expired row.

An empty result can also mean the store was unreadable or decryption failed,
because browser strategies recover many failures by returning an empty array.

## A profile is missing or ignored

List profiles for the selected browser:

```bash
get-cookie --browser chrome --list-profiles
get-cookie --browser firefox --list-profiles
```

Use the displayed profile name with an explicit selector:

```bash
get-cookie session example.com --browser chrome --profile "Work"
get-cookie session example.com --browser firefox --profile "default-release"
```

Chromium matching is case-insensitive against the display name or directory
name. Firefox matching is case-insensitive against `profiles.ini` `Name`.
`--profile` is not applied by the default all-browser composite, and Safari
does not support named profiles.

## A Firefox container returns nothing

Use Firefox explicitly and pass a container name, numeric ID, or `none`:

```bash
get-cookie session example.com --browser firefox --container Work
get-cookie session example.com --browser firefox --container 2
get-cookie session example.com --browser firefox --container none
```

Names come from the selected profile's `containers.json`. If a name is
unknown, try its numeric user-context ID. `--container` is ignored for
non-Firefox selectors.

## The database is locked

Close the browser and rerun the same command. In an interactive macOS terminal,
the tool can ask before closing a detected browser, retrying, and relaunching
it.

```bash
get-cookie session example.com --browser firefox --verbose
```

`--force` suppresses that interactive remediation; it does not unlock the
file:

```bash
get-cookie session example.com --browser firefox --force --verbose
```

In CI or another non-interactive environment, close the browser before running
the command or expect a locked store to return no results.

## macOS Keychain access fails

The selected Chromium browser needs its Safe Storage entry. Check that the
entry exists without printing the secret:

```bash
security find-generic-password -s "Chrome Safe Storage"
```

For Edge, Brave, Arc, Opera, Opera GX, or Vivaldi, the service name differs.
Unlock Keychain, allow the terminal or host application when macOS prompts, and
rerun with `--verbose`. Do not paste Safe Storage values into logs or issues.

## Safari reports permission denied

Safari reads the modern container file first:

```text
~/Library/Containers/com.apple.Safari/Data/Library/Cookies/Cookies.binarycookies
```

Grant Full Disk Access to the terminal or host application in System Settings

> Privacy & Security, then rerun the command. Avoid `--force` while you want
> the interactive permission guidance, because it suppresses that prompt.

```bash
get-cookie % example.com --browser safari --verbose
```

Safari is skipped on Linux and Windows.

## Windows Chromium decryption fails

If the error mentions DPAPI or `@primno/dpapi`, make sure the package's
optional native dependency installed successfully for the current Windows
runtime. The browser's `Local State` file and profile directory must also be
readable by the same Windows user who owns the browser profile.

```bash
get-cookie session example.com --browser chrome --verbose
```

Do not copy the `Local State` encrypted key or decrypted cookie values into a
bug report.

## Linux Chromium decryption fails

The code tries GNOME Keyring, Python `keyring`, KWallet, then the historical
`peanuts` fallback. Check that the relevant helper exists and that the
browser profile is readable:

```bash
command -v secret-tool
get-cookie session example.com --browser chrome --verbose
```

A readable database is not enough if its Safe Storage secret cannot be
resolved.

## Output does not look as expected

Only `json` is accepted by `--output`:

```bash
get-cookie session example.com --output json
```

Other real output modes are:

```bash
get-cookie session example.com --dump
get-cookie session example.com --dump-grouped
get-cookie session example.com --render
get-cookie session example.com --render-grouped
```

Default output is unique non-empty values. `--dump` and `--output json`
produce JSON arrays; `--dump-grouped` groups by source file; `--render`
produces merged `name=value` pairs. Treat `--render` as a sensitive
serialization format, not a safe generic outgoing-request helper: matching a
domain does not prove exact destination applicability.

## The CLI rejects a flag

Run the built-in help:

```bash
get-cookie --help
```

The CLI has no `--debug-info` command, and `--version` is parsed but does not
currently print a version. Use `--verbose` for diagnostics and include the
package version from your package manager when reporting a problem.

## Still stuck?

Include:

- operating system and Node.js or Bun version
- browser selector and redacted profile/container name
- exact command with cookie values and secrets removed
- exact error text from `--verbose`

Do not attach cookie exports, JWT payloads, Safe Storage secrets, or unredacted
absolute paths.

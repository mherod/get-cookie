---
title: CLI reference
description: Authoritative syntax, flags, output modes, and examples for get-cookie.
---

# CLI reference

## Linux password stores

Linux detects GNOME/libsecret or KWallet from the desktop environment. KDE 5
and KDE 6 use their respective wallet services. Unknown desktops use basic
storage. Override detection when your browser uses a different store:

```bash
get-cookie --browser brave --keyring gnome --domain example.com
get-cookie --browser chrome --keyring kwallet --domain example.com
get-cookie --browser chrome --keyring basic --domain example.com
```

GNOME lookup uses `secret-tool`, with Python 3's `secretstorage` package as a
fallback for entries indexed by their Safe Storage label. KWallet uses
`dbus-send` and `kwallet-query`, including the browser's Keys folder and the
configured network wallet. Missing commands or entries fall back to Chromium's
basic password. On Linux, Edge and Opera use the Chromium keyring name, while
Vivaldi uses Chrome. The override applies only to Linux password lookup.

The CLI has no subcommands:

```text
get-cookie [name] [domain] [options]
```

With no arguments, it prints help. The positional arguments default to
`%`. For SQL-backed browsers, the default domain pattern can omit
single-label stored domains such as `localhost`; pass that domain explicitly
when it matters.

## First commands

```bash
# One cookie value
get-cookie sessionid example.com

# Every cookie for a domain, as structured data
get-cookie % example.com --output json

# One named cookie, rendered for local inspection
get-cookie sessionid app.example.com --render
```

The exact wildcard accepted by the CLI is `%`. A positional `*` is
normalized to `%`, but patterns such as `session*` are not rewritten; use
SQL-style `%` and `_` patterns instead.

## Query selection

| Option                   | Alias | Meaning                                                       |
| ------------------------ | ----- | ------------------------------------------------------------- |
| `[name]`                 |       | Positional cookie-name pattern; defaults to `%`.              |
| `[domain]`               |       | Positional domain pattern; defaults to `%` (see note above).  |
| `--name PATTERN`         | `-n`  | Cookie-name pattern.                                          |
| `--domain PATTERN`       | `-D`  | Cookie-domain pattern.                                        |
| `--url URL`              | `-u`  | Build `%` specs for the URL hostname and every parent domain. |
| `--browser BROWSER`      | `-b`  | Target one supported browser.                                 |
| `--profile NAME`         | `-p`  | Target a Chromium or Firefox profile.                         |
| `--container NAME_OR_ID` | `-c`  | Target a Firefox container name, numeric ID, or `none`.       |
| `--store PATH`           |       | Read an explicit cookie-store path.                           |

> [!CAUTION]
> `--render` is an output format, not a safe generic request helper. A
> domain query can still return cookies whose stored scope does not prove
> applicability to one exact destination. `--url` is broader again: it
> walks every parent domain and does not stop at public suffixes, so
> `app.example.co.uk` can also query `co.uk`. Inspect rendered output
> locally; do not send it as an outgoing request header.

Supported `--browser` values:

```text
chrome  edge  arc  brave  opera  opera-gx  vivaldi  firefox  safari
```

If `--browser` is omitted, the CLI creates a composite strategy across the
supported browser registry. Profile filters apply to Chromium and Firefox.
`--container` filters only Firefox cookies; other browsers ignore
it. Add `--browser firefox` to query only Firefox.

## Profiles and containers

List every discoverable named profile:

```bash
get-cookie --list-profiles
```

Limit the list to one browser:

```bash
get-cookie --browser chrome --list-profiles
get-cookie --browser firefox --list-profiles
```

Then query a specific profile:

```bash
get-cookie sessionid example.com --browser chrome --profile "Work"
get-cookie sessionid example.com --browser firefox --profile default-release
```

Firefox containers are independent from profiles:

```bash
get-cookie sessionid example.com --browser firefox --container Personal
get-cookie sessionid example.com --browser firefox --container 2
get-cookie sessionid example.com --browser firefox --container none
```

Safari does not expose named-profile filtering.

## Filtering and recovery

| Option              | Alias | Meaning                                                                      |
| ------------------- | ----- | ---------------------------------------------------------------------------- |
| `--include-expired` |       | Accepted for compatibility; currently does not change CLI query results.    |
| `--include-all`     |       | Keep duplicate `name + domain` results. By default one longer value is kept. |
| `--force`           | `-f`  | Skip interactive lock/permission remediation; it does not guarantee access.  |
| `--verbose`         | `-v`  | Enable diagnostic logging.                                                   |

For example:

```bash
get-cookie % example.com --include-all --output json
```

> [!NOTE]
> `--include-expired` is currently accepted by the CLI but not applied when
> querying cookies. Browser strategies keep their own expiry behavior, so
> do not use this flag to infer that expired rows were included.

## JWT inspection

JWT inspection runs after the cookie query:

| Option             | Alias | Meaning                                                                       |
| ------------------ | ----- | ----------------------------------------------------------------------------- |
| `--detect-jwt`     | `-j`  | Annotate JWT-shaped values with decoded metadata when decoding succeeds.      |
| `--jwt-only`       |       | Keep JWT-shaped values; filter failed expiry or signature checks when known. |
| `--jwt-secret KEY` |       | With a JWT inspection flag, verify signatures with the supplied secret.     |

```bash
get-cookie % example.com --detect-jwt --output json
get-cookie % example.com --jwt-only --output json
get-cookie % example.com --jwt-only --jwt-secret "$JWT_SECRET" --output json
```

`--jwt-secret` only takes effect with `--detect-jwt` or `--jwt-only`; by
itself it does not start JWT inspection. Without it, these flags inspect token
shape and decoded expiry claims; they do not authenticate the token or verify
its signature.

`--jwt-only` keeps JWT-shaped values first. It filters a value only when
inspection metadata shows an expired token or, with `--jwt-secret`, a failed
signature check; a JWT-shaped value that cannot be decoded can remain in the
output. Reserve “verified” for tokens that pass a secret-backed signature
check.

Do not put a real signing secret into shell history or shared logs.

## Output modes

| Option             | Alias | Output                                                          |
| ------------------ | ----- | --------------------------------------------------------------- |
| default            |       | Unique non-empty values, one per line.                          |
| `--output json`    |       | JSON array of exported cookies. |
| `--output netscape` |      | Netscape `cookies.txt` with raw values and cookie metadata. |
| `--dump`           | `-d`  | JSON array of exported cookies.                                 |
| `--dump-grouped`   | `-G`  | JSON object keyed by source-store path.                         |
| `--render`         | `-r`  | Merged `name=value; name=value` Cookie header value.            |
| `--render-grouped` | `-R`  | Rendered cookie-header strings grouped by source store.         |

Examples:

```bash
# Check readiness without printing or storing the value
if get-cookie sessionid example.com 2>/dev/null | grep -q .; then
  printf '%s\n' "Cookie is available"
else
  printf '%s\n' "Cookie is not available"
fi

# Sensitive reference only: JSON output includes values; keep it local
get-cookie % example.com --output json

# Sensitive reference only: --render serializes values, not a safe request
# helper
get-cookie sessionid app.example.com --render
```

### Netscape cookie files

```bash
get-cookie % example.com --browser chrome --profile Work --output netscape > cookies.txt
curl --cookie cookies.txt https://example.com/
yt-dlp --cookies cookies.txt https://example.com/video
```

This format preserves raw values, paths, Secure and HttpOnly flags, host-only
scope, and expiry in Unix seconds. Session cookies use `0`. Cookies on different
paths remain separate. Select a browser and profile when accounts overlap.
An empty query produces a header-only cookie file. Tabs, newlines and NUL bytes
cannot be represented losslessly, so export rejects those fields. Partitioned
cookies are also rejected because this format cannot preserve their partition.

## Help and diagnostics

| Option            | Alias | Meaning                                                         |
| ----------------- | ----- | --------------------------------------------------------------- |
| `--help`          | `-h`  | Show CLI help.                                                  |
| `--verbose`       | `-v`  | Show diagnostic logging.                                        |
| `--list-profiles` |       | List discoverable profiles, optionally filtered by `--browser`. |

Except for Netscape export, when a query has no matches, the CLI logs `No results` and writes no result
payload to stdout. In particular, `--output json` does not emit `[]` for that
case. Do not rely on a specialized no-results exit-code taxonomy; capture
stdout and check that it is non-empty before parsing JSON or using rendered
output.

## Safe readiness pattern

```bash
if get-cookie sessionid app.example.com --browser chrome --profile "Work" |
  grep -q .; then
  echo "matching cookie is readable"
else
  echo "No local cookie found" >&2
  exit 1
fi
```

List profiles first and replace `Work` with an exact displayed profile name.
The value still crosses a local pipe before `grep` reduces it to a boolean,
so keep tracing off. Cookie values should not be committed, cached, sent to a
CI system, or forwarded as a generic request header.

## Related pages

- [Getting started](./getting-started.md)
- [Browser support](./browser-support.md)
- [Security and privacy](./security.md)
- [Troubleshooting](./troubleshooting.md)

---
title: CLI reference
description: Authoritative syntax, flags, output modes, and examples for get-cookie.
---

# CLI reference

The CLI has no subcommands:

```text
get-cookie [name] [domain] [options]
```

With no arguments, it prints help. The positional arguments default to
`%`, so a bare option-based query can match all names and domains.

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
| `[domain]`               |       | Positional domain pattern; defaults to `%`.                   |
| `--name PATTERN`         | `-n`  | Cookie-name pattern.                                          |
| `--domain PATTERN`       | `-D`  | Cookie-domain pattern.                                        |
| `--url URL`              | `-u`  | Build `%` specs for the URL hostname and every parent domain. |
| `--browser BROWSER`      | `-b`  | Target one supported browser.                                 |
| `--profile NAME`         | `-p`  | Target a Chromium or Firefox profile. Use with `--browser`.   |
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
supported browser registry. Profile and container selection are meaningful
only when a browser is selected. `--container` is Firefox-only; other
browsers warn and ignore it.

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
| `--include-expired` |       | Keep expired cookies. By default they are filtered out.                      |
| `--include-all`     |       | Keep duplicate `name + domain` results. By default one longer value is kept. |
| `--force`           | `-f`  | Skip interactive lock/permission remediation; it does not guarantee access.  |
| `--verbose`         | `-v`  | Enable diagnostic logging.                                                   |

For example:

```bash
get-cookie % example.com --include-expired --include-all --output json
```

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
| `--output json`    |       | JSON array of exported cookies. Only lowercase `json` is valid. |
| `--dump`           | `-d`  | JSON array of exported cookies.                                 |
| `--dump-grouped`   | `-G`  | JSON object keyed by source-store path.                         |
| `--render`         | `-r`  | Merged `name=value; name=value` Cookie header value.            |
| `--render-grouped` | `-R`  | Rendered cookie-header strings grouped by source store.         |

Examples:

```bash
# Pass one raw value to another local command
TOKEN=$(get-cookie sessionid example.com)

# Inspect metadata without printing it into a shared log
get-cookie % example.com --output json

# Inspect one rendered value locally (still sensitive)
get-cookie sessionid app.example.com --render
```

## Help and diagnostics

| Option            | Alias | Meaning                                                         |
| ----------------- | ----- | --------------------------------------------------------------- |
| `--help`          | `-h`  | Show CLI help.                                                  |
| `--verbose`       | `-v`  | Show diagnostic logging.                                        |
| `--list-profiles` |       | List discoverable profiles, optionally filtered by `--browser`. |

When a query has no matches, the CLI logs `No results` and writes no result
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

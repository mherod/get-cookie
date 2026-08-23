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

# Cookies applicable to a URL, rendered as a Cookie header value
get-cookie --url https://app.example.com --render
```

The exact wildcard accepted by the CLI is `%`. A positional `*` is
normalized to `%`, but patterns such as `session*` are not rewritten; use
SQL-style `%` and `_` patterns instead.

## Query selection

| Option | Alias | Meaning |
| --- | --- | --- |
| `[name]` | | Positional cookie-name pattern; defaults to `%`. |
| `[domain]` | | Positional domain pattern; defaults to `%`. |
| `--name PATTERN` | `-n` | Cookie-name pattern. |
| `--domain PATTERN` | `-D` | Cookie-domain pattern. |
| `--url URL` | `-u` | Build `%` specs for the URL hostname and its parent domains. |
| `--browser BROWSER` | `-b` | Target one supported browser. |
| `--profile NAME` | `-p` | Target a Chromium or Firefox profile. Use with `--browser`. |
| `--container NAME_OR_ID` | `-c` | Target a Firefox container name, numeric ID, or `none`. |
| `--store PATH` | | Read an explicit cookie-store path. |

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

| Option | Alias | Meaning |
| --- | --- | --- |
| `--include-expired` | | Keep expired cookies. By default they are filtered out. |
| `--include-all` | | Keep duplicate `name + domain` results. By default one longer value is kept. |
| `--force` | `-f` | Skip interactive lock/permission remediation; it does not guarantee access. |
| `--verbose` | `-v` | Enable diagnostic logging. |

For example:

```bash
get-cookie % example.com --include-expired --include-all --output json
```

## JWT inspection

JWT inspection runs after the cookie query:

| Option | Alias | Meaning |
| --- | --- | --- |
| `--detect-jwt` | `-j` | Add decoded JWT metadata to matching cookies. |
| `--jwt-only` | | Keep only cookies containing valid JWTs. |
| `--jwt-secret KEY` | | Validate JWT signatures with the supplied secret. |

```bash
get-cookie % example.com --detect-jwt --output json
get-cookie % example.com --jwt-only --output json
```

Do not put a real signing secret into shell history or shared logs.

## Output modes

| Option | Alias | Output |
| --- | --- | --- |
| default | | Unique non-empty values, one per line. |
| `--output json` | | JSON array of exported cookies. Only lowercase `json` is valid. |
| `--dump` | `-d` | JSON array of exported cookies. |
| `--dump-grouped` | `-G` | JSON object keyed by source-store path. |
| `--render` | `-r` | Merged `name=value; name=value` Cookie header value. |
| `--render-grouped` | `-R` | Rendered cookie-header strings grouped by source store. |

Examples:

```bash
# Pass one raw value to another local command
TOKEN=$(get-cookie sessionid example.com)

# Inspect metadata without printing it into a shared log
get-cookie % example.com --output json

# Build a request header
curl -H "Cookie: $(get-cookie --url https://app.example.com --render)" https://app.example.com/api/me
```

## Help and diagnostics

| Option | Alias | Meaning |
| --- | --- | --- |
| `--help` | `-h` | Show CLI help. |
| `--verbose` | `-v` | Show diagnostic logging. |
| `--list-profiles` | | List discoverable profiles, optionally filtered by `--browser`. |

When a query has no matches, the CLI logs `No results`. Do not rely on a
specialized no-results exit-code taxonomy; use JSON output or check the
rendered output in your script.

## Safe shell pattern

```bash
COOKIE_HEADER=$(get-cookie --url https://app.example.com --render)

if [ -z "$COOKIE_HEADER" ]; then
  echo "No local cookie header found" >&2
  exit 1
fi

curl -H "Cookie: $COOKIE_HEADER" https://app.example.com/api/me
unset COOKIE_HEADER
```

Keep this pattern local. Cookie values should not be committed, cached, or
sent to a CI system.

## Related pages

- [Getting started](./getting-started.md)
- [Browser support](./browser-support.md)
- [Security and privacy](./security.md)
- [Troubleshooting](./troubleshooting.md)

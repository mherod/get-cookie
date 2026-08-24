---
title: Shell scripts
description: Use get-cookie for status-only local preflights without persisting cookies.
---

# Shell script automation

Use shell scripts for small, local readiness checks: confirm that a known
cookie is readable, compare profile metadata, and stop before a task starts
when the expected session is missing.

> [!CAUTION]
> Do not enable `set -x`, echo cookie values, redirect them to a file, or pass
> them to a shared log. For CI, unattended jobs, and outgoing requests, use the
> service's supported token or machine-authentication flow instead.

## Status-only preflight

```bash
#!/usr/bin/env bash
set -u

requested_profile=${1:-}
if [ -z "$requested_profile" ]; then
  printf '%s\n' "Choose a profile from:" >&2
  get-cookie --browser chrome --list-profiles >&2
  exit 2
fi

cookie_value="$(
  get-cookie sessionid app.example.com \
    --browser chrome \
    --profile "$requested_profile" 2>/dev/null || true
)"

if [ -n "$cookie_value" ]; then
  printf '%s\n' "ready"
else
  printf '%s\n' "sign in first" >&2
  unset cookie_value
  exit 1
fi

unset cookie_value
```

`get-cookie` may produce no output when no matching cookie is available.
Check for empty stdout rather than relying only on the command's exit status.
The value is held only long enough to reduce it to a local readiness signal.

## Target a browser or profile

List profiles first, then use an exact displayed name for a redacted metadata
check:

```bash
get-cookie --browser chrome --list-profiles

get-cookie sessionid app.example.com \
  --browser chrome \
  --profile "Work" \
  --output json |
  jq 'map({name, domain, expiry, browser: .meta.browser})'
```

Firefox containers can be selected with `--container`:

```bash
get-cookie sessionid app.example.com \
  --browser firefox \
  --container work \
  --output json |
  jq 'map({name, domain, expiry, browser: .meta.browser, containerId: .meta.containerId})'
```

## Check one cookie

Keep the cookie name explicit and reduce the result to a boolean:

```bash
cookie_value="$(get-cookie sessionid example.com)"

if [ -z "$cookie_value" ]; then
  printf '%s\n' "No session cookie found" >&2
  exit 1
fi

unset cookie_value
```

## Why this page does not send a request

`--render` serializes matches as `name=value` pairs, but the current query
result does not prove that every match applies to one exact destination path
and secure context. An explicit domain can still include a child-host match,
and `--url` parent expansion can reach public suffixes such as `co.uk`.
Do not build a generic outgoing header from either form.

## Debug without leaking values

- Use `get-cookie --browser chrome --list-profiles` to confirm profile names.
- Add `--verbose` only in a private local terminal.
- Treat `--output json`, `--dump`, and `--dump-grouped` as sensitive because
  they include cookie values.

See [CLI usage](/guide/cli-usage) for the full option list and
[troubleshooting](/guide/troubleshooting) for permission, profile, and
decryption problems.

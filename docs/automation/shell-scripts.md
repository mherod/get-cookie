---
title: Shell scripts
description: Use get-cookie in short-lived local shell commands without persisting cookies.
---

# Shell script automation

Use shell scripts for small, local tasks such as making one authenticated
request with `curl`. The safest pattern is to derive a Cookie header, use it
immediately, and then discard it.

> [!CAUTION]
> Do not enable `set -x`, echo cookie values, redirect them to a file, or pass
> them to a shared log. For CI and unattended jobs, use the service's supported
> token or machine-authentication flow instead.

## Authenticated curl helper

```bash
#!/usr/bin/env bash

auth_curl() {
  local url=$1
  shift

  local cookie_header
  local status

  cookie_header="$(get-cookie --url "$url" --render 2>/dev/null)"
  if [ -z "$cookie_header" ]; then
    printf '%s\n' "No matching cookies found for $url" >&2
    return 1
  fi

  if curl --fail-with-body -H "Cookie: $cookie_header" "$@" "$url"; then
    status=0
  else
    status=$?
  fi

  unset cookie_header
  return "$status"
}

auth_curl https://example.com/dashboard --silent --show-error
```

`get-cookie` may produce no output when no matching cookie is available.
Check for an empty header before making the request; do not rely only on the
command's exit status.

## Target a browser or profile

List profiles first, then use the exact displayed name:

```bash
get-cookie --browser chrome --list-profiles

url="https://example.com/dashboard"
cookie_header="$(
  get-cookie --url "$url" --browser chrome --profile "Work" --render
)"
```

Firefox containers can be selected with `--container`:

```bash
get-cookie --url https://example.com/dashboard \
  --browser firefox \
  --container work \
  --render
```

When you are finished with a captured value, remove it from the shell:

```bash
unset cookie_header
```

## Query one cookie

If a request needs exactly one named cookie, keep the name explicit:

```bash
cookie_value="$(get-cookie sessionid example.com)"

if [ -z "$cookie_value" ]; then
  printf '%s\n' "No session cookie found" >&2
  exit 1
fi

# Use the value immediately, then discard it.
curl --fail-with-body \
  -H "Cookie: sessionid=$cookie_value" \
  https://example.com/profile

unset cookie_value
```

For multiple cookies or URL-specific matching, prefer `--url --render` rather
than assembling a header yourself.

## Debug without leaking values

- Use `get-cookie --browser chrome --list-profiles` to confirm profile names.
- Add `--verbose` only in a private local terminal.
- Treat `--output json`, `--dump`, and `--dump-grouped` as sensitive because
  they include cookie values.

See [CLI usage](/guide/cli-usage) for the full option list and
[troubleshooting](/guide/troubleshooting) for permission, profile, and
decryption problems.

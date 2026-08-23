---
title: Examples and Tutorials
description: Safe local recipes for querying browser cookies
---

# Examples and Tutorials

These recipes are for authorized, local debugging on a trusted machine. Browser
cookies are credentials: do not paste them into tickets, commit them, log them,
or write them to disk. Prefer a disposable or test account.

For the runnable repository scripts, see `examples/README.md`. Read each script
before running it because several examples query real local sessions.

## Prerequisites

- Install `get-cookie` or build and link the CLI from this repository.
- Sign in to the target site in a local supported browser.
- Use `jq` only when you need to inspect JSON without printing values.
- Keep shell tracing disabled; `set -x` can expose cookie headers.

See [Browser Support](./browser-support.md) for supported platforms and
[Security and Privacy](./security.md) before using real sessions.

## 1. Discover profiles without reading cookie values

List the profiles get-cookie can discover, then target one explicitly when the
same site is signed in under multiple accounts.

```bash
get-cookie --list-profiles
get-cookie --browser chrome --list-profiles
```

Profile names and local paths can still be sensitive. Do not paste the output
into public reports.

## 2. Inspect metadata without printing values

`--output json` returns an array of cookies. Filter out `value` before
displaying or sharing diagnostics.

```bash
get-cookie sessionid app.example.com --output json |
  jq 'map({name, domain, expiry, browser: .meta.browser})'
```

Use `%` as the cookie-name wildcard when you need all matching names:

```bash
get-cookie % app.example.com --output json |
  jq 'map({name, domain, expiry, browser: .meta.browser})'
```

By default the CLI filters expired cookies and deduplicates matching
name/domain pairs. Add `--include-expired` or `--include-all` only for a
local diagnostic, and continue to redact `value`.

## 3. Make one local authenticated request

`--url` derives cookie queries from the URL hostname and its parent domains.
`--render` produces a `Cookie` header value. Keep it in memory, never echo
it, and unset it immediately after the request.

```bash
COOKIE_HEADER="$(get-cookie --url https://app.example.com/dashboard --render)"

if [ -z "$COOKIE_HEADER" ]; then
  echo "No matching cookies found" >&2
  exit 1
fi

curl \
  --fail \
  --silent \
  --show-error \
  -H "Cookie: $COOKIE_HEADER" \
  https://app.example.com/api/me

unset COOKIE_HEADER
```

This pattern is for a local session you are authorized to use. It is not a CI
credential strategy.

## 4. Target a browser and profile

Use `--browser` and `--profile` when multiple local profiles contain the
same site. The example below displays metadata only.

```bash
PROFILE_NAME="Profile 1"

get-cookie sessionid app.example.com \
  --browser chrome \
  --profile "$PROFILE_NAME" \
  --output json |
  jq 'map({name, domain, expiry, browser: .meta.browser})'

unset PROFILE_NAME
```

Firefox container selection is also available through `--container`:

```bash
get-cookie sessionid app.example.com \
  --browser firefox \
  --container work \
  --output json |
  jq 'map({name, domain, expiry, containerId: .meta.containerId})'
```

## 5. Use the public library API

The simple API accepts a cookie specification with `name` and `domain`.
Check for an empty array because inaccessible stores and missing cookies are
reported as no results.

```typescript
import { getCookie } from "@mherod/get-cookie";

const cookies = await getCookie({
  name: "sessionid",
  domain: "app.example.com",
});

const cookie = cookies[0];
if (!cookie) {
  throw new Error("No matching cookie found");
}

const response = await fetch("https://app.example.com/api/me", {
  headers: {
    Cookie: `${cookie.name}=${cookie.value}`,
  },
});

if (!response.ok) {
  throw new Error(`Request failed: ${response.status}`);
}
```

Do not log `cookie.value`. The root `getCookie` API accepts only
`name`/`domain` specs; use CLI flags for browser, profile, container, and
output selection.

## 6. Query multiple specs

Use `batchGetCookies` when a local process needs several named cookies. Its
supported options are `deduplicate`, `concurrency`, and
`continueOnError`.

```typescript
import { batchGetCookies } from "@mherod/get-cookie";

const cookies = await batchGetCookies(
  [
    { name: "sessionid", domain: "app.example.com" },
    { name: "csrf", domain: "app.example.com" },
  ],
  {
    deduplicate: true,
    continueOnError: true,
  },
);

if (cookies.length === 0) {
  throw new Error("No matching cookies found");
}
```

## Next steps

- [Use Cases](./use-cases.md) maps common tasks to the smallest useful recipe.
- [Integration Testing](./testing.md) separates deterministic tests from
  opt-in local browser checks.
- [Troubleshooting](./troubleshooting.md) covers missing results and access
  failures.
- [Security and Privacy](./security.md) explains safe handling boundaries.

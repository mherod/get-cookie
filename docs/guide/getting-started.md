---
title: Getting started
description: Install get-cookie and run a first local query.
---

# Getting started

## Before you start

You need:

- Node.js 20, 22, 24, 25, or 26, or Bun
- A supported browser profile with the cookie already stored
- Permission to read that profile and its encryption key

Cookie values are credentials. Use examples with accounts you control, keep
the output local, and do not commit or paste it into shared logs.

## Install the CLI

```bash
pnpm add -g @mherod/get-cookie
```

You can use npm instead:

```bash
npm install -g @mherod/get-cookie
```

## Run a first query

The positional form is `get-cookie [name] [domain] [options]`:

```bash
get-cookie sessionid example.com
```

Use `%` to match every cookie name for a domain:

```bash
get-cookie % example.com --output json
```

For an HTTP request, ask for the exact cookie name and target host, then use
`--render` to build a Cookie header value:

```bash
curl -H "Cookie: $(get-cookie sessionid app.example.com --render)" https://app.example.com/api/me
```

Do not pipe `--url ... --render` into an outgoing request for an arbitrary
URL. URL expansion currently includes every parent domain and does not stop at
public suffixes such as `co.uk`.

If several profiles may contain the same cookie, list profiles first and then
select one:

```bash
get-cookie --browser chrome --list-profiles
get-cookie sessionid example.com --browser chrome --profile "Work"
```

See the [CLI reference](./cli-usage.md) for every supported flag and the exact
output modes.

## Install the library

```bash
pnpm add @mherod/get-cookie
```

```typescript
import { getCookie } from "@mherod/get-cookie";

const cookies = await getCookie({
  name: "sessionid",
  domain: "example.com",
});

const first = cookies[0];
if (first) {
  console.log(first.name, first.domain);
}
```

Both `name` and `domain` are required. A missing cookie or an unreadable
browser returns an empty array, so always handle that case.

Use [Library usage](./api-usage.md) for batch queries, runtime-specific
entrypoints, and direct browser strategies.

## Next steps

- [Browser support](./browser-support.md) for platform and profile caveats
- [Security and privacy](./security.md) before storing or forwarding values
- [Troubleshooting](./troubleshooting.md) if a query returns no results
- [Examples](./examples.md) for small, vetted local recipes

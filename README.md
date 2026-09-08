# get-cookie

Read cookies from local browser profiles from the command line or from
TypeScript. `get-cookie` understands Chromium, Firefox, and Safari stores,
including the platform-specific decryption needed for values that the browser
keeps encrypted.

> [!CAUTION]
> Cookies are credentials. Use this package only with accounts and machines
> you control. Do not commit, upload, or paste cookie output into shared logs.

## Quick start

Install the CLI globally:

```bash
pnpm add -g @mherod/get-cookie
```

Query one cookie:

```bash
get-cookie sessionid example.com
```

Query every cookie for a domain as JSON:

```bash
get-cookie % example.com --output json
```

Inspect the rendered form of one named cookie locally:

```bash
get-cookie sessionid app.example.com --render
```

The default CLI output is the matching cookie value, one value per line.
`--render` produces a merged `name=value; name=value` header value, and
`--output json` preserves metadata for scripts. Treat every output mode as
sensitive.

`--render` is a serializer, not a safe generic request helper. A domain
query can still return cookies whose stored domain or path does not prove that
they apply to one exact destination. `--url` adds another risk because it
builds wildcard specs for a hostname and its parent domains without excluding
public suffixes such as `co.uk`. Inspect results locally; do not pipe
rendered output into an outgoing request.

## Use it as an MCP server

The MCP server lets agents find browser profiles containing a site's cookies
and make authenticated requests with them. From a local checkout:

```bash
pnpm run build
codex mcp add get-cookie -- pnpm --dir /absolute/path/to/get-cookie exec tsx /absolute/path/to/get-cookie/dist/cli.cjs mcp --allow-origin https://app.example.com
```

Call `get_status`, then `list_profiles` with a destination URL to find the
right profile. Pass that profile to `authenticated_fetch`. See the
[MCP guide](docs/automation/mcp.md) for setup, examples and proxy configuration.

## Use it from TypeScript

Install the library:

```bash
pnpm add @mherod/get-cookie
```

```typescript
import { getCookie } from "@mherod/get-cookie";

const cookies = await getCookie({
  name: "sessionid",
  domain: "example.com",
});

console.log(
  cookies.length > 0 ? "matching cookie is readable" : "sign in first",
);
```

`getCookie` requires both `name` and `domain`. It queries the default
Chrome, Firefox, and Safari strategies, tolerates browser-specific failures,
and returns an empty array when nothing can be read. The public query result
does not by itself prove that a cookie applies to a particular outgoing URL,
so keep this first example status-only.

For multiple specs, use `batchGetCookies`:

```typescript
import { batchGetCookies } from "@mherod/get-cookie";

const cookies = await batchGetCookies([
  { name: "sessionid", domain: "example.com" },
  { name: "csrf", domain: "example.com" },
]);
```

The root import selects the SQLite adapter for the current runtime. Use an
explicit entrypoint when you need deterministic adapter selection:

```typescript
import { getCookie as getCookieInNode } from "@mherod/get-cookie/node";
import { getCookie as getCookieInBun } from "@mherod/get-cookie/bun";
```

## Requirements

- Node.js 20, 22, 24, 25, or 26, as declared by the package engine range
- Or Bun, with the native `bun:sqlite` adapter
- A local browser profile that contains the cookie you want to read
- OS access to that profile and, where applicable, its encryption key

On macOS, Chromium decryption uses Keychain and Safari may require Full Disk
Access for the terminal app. On Windows, Chromium decryption uses the optional
DPAPI binding. On Linux, Chromium decryption attempts the available secret
service/keyring providers.

## Browser support

The CLI accepts these browser names:

```text
chrome  chromium  whale  edge  arc  brave  opera  opera-gx  vivaldi  firefox  safari
```

Chromium-family browsers and Firefox have discovery paths for macOS, Linux, and
Windows. Safari is macOS-only. Browser installation layouts and OS permissions
still determine whether a particular local profile can be read; see the
[browser and platform matrix](docs/guide/browser-support.md) for the precise
contract and caveats.

Profiles are supported for Chromium-family browsers and Firefox:

```bash
get-cookie --browser chrome --list-profiles
get-cookie sessionid example.com --browser chrome --profile "Work"
get-cookie sessionid example.com --browser firefox --profile default-release
```

Firefox containers can be selected with `--container`:

```bash
get-cookie sessionid example.com --browser firefox --container Personal
```

## Documentation

- [Getting started](docs/guide/getting-started.md)
- [CLI reference](docs/guide/cli-usage.md)
- [Library usage](docs/guide/api-usage.md)
- [Browser support](docs/guide/browser-support.md)
- [Security and privacy](docs/guide/security.md)
- [Troubleshooting](docs/guide/troubleshooting.md)
- [Generated API reference](https://mherod.github.io/get-cookie/reference/generated/)

The full documentation site is published at
[mherod.github.io/get-cookie](https://mherod.github.io/get-cookie/).

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, validation, documentation, and
pull-request guidance.

## License

get-cookie is free and open source under the [ISC License](LICENSE).

Copyright (c) 2022-2026 Matthew Herod and contributors.

You may use, copy, modify, and distribute this library for any purpose,
including in commercial and closed-source products. All copies must retain
the copyright notice and permission notice in `LICENSE`.

When distributing this library, including as part of another product, include
the full `LICENSE` text with your distribution, for example in a third-party
licences file. An author name or project link alone does not replace the
required notices. Public-facing credit in your product's interface or
advertising is not required.

See [LICENSE](LICENSE) for the full terms, including the warranty disclaimer
and limitation of liability.

See [Licence and attribution](ATTRIBUTION.md) for distribution examples and
instructions for preparing a third-party licences entry. That guide explains
the ISC licence and adds no separate conditions.

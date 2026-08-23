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

Build a `Cookie` header for a URL:

```bash
curl -H "Cookie: $(get-cookie --url https://app.example.com --render)" https://app.example.com/api/me
```

The default CLI output is the matching cookie value, one value per line.
`--render` produces a merged `name=value; name=value` header value, and
`--output json` preserves metadata for scripts.

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

const session = cookies[0];
if (session) {
  const response = await fetch("https://example.com/api/me", {
    headers: {
      Cookie: session.name + "=" + String(session.value),
    },
  });

  console.log(response.status);
}
```

`getCookie` requires both `name` and `domain`. It queries the default
Chrome, Firefox, and Safari strategies, tolerates browser-specific failures,
and returns an empty array when nothing can be read.

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
chrome  edge  arc  brave  opera  opera-gx  vivaldi  firefox  safari
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

ISC

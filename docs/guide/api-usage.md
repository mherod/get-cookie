---
title: Library usage
description: Use the typed get-cookie API from Node.js or Bun.
---

# Library usage

The package exports a small set of convenience functions plus browser strategy
classes. The convenience functions are best for ordinary local queries; use a
strategy class when you need to choose a browser or profile in code.

## Runtime entrypoints

The root import auto-detects the runtime:

```typescript
import { getCookie } from "@mherod/get-cookie";
```

Use an explicit entrypoint when adapter selection must be deterministic:

```typescript
import { getCookie as getCookieInNode } from "@mherod/get-cookie/node";
import { getCookie as getCookieInBun } from "@mherod/get-cookie/bun";
```

The Node.js entrypoint forces `better-sqlite3`; the Bun entrypoint forces
`bun:sqlite`.

## Query one specification

```typescript
import { getCookie } from "@mherod/get-cookie";

const cookies = await getCookie({
  name: "sessionid",
  domain: "example.com",
});
```

`getCookie` accepts one strict cookie specification:

```typescript
type CookieSpec = {
  name: string;
  domain: string;
};
```

Use `%` as the SQL wildcard for all cookie names:

```typescript
const cookies = await getCookie({
  name: "%",
  domain: "example.com",
});
```

The helper queries the default Chrome, Firefox, and Safari strategies. It
handles strategy failures internally and resolves to `[]` when no readable
match exists. It does not accept CLI-only options such as `browser`,
`profile`, `store`, or `include-expired`.

## Query multiple specifications

```typescript
import { batchGetCookies } from "@mherod/get-cookie";

const cookies = await batchGetCookies(
  [
    { name: "sessionid", domain: "example.com" },
    { name: "csrf", domain: "example.com" },
  ],
  {
    deduplicate: true,
    concurrency: 5,
    continueOnError: true,
  },
);
```

The defaults are `deduplicate: true`, `concurrency: 10`, and
`continueOnError: true`. Deduplication keeps one result for each
`name + domain` pair, preferring the longer value.

Use the flat `batchGetCookies` result for local decisions. If you need
reliable per-spec attribution, query each known specification directly rather
than relying on detailed grouping for wildcard names or parent-domain matches.

## Choose a browser directly

```typescript
import { ChromiumCookieQueryStrategy } from "@mherod/get-cookie";

const brave = new ChromiumCookieQueryStrategy("brave", "Work");
const cookies = await brave.queryCookies("sessionid", "example.com");
```

Other public strategies include `ChromeCookieQueryStrategy`,
`FirefoxCookieQueryStrategy`, `SafariCookieQueryStrategy`, and
`CompositeCookieQueryStrategy`. For Firefox, the constructor accepts an
optional profile name and container name or ID:

```typescript
import { FirefoxCookieQueryStrategy } from "@mherod/get-cookie";

const firefox = new FirefoxCookieQueryStrategy("default-release", "Personal");
const cookies = await firefox.queryCookies("sessionid", "example.com");
```

Direct strategy calls use `queryCookies(name, domain, store?, force?)`.
Consult the [generated API reference](/reference/generated/) for signatures
and exported types.

## Handle returned values safely

An exported cookie includes `name`, `domain`, `value`, optional
`expiry`, and optional `meta`. The value may be sensitive and should not be
logged by default:

```typescript
const cookie = cookies[0];
if (!cookie) {
  throw new Error("No matching cookie found");
}

const cookieStatus = {
  name: cookie.name,
  domain: cookie.domain,
  found: true,
  hasValue: String(cookie.value).length > 0,
  hasExpiry: cookie.expiry !== undefined,
};

console.info(cookieStatus);
```

Keep `cookie.value` out of logs, shell variables, and generic request helpers.
See [Security and privacy](./security.md) before persisting or forwarding a
value to a destination you have independently verified.

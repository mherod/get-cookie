---
title: Architecture
description: How get-cookie turns local browser stores into exported cookies.
---

# Architecture

`get-cookie` has two public surfaces over the same browser readers:

- The CLI adds argument parsing, browser/profile selection, filtering, JWT
  inspection, and output formatting.
- The library exports convenience helpers and strategy classes for TypeScript.

## Data flow

```text
CLI arguments or CookieSpec
          |
          v
strategy selection
          |
          v
browser store discovery
          |
          v
SQLite query or Safari binary decode
          |
          v
platform decryption and normalization
          |
          v
ExportedCookie[]
          |
          v
CLI formatter or caller code
```

The package does not need a browser automation session to read cookies. It
locates the browser's local store, reads it through a strategy, decrypts values
where the operating system permits that, and normalizes records into exported
cookies.

## Public entrypoints

`src/index.ts` exports the root API. `src/node.ts` and `src/bun.ts` set a
runtime override before re-exporting the same API:

- Root import: runtime-aware default
- `@mherod/get-cookie/node`: `better-sqlite3`
- `@mherod/get-cookie/bun`: `bun:sqlite`

The CLI entrypoint is `src/cli/cli.ts`.

## Strategy layer

`BaseCookieQueryStrategy` standardizes query handling and error isolation.
Concrete strategies handle browser-specific discovery and decoding:

- `ChromeCookieQueryStrategy` for Chrome
- `ChromiumCookieQueryStrategy` for other Chromium-family stores
- `FirefoxCookieQueryStrategy` for Firefox SQLite profiles and containers
- `SafariCookieQueryStrategy` for Safari binary-cookie files on macOS
- `CompositeCookieQueryStrategy` for aggregating several strategies

The CLI's `StrategyFactory` registry covers eleven selectors: Chrome, Chromium,
Whale, Edge, Arc, Brave, Opera, Opera GX, Vivaldi, Firefox, and Safari. The root
`getCookie` helper deliberately uses a smaller default set: Chrome, Firefox,
and Safari.

## Storage and query layer

Chromium and Firefox stores are SQLite databases. The SQL layer under
`src/core/browsers/sql/` contains:

- `DatabaseConnectionManager` for connection lifecycle and retry behavior
- `CookieQueryBuilder` for parameterized browser-specific queries
- `QueryMonitor` for query timing and slow-query diagnostics
- Runtime adapters for `better-sqlite3` and `bun:sqlite`

Safari uses a custom decoder under `src/core/browsers/safari/` because its
cookie store is a binary file rather than a SQLite database.

## Discovery and profiles

Browser-specific paths live in `BrowserAvailability.ts` and
`ChromiumBrowsers.ts`. Chromium profile selection reads `Local State` and
matches profile display names or directory names. Firefox profile selection
reads `profiles.ini`; container selection resolves through
`containers.json`.

Discovery is intentionally tolerant: an unavailable store or a failed browser
strategy should not prevent other strategies from returning results.

## Decryption and permissions

The browser reader does not bypass operating-system protections:

- macOS Chromium values use Keychain-backed Safe Storage secrets.
- Windows Chromium values use DPAPI through the optional native binding.
- Linux Chromium values try installed secret-service/keyring providers.
- Safari checks access to its container or legacy binary-cookie file and may
  guide an interactive user to Full Disk Access.

Database locks are handled through `BrowserLockHandler`. In interactive local
use, a lock may prompt for browser close/relaunch; `--force` skips that
remediation rather than guaranteeing a read.

## Error model

The convenience helpers and composite strategy favor partial results:

- `getCookie` catches query failures and resolves to an empty array.
- Composite queries isolate a failed browser from successful browsers.
- The CLI reports `No results` when the final result set is empty.

Callers that need browser-specific control should instantiate a strategy
directly and handle its result deliberately.

## Where to change things

| Change | Primary area |
| --- | --- |
| Add or adjust a browser selector | `src/core/browsers/StrategyFactory.ts` |
| Change profile discovery | `src/core/browsers/chromium/` or `src/core/browsers/firefox/` |
| Change SQL behavior | `src/core/browsers/sql/` |
| Change CLI flags or output | `src/utils/argv.ts`, `src/cli/` |
| Change public exports | `src/index.ts`, `src/node.ts`, `src/bun.ts` |

See [Testing](./testing.md) before changing a reader, and keep
[Browser support](./browser-support.md) synchronized with any selector or path
change.

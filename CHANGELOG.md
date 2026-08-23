# Changelog

All notable changes to this project will be documented in this file.

## [4.5.0] - 2026-08-23

### New Features

- Added Firefox container cookies support via `userContextId` filtering (#586)
- Exported Chromium profile discovery (`getChromiumProfiles`) from core library API (#585)
- Added separate Node and Bun runtime entrypoints — import from `@mherod/get-cookie/node` or `@mherod/get-cookie/bun` to force a specific SQLite adapter (#474, PR #475)
- Added Vivaldi as a fully supported browser with cookie extraction, profile discovery, and strategy wiring (#470)
- Added `--list-profiles` support for all browsers — lists installed profiles for any Chromium browser via Local State and Firefox via profiles.ini (#462)
- Added profile name filtering for Firefox via profiles.ini parsing, enabling `--profile` flag support (#461)
- Extended `--profile` filtering to all Chromium browsers (Brave, Edge, Arc, Opera, OperaGX), not just Chrome (#460)
- Auto-discovery of Brave and Arc cookie files via browser data directory paths (#455)
- Auto-discovery of cookie file paths for Chromium and Firefox browsers (#440, PR #452)

### Bug Fixes

- Used native `fs.access` in `checkFilePermission` to safely check file readability without spawning subshells (#580)
- Validated password type before normalizing Windows v10 master key (#579)
- Stripped 32-byte domain hash prefix on Windows GCM cookies for Chrome M127+ (#556, #566)
- Gated Firefox cookie expiry conversion on database schema version for Firefox 142+ (#558, #566)
- Added fallback to legacy `~/Library/Cookies/Cookies.binarycookies` path on macOS when sandbox container is absent (#561, #566)
- Profile listing now reads each browser's own Local State file instead of always reading Chrome's (#458)
- Added Brave to profile listing output (#456)
- Chromium and Firefox browsers now warn when `--profile` specifies an unrecognized profile name (#464, #466)
- Safari now warns at query time when `--profile` is requested (#463, #465)

### Refactoring & Performance

- Consolidated Chromium browser subclasses into unified `ChromiumCookieQueryStrategy` (#581)
- Replaced OOP output handler classes with functional `CookieFormatter` module (#582)
- Removed global `process.argv` parsing from pure JWT utility functions (#583)
- PBKDF2 key derived once per password rather than per cookie on Chrome (#537)
- Memoized Safe Storage keychain passwords per browser (#538)
- Read profile cookie files concurrently in batch queries (#539)
- Parallelized browser strategy queries in composite strategy (#491)

## [4.4.3] - 2026-02-24

### Refactoring

- Replaced three platform×browser `switch` blocks in `listProfiles()` with a
  single data-driven lookup via `BROWSER_PATHS` (exported from
  `BrowserAvailability.ts`); adding a new browser now only requires editing
  `BROWSER_PATHS` in one place (#430)
- Converted inline `require("node:fs/path/os")` calls in `cli.ts` to ESM
  `import` statements
- `createCompositeStrategy()` now derives the strategy list from
  `STRATEGY_REGISTRY` via `Object.values()`, eliminating the hardcoded
  seven-item list; adding a new browser to the registry automatically
  includes it in the composite (#431)
- `BaseChromiumCookieQueryStrategy` no longer hardcodes `"chrome"` as the
  SQL browser type; a private `sqlBrowserType` getter returns the concrete
  `browserType` when it is a valid `SqlBrowserType`, falling back to
  `"chrome"` only for Chromium variants not yet in `SqlBrowserType`
  (e.g. opera-gx, vivaldi, whale) (#432)

### Bug Fixes

- `handleQueryError` now always returns a `QueryResult` and never throws,
  fixing callers that expected a return value instead of an exception (#434)
- `EnhancedCookieQueryService` now throws a clear error when `filepath` is
  missing instead of silently querying with an undefined path (#433)

## [4.4.2] - 2026-02-20

### New Features

- Added native Bun runtime support — the package now works in Bun environments
  using `bun:sqlite` for SQLite access, with automatic runtime detection
  and seamless fallback to `better-sqlite3` in Node.js (#422)

### Bug Fixes

- Fixed `ERR_UNSUPPORTED_ESM_URL_SCHEME` crash when importing the package
  in Node.js ESM projects; the `bun:sqlite` protocol is no longer
  evaluated in Node.js environments (#423, fixes #419)

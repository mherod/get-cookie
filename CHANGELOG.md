# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### New Features

- Added separate Node and Bun runtime entrypoints — import
  from `@mherod/get-cookie/node` or `@mherod/get-cookie/bun`
  to force a specific SQLite adapter instead of relying on
  auto-detection (#474, PR #475)
- Added Vivaldi as a fully supported browser with cookie
  extraction, profile discovery, and strategy wiring (#470)
- Added `--list-profiles` support for all browsers — lists
  installed profiles for any Chromium browser via Local State
  and Firefox via profiles.ini (#462)
- Added profile name filtering for Firefox via profiles.ini
  parsing, enabling `--profile` flag support (#461)
- Extended `--profile` filtering to all Chromium browsers
  (Brave, Edge, Arc, Opera, OperaGX), not just Chrome (#460)
- Auto-discovery of Brave and Arc cookie files via browser
  data directory paths (#455)
- Auto-discovery of cookie file paths for Chromium and Firefox
  browsers, removing the need to pass an explicit filepath
  (#440, PR #452)

### Bug Fixes

- Profile listing now reads each browser's own Local State
  file instead of always reading Chrome's, fixing incorrect
  profile enumeration for Brave, Opera, and Edge (#458)
- Added Brave to the profile listing output (#456)
- Chromium browsers now warn when `--profile` specifies a
  name that does not match any installed profile, listing
  the available names (#466)
- Firefox now warns when `--profile` specifies a name not
  found in profiles.ini, listing available profiles (#464)
- Safari now warns when `--profile` is used, since Safari
  does not support profile filtering (#463)
- Safari profile warning now appears alongside query results
  instead of at strategy creation time (#465)

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

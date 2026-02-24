# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Refactoring

- Replaced three platform×browser `switch` blocks in `listProfiles()` with a
  single data-driven lookup via `BROWSER_PATHS` (exported from
  `BrowserAvailability.ts`); adding a new browser now only requires editing
  `BROWSER_PATHS` in one place (#430)
- Converted inline `require("node:fs/path/os")` calls in `cli.ts` to ESM
  `import` statements

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

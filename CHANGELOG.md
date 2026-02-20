# Changelog

All notable changes to this project will be documented in this file.

## [4.4.2] - 2026-02-20

### New Features

- Added native Bun runtime support — the package now works in Bun environments
  using `bun:sqlite` for SQLite access, with automatic runtime detection
  and seamless fallback to `better-sqlite3` in Node.js (#422)

### Bug Fixes

- Fixed `ERR_UNSUPPORTED_ESM_URL_SCHEME` crash when importing the package
  in Node.js ESM projects; the `bun:sqlite` protocol is no longer
  evaluated in Node.js environments (#423, fixes #419)

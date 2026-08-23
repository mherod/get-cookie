---
title: API reference
description: Stable overview of the public get-cookie API and generated TypeDoc.
---

# API reference

The hand-written guide explains the public API in task order:

- [Library usage](/guide/api-usage) for `getCookie`,
  `batchGetCookies`, runtime entrypoints, and direct strategies
- [CLI reference](/guide/cli-usage) for flags and output modes
- [Browser support](/guide/browser-support) for selector and platform boundaries

The complete signatures and exported types are generated from the current
source with TypeDoc:

- [Open the generated reference](/reference/generated/)

## Public package entrypoints

| Import | Purpose |
| --- | --- |
| `@mherod/get-cookie` | Runtime-aware root API |
| `@mherod/get-cookie/node` | Force the Node.js `better-sqlite3` adapter |
| `@mherod/get-cookie/bun` | Force the Bun `bun:sqlite` adapter |
| `@mherod/get-cookie/cli` | Published CLI entrypoint |

## Core exports

The root package exports:

- `getCookie`
- `batchGetCookies`
- `batchGetCookiesWithResults`
- `ChromeCookieQueryStrategy`
- `ChromiumCookieQueryStrategy`
- `FirefoxCookieQueryStrategy`
- `SafariCookieQueryStrategy`
- `CompositeCookieQueryStrategy`
- `getChromiumProfiles`
- public cookie, browser, batch, and render types

The generated pages are recreated by `pnpm run docs`; update source JSDoc or
the hand-written guide instead of editing generated Markdown.

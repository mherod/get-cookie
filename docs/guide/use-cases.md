---
title: Use Cases
description: Choose the smallest safe get-cookie workflow for a local task
---

# Use Cases

get-cookie is most useful when a local development task needs the same session
that already exists in your browser. Start with the smallest recipe that
answers your question, keep cookie values in memory, and never treat browser
cookies as a CI credential.

For copyable commands and API snippets, use [Examples and recipes](./examples.md).
For access problems, go to [Troubleshooting](./troubleshooting.md).

## Choose a workflow

| Goal | Recommended workflow | Why |
| --- | --- | --- |
| Check whether a local browser has a cookie | [Compare browser identities](./examples.md#compare-browser-identities-without-values) | Confirms name, domain, browser, and expiry without exposing the value |
| Reproduce one authenticated web request | [Replay one authenticated request](./examples.md#replay-one-authenticated-request) | Uses an explicit browser/profile and an in-memory header |
| Call an endpoint that requires CSRF | [Make a CSRF-aware local client](./examples.md#make-a-csrf-aware-local-client) | Keeps two known values in memory and fails closed |
| Seed a local browser smoke check | [Check a Playwright handoff](./examples.md#check-a-playwright-handoff) | Refuses to guess when cookie-scope metadata is incomplete |
| Preflight a local task | [Preflight a local dev command](./examples.md#preflight-a-local-dev-command) | Reports status without printing values |
| Test project behavior | Deterministic Jest tests first; optional local smoke check second | Keeps CI reproducible and real sessions local |

## Local API debugging

Use this when you are already signed in locally and need to reproduce one
authorized request. The complete, profile-scoped version is in
[Replay one authenticated request](./examples.md#replay-one-authenticated-request).

The linked recipe includes an empty-result check, cleanup trap, and hostname
matching caveat. Do not echo the header, enable shell tracing, or save it to a
file. Some APIs do not accept browser cookies at all; use the service's
supported API token or OAuth flow in that case.

## Profile diagnosis

Start by listing profiles, then run a redacted query against one profile at a
time.

```bash
get-cookie --browser chrome --list-profiles

get-cookie sessionid app.example.com \
  --browser chrome \
  --profile "Profile 1" \
  --output json |
  jq 'map({name, domain, expiry, browser: .meta.browser})'
```

If results differ across profiles, keep the diagnosis at the metadata level.
Avoid comparing or sharing raw values.

## Local browser automation handoff

When a local automation process needs an existing authorized session, retrieve
cookies immediately before creating its browser context and keep them in
memory. A handoff is only safe when the export preserves domain, path, and
security flags; Chromium and Firefox exports may not provide enough scope
metadata.

Use [Check a Playwright handoff](./examples.md#check-a-playwright-handoff) as a
fail-closed boundary. Do not guess missing fields, copy a browser profile, or
export a cookie archive as a shortcut.

## Security review

For a local review, inspect names, domains, expiry, and browser metadata while
omitting `value`.

```bash
get-cookie % app.example.com --output json |
  jq 'map({name, domain, expiry, browser: .meta.browser})'
```

Use `--include-all` only when duplicate records are relevant to the question.
See [Security and Privacy](./security.md) for handling rules.

## Testing

Use [Integration Testing](./testing.md) for repository tests and opt-in local
browser checks. CI should use mocks, fixtures, or the target service's test
authentication mechanism rather than a developer's browser cookies.

## Out of scope

get-cookie is not a cookie backup, migration, sharing, or long-term credential
storage tool. It should not be used to bypass authorization, scrape accounts
you do not control, or move a browser session into CI.

See [Browser Support](./browser-support.md) for platform coverage and
[Security and Privacy](./security.md) before using real sessions.

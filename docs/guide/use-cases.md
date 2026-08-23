---
title: Use Cases
description: Choose the smallest safe get-cookie workflow for a local task
---

# Use Cases

get-cookie is most useful when a local development task needs the same session
that already exists in your browser. Start with the smallest recipe that
answers your question, keep cookie values in memory, and never treat browser
cookies as a CI credential.

For copyable commands and API snippets, use [Examples and Tutorials](./examples.md).
For access problems, go to [Troubleshooting](./troubleshooting.md).

## Choose a workflow

| Goal | Recommended workflow | Why |
| --- | --- | --- |
| Check whether a local browser has a cookie | Metadata-only JSON inspection | Confirms name, domain, browser, and expiry without exposing the value |
| Reproduce one authenticated web request | `--url ... --render` with an in-memory header | Uses the same hostname and parent-domain matching as the CLI |
| Compare local profiles | `--list-profiles`, then `--browser` and `--profile` | Avoids mixing personal and work sessions |
| Inspect Firefox containers | `--browser firefox --container ...` | Narrows the query to the intended container |
| Fetch several named cookies in code | `batchGetCookies` | Uses the supported batch API without shell parsing |
| Test project behavior | Deterministic Jest tests first; optional local smoke check second | Keeps CI reproducible and real sessions local |

## Local API debugging

Use this when you are already signed in locally and need to reproduce one
authorized request.

```bash
COOKIE_HEADER="$(get-cookie --url https://app.example.com/dashboard --render)"
curl \
  --fail \
  --silent \
  --show-error \
  -H "Cookie: $COOKIE_HEADER" \
  https://app.example.com/api/me
unset COOKIE_HEADER
```

Do not echo the header, enable shell tracing, or save it to a file. Some APIs
do not accept browser cookies at all; use the service's supported API token or
OAuth flow in that case.

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
memory. Prefer the public `getCookie({ name, domain })` API for a small number
of cookies, or `batchGetCookies` for several known names.

The browser-automation library you use has its own cookie shape and expiry
units, so convert fields at that boundary and test the conversion locally.
Do not copy a browser profile or export a cookie archive as a shortcut.

## Security review

For a local review, inspect names, domains, expiry, and metadata while omitting
`value`.

```bash
get-cookie % app.example.com --include-expired --output json |
  jq 'map({name, domain, expiry, secure: .meta.secure, httpOnly: .meta.httpOnly})'
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

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

| Goal                                       | Recommended workflow                                                                  | Why                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Check whether a local browser has a cookie | [Compare browser identities](./examples.md#compare-browser-identities-without-values) | Confirms name, domain, browser, and expiry without exposing the value |
| Check whether one local session is ready   | [Check one authenticated session](./examples.md#check-one-authenticated-session)      | Uses an explicit browser/profile and reduces the result to a boolean  |
| Check an admin flow's CSRF inputs          | [Check CSRF-aware inputs](./examples.md#check-csrf-aware-inputs)                      | Requires two known values without building a request                  |
| Assess browser automation inputs           | [Assess automation inputs](./examples.md#assess-browser-automation-inputs)             | Shows why exported metadata is insufficient for automatic replay      |
| Preflight a local task                     | [Preflight a local dev command](./examples.md#preflight-a-local-dev-command)          | Reports status without printing values                                |
| Test project behavior                      | Deterministic Jest tests first; optional local smoke check second                     | Keeps CI reproducible and real sessions local                         |

## Local session readiness

Use this when a local task should stop early unless a known session is
readable. The complete, profile-scoped version is in
[Check one authenticated session](./examples.md#check-one-authenticated-session).

The linked recipe includes profile discovery, an empty-result check, and a
cleanup trap. It intentionally does not construct or send a Cookie header:
query matches do not prove exact destination applicability. For requests, use
the service's supported API token or OAuth flow.

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

## Local browser automation readiness

When a local automation process needs an authorized session, inspect whether
one known cookie is readable and which metadata survived export. The current
public export does not preserve `SameSite`, and Safari's `"Infinity"`
lifetime can represent either a session cookie or normalized invalid data, so
the docs do not present automatic cookie replay as safe.

Use [Assess automation inputs](./examples.md#assess-browser-automation-inputs)
as a metadata-only boundary. For a real browser run, use the service's
supported test-login or token flow rather than guessing missing fields, copying
a browser profile, or exporting a cookie archive.

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

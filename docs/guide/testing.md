---
title: Testing
description: Deterministic project tests and opt-in local browser checks
---

# Testing

Keep two kinds of testing separate:

1. deterministic repository tests that are safe for CI; and
2. opt-in local smoke checks that read an authorized browser profile.

A passing CI run proves code behavior against mocks and fixtures. It does not
prove that a particular user's browser profile, keychain, DPAPI setup, or
keyring is readable.

## Repository tests

The project uses Jest with TypeScript support. Tests are co-located in
`__tests__` directories, and browser/database behavior is exercised with
fixtures and mocked adapters.

Run the normal gate from the repository root:

```bash
pnpm run validate
```

Useful focused commands:

```bash
pnpm test
pnpm test -- src/core/browsers/firefox/
pnpm test -- src/tests/integration/cross-platform.test.ts
pnpm test -- --testNamePattern="specific test name"
pnpm run type-check
pnpm run lint
```

`pnpm run validate` runs type checking, Biome linting, Jest, the docs link
check, and the formatting check. It does not run the package build; run
`pnpm run build` separately when changing exports, entrypoints, or CLI
bundling.

## What belongs in CI

CI-friendly tests should be reproducible without a logged-in browser:

- mock the SQLite adapter factory rather than a native database module;
- use cookie fixtures with synthetic values;
- assert platform paths, parsing, decryption routing, and error handling;
- redact any value that appears in failure output;
- tolerate missing locally installed browsers where a test only checks
  discovery or graceful fallback.

Do not put real browser cookies, copied browser profiles, interactive login
steps, or cookie files into CI. Use the target service's supported test
authentication mechanism for end-to-end CI.

## Local browser smoke checks

Run a real-profile check only on a trusted local machine with an account you
are authorized to inspect. Keep output redacted and do not run it while shell
tracing is enabled.

Start with profile discovery:

```bash
get-cookie --browser chrome --list-profiles
```

Then verify metadata without displaying the cookie value:

```bash
get-cookie test_session app.example.com \
  --browser chrome \
  --profile "Profile 1" \
  --output json |
  jq 'map({name, domain, expiry, browser: .meta.browser})'
```

No stdout payload can mean the cookie is missing, the selected profile is
wrong, or the browser store is inaccessible. The CLI logs `No results` but
does not emit `[]` for a no-match JSON query. Use
[Troubleshooting](./troubleshooting.md) before widening the query.

## Local programmatic readiness check

The public API accepts only `name` and `domain` in the cookie spec. Treat an
empty array as a normal no-result outcome, never log the value, and keep this
check status-only because the result does not prove exact destination
applicability.

```typescript
import { getCookie } from "@mherod/get-cookie";

const cookies = await getCookie({
  name: "test_session",
  domain: "app.example.com",
});

if (cookies.length === 0) {
  throw new Error("Local test cookie not found");
}

console.log("Local test cookie is readable.");
```

Use a disposable test account where possible. Keep this kind of check out of
the default test suite and out of CI. For an end-to-end request, use the
service's supported test-authentication mechanism instead of forwarding a
browser cookie.

## Test hygiene

- Never print or snapshot cookie values.
- Use placeholder domains and synthetic fixture values in committed tests.
- Clear in-memory variables after a manual shell check.
- Do not persist extracted cookies between runs.
- Report failures with platform, browser family, package version, and redacted
  errors only.

For safe local recipes, see [Examples and Tutorials](./examples.md). Review
[Security and Privacy](./security.md) before handling real sessions.

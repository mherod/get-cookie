---
title: Examples and recipes
description: Practical local workflows for turning browser sessions into small, safe developer tools.
pageClass: cookie-examples
---

# Examples and recipes

The interesting part of get-cookie is not reading a value. It is what a local
developer can prove next: whether a known session is readable, whether an
admin workflow has its expected inputs, or which profile has the session you
expect.

Every recipe here uses <code>example.com</code>, keeps credentials in memory,
and fails closed when nothing is found. Use only accounts and environments you
are authorized to access.

<div class="example-chooser" aria-label="Choose an example">
  <a class="example-chooser__card" href="#check-one-authenticated-session">
    <span class="example-chooser__meta">Shell · 2 min</span>
    <strong>Check one authenticated session</strong>
    <span>Reduce one trusted browser session to a local ready/not-ready signal.</span>
  </a>
  <a class="example-chooser__card" href="#check-csrf-aware-inputs">
    <span class="example-chooser__meta">TypeScript · 4 min</span>
    <strong>Check CSRF-aware inputs</strong>
    <span>Verify the two known cookies an admin flow expects.</span>
  </a>
  <a class="example-chooser__card" href="#check-a-playwright-handoff">
    <span class="example-chooser__meta">Playwright · safety gate</span>
    <strong>Check a Playwright handoff</strong>
    <span>Seed a fresh context only when cookie scope is complete.</span>
  </a>
  <a class="example-chooser__card" href="#compare-browser-identities-without-values">
    <span class="example-chooser__meta">CLI · 2 min</span>
    <strong>Compare browser identities</strong>
    <span>Find the right work, personal, or Firefox-container session.</span>
  </a>
  <a class="example-chooser__card" href="#check-session-health-without-showing-secrets">
    <span class="example-chooser__meta">Diagnostics · 2 min</span>
    <strong>Check session health</strong>
    <span>Inspect expiry and JWT status while projecting away values.</span>
  </a>
  <a class="example-chooser__card" href="#preflight-a-local-dev-command">
    <span class="example-chooser__meta">Shell · 1 min</span>
    <strong>Preflight a local dev command</strong>
    <span>Print ready or sign in first before a task starts.</span>
  </a>
</div>

Before you start: shell recipes expect <code>get-cookie</code> on your PATH
and <code>jq</code> for redacted JSON; TypeScript recipes need Node 20+ and
the package installed. Playwright is an optional dependency used by one
advanced recipe.

> [!TIP]
> Choose the narrowest boundary: CLI flags and direct strategies can target a
> browser, profile, or Firefox container; root helpers query the default
> Chrome, Firefox, and Safari strategies and can mix identities.

> [!CAUTION]
> Browser cookies are live credentials. Do not enable shell tracing, echo
> values, write cookies to files, save Playwright storage state, or move these
> patterns into CI. Prefer official API tokens for requests and unattended
> workflows.

## Check one authenticated session

Use this when a local task needs one known browser session. First choose a
profile from the CLI's discovery output, then reduce one explicit cookie query
to a ready/not-ready signal without printing or forwarding the value.

```bash
#!/usr/bin/env bash
set -euo pipefail

requested_profile=${1:-}
if [ -z "$requested_profile" ]; then
  echo "Choose a profile from:" >&2
  get-cookie --browser chrome --list-profiles >&2
  exit 2
fi

cookie_value="$(
  get-cookie \
    sessionid \
    app.example.com \
    --browser chrome \
    --profile "$requested_profile" 2>/dev/null || true
)"

cleanup() {
  unset cookie_value
}
trap cleanup EXIT

if [ -z "$cookie_value" ]; then
  echo "No matching local session found" >&2
  exit 1
fi

echo "ready"
```

This confirms only that a matching value is readable from the selected local
profile. It does not prove that the cookie applies to an exact destination
path or secure context. <code>--render</code> is therefore documented as an
output format, not a generic request helper; <code>--url</code> is broader
again because it can include public-suffix parents such as
<code>co.uk</code>. Use the service's supported API auth for requests.

## Check CSRF-aware inputs

Some local admin workflows expect both a session cookie and a CSRF cookie. A
direct strategy asks Chrome for one verified profile, then the code requires
exactly one match for each known name before reporting readiness. Verify
profile discovery first because the strategy can fall back to broader local
stores when `Local State` is unavailable.

```typescript
import {
  ChromeCookieQueryStrategy,
  getChromiumProfiles,
} from "@mherod/get-cookie";

const requestedProfile = "Work";
const profileMatches = getChromiumProfiles("chrome").filter(
  (profile) =>
    profile.name.toLowerCase() === requestedProfile.toLowerCase() ||
    profile.directory.toLowerCase() === requestedProfile.toLowerCase(),
);

if (profileMatches.length !== 1) {
  throw new Error("Cannot verify exactly one requested Chrome profile");
}

const profile = profileMatches[0];
if (!profile) {
  throw new Error("Requested Chrome profile was not resolved");
}

const source = new ChromeCookieQueryStrategy(profile.directory);
const domain = "app.example.com";

const [sessions, csrfTokens] = await Promise.all([
  source.queryCookies("sessionid", domain),
  source.queryCookies("csrf", domain),
]);

if (sessions.length !== 1 || csrfTokens.length !== 1) {
  throw new Error("Expected one session cookie and one CSRF cookie");
}

const session = sessions[0];
const csrf = csrfTokens[0];
if (!session || !csrf) {
  throw new Error("Sign in locally before continuing");
}

console.log("session and CSRF inputs are readable");
```

The code never prints either value or builds an outgoing request. Keep the
requested names narrow; do not query every cookie when two known cookies are
enough.

## Check a Playwright handoff

This is a feasibility check, not a universal login shortcut. On macOS, Safari
exports the path and flags that a safe Playwright handoff needs. Chromium and
Firefox may not, so their safe result is often an intentional stop rather than
a guessed cookie scope.

```typescript
import { chromium } from "playwright";
import {
  SafariCookieQueryStrategy,
  type ExportedCookie,
} from "@mherod/get-cookie";

function toPlaywrightCookie(cookie: ExportedCookie) {
  if (
    !cookie.meta?.path ||
    typeof cookie.meta.secure !== "boolean" ||
    typeof cookie.meta.httpOnly !== "boolean"
  ) {
    throw new Error("Cookie metadata is incomplete for a safe handoff");
  }

  return {
    name: cookie.name,
    value: String(cookie.value),
    domain: cookie.domain,
    path: cookie.meta.path,
    secure: cookie.meta.secure,
    httpOnly: cookie.meta.httpOnly,
    ...(cookie.expiry instanceof Date && {
      expires: Math.floor(cookie.expiry.getTime() / 1000),
    }),
  };
}

const source = new SafariCookieQueryStrategy();
const cookies = await source.queryCookies("sessionid", "app.example.com");

if (cookies.length !== 1) {
  throw new Error("Expected one Safari session cookie");
}

const browser = await chromium.launch();
const context = await browser.newContext();

try {
  await context.addCookies(cookies.map(toPlaywrightCookie));

  const page = await context.newPage();
  await page.goto("https://app.example.com/dashboard");

  if (new URL(page.url()).pathname.startsWith("/login")) {
    throw new Error("The local session was not accepted");
  }

  // Continue with the small, local smoke check here.
} finally {
  await context.close();
  await browser.close();
}
```

Install Playwright separately before trying this optional recipe. If the app
needs more than one cookie, query only those known names and run every result
through the same scope check. Do not write <code>storageState</code>, traces,
or screenshots that could contain session material; use a service test-login
flow when scope metadata is incomplete.

## Compare browser identities without values

When a site works in one profile and fails in another, compare metadata rather
than comparing credentials. Start with profile discovery, then inspect one
profile at a time.

```bash
get-cookie --browser chrome --list-profiles

inspect_profile() {
  local profile=$1

  get-cookie sessionid app.example.com \
    --browser chrome \
    --profile "$profile" \
    --output json |
    jq --arg profile "$profile" 'map({
      profile: $profile,
      name,
      domain,
      expiry,
      browser: .meta.browser
    })'
}

inspect_profile "Work"
inspect_profile "Personal"
```

Firefox containers give you another useful identity boundary:

```bash
get-cookie sessionid app.example.com \
  --browser firefox \
  --profile default-release \
  --container Work \
  --output json |
  jq 'map({
    name,
    domain,
    expiry,
    browser: .meta.browser,
    containerId: .meta.containerId
  })'
```

Full JSON still passes through the local pipe before <code>jq</code> removes
values. Keep tracing off, and keep profile/container labels out of shared
screenshots or public issue reports.

## Check session health without showing secrets

Before a demo or local debugging session, inspect expiry and JWT status while
projecting away the value and decoded claims.

```bash
get-cookie auth_token app.example.com --detect-jwt --output json |
  jq 'map({
    name,
    domain,
    cookieExpiry: .expiry,
    isJwt: .meta.isJwt,
    jwtExpiry: .meta.jwtExpiry,
    jwtValid: .meta.jwtValidation.isValid
  })'
```

JWT decoding is not signature verification. Do not print
<code>.meta.jwtPayload</code>, and avoid putting a real
<code>--jwt-secret</code> into shell history.

## Preflight a local dev command

Use a status-only preflight when a local task needs one known browser session.
List profiles first, replace the placeholder with an exact displayed name, and
reduce the returned value to a boolean without printing it.

```bash
#!/usr/bin/env bash
set -euo pipefail

get-cookie --browser chrome --list-profiles

cookie_value="$(
  get-cookie sessionid app.example.com \
  --browser chrome \
  --profile "Work" 2>/dev/null || true
)"

if [ -n "$cookie_value" ]; then
  echo "ready"
else
  echo "sign in first" >&2
  unset cookie_value
  exit 1
fi

unset cookie_value

# Run the local command that needs the session here.
```

The value stays in one local process only long enough to become a boolean, so
keep tracing off. This is a useful front door for local developer tooling; for
CI, use mocks, fixtures, or the target service's test-authentication
mechanism instead.

## Where to go next

- [Use Cases](./use-cases.md) maps common goals to the smallest safe workflow.
- [Automation overview](/automation/) covers shell and browser handoffs.
- [Integration Testing](./testing.md) separates deterministic tests from
  opt-in local checks.
- [Security and Privacy](./security.md) explains the credential boundary.

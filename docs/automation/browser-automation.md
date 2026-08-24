---
title: Browser automation
description: Inspect local cookie metadata before a browser automation task.
---

# Browser automation

`get-cookie` can help a local browser-automation workflow answer a narrow
question: is one known cookie readable, and which metadata survived export?
It does not currently expose enough cookie semantics to recreate a browser
session safely in Playwright.

The public export does not preserve `SameSite`. Safari also normalizes both a
real session cookie and malformed or out-of-range lifetime data to
`"Infinity"`, so callers cannot tell those cases apart. Because that
information is lost, this page deliberately does not turn returned values into
browser-context input.

> [!CAUTION]
> Browser cookies are live credentials. Keep this check local, use only
> authorized accounts and domains, and do not print, serialize, inject, or
> persist cookie values in storage state, traces, screenshots, or logs.

## Metadata-only feasibility check

On macOS, Safari is useful for this check because its export can include path
and security flags. Even that richer result is still not a safe automatic
handoff: `SameSite` is absent, and an `"Infinity"` lifetime is ambiguous.
The example projects away `value` and reports only what can be inspected:

```typescript
import {
  SafariCookieQueryStrategy,
  type ExportedCookie,
} from "@mherod/get-cookie";

function summarizeAutomationInputs(cookie: ExportedCookie) {
  const path = cookie.meta?.path;
  const expiry = cookie.expiry;
  const lifetime =
    expiry === "Infinity"
      ? "ambiguous-session-or-invalid"
      : expiry instanceof Date &&
          Number.isFinite(expiry.getTime()) &&
          expiry.getTime() > Date.now()
        ? "future-persistent"
        : "missing-or-expired";

  return {
    name: cookie.name,
    domain: cookie.domain,
    hasPath: typeof path === "string" && path.startsWith("/"),
    hasSecureFlag: typeof cookie.meta?.secure === "boolean",
    hasHttpOnlyFlag: typeof cookie.meta?.httpOnly === "boolean",
    lifetime,
    sameSite: "not exported",
    safeAutomaticHandoff: false,
  };
}

const source = new SafariCookieQueryStrategy();
const cookies = await source.queryCookies("sessionid", "app.example.com");

if (cookies.length !== 1) {
  throw new Error("Expected one local Safari session cookie");
}

console.table(cookies.map(summarizeAutomationInputs));
console.log("Use the service's supported test-login flow for Playwright.");
```

No cookie value is printed, serialized, or passed to a browser context. A
`future-persistent` lifetime only means the exported date is usable for
inspection; it does not make replay safe while `SameSite` is unavailable.
Likewise, `"Infinity"` cannot be accepted as a safe session marker because
Safari uses the same value after normalizing invalid lifetime data.

For a real Playwright run, prefer the service's official test-login,
short-lived API token, or another supported authentication flow. If the public
export later preserves the complete cookie policy and lifetime provenance, a
handoff recipe can be reconsidered then.

## Keep the boundary narrow

- Query one known cookie and one target domain at a time.
- Inspect names, domains, expiry, and presence of metadata; omit `value`.
- Do not cache, serialize, share, or inject the returned array.
- Do not run this pattern in CI or on a shared machine.
- Prefer the service's official API token or test-login mechanism for
  repeatable automation.

## If no cookies are found

1. Confirm you are signed in to the target site in a supported local browser.
2. Check available profiles with `get-cookie --list-profiles`.
3. Try the equivalent CLI query locally:

   ```bash
   get-cookie sessionid example.com --browser chrome --output json
   ```

4. See [troubleshooting](/guide/troubleshooting) for permissions, locked
   databases, and decryption errors.

## Related docs

- [Automation overview](/automation/)
- [Shell scripts](/automation/shell-scripts)
- [CLI usage](/guide/cli-usage)
- [Security and privacy](/guide/security)

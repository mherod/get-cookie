---
title: Browser automation
description: Pass local browser cookies into a short-lived Playwright context.
---

# Browser automation

You can use `get-cookie` to seed a fresh local browser context with cookies
from an existing local session. This is useful for a user-initiated test or
debugging run that should not repeat an interactive login.

The example below assumes Playwright is already installed in your project.

> [!CAUTION]
> Injecting cookies transfers an authenticated session into another browser
> context. Keep this local, use only authorized accounts and domains, and do
> not save Playwright storage state, traces, screenshots, or logs that contain
> cookie values.

## Playwright example

This example asks for cookies only for one domain, fails closed when none are
found, and closes the context when the task ends:

```typescript
import { chromium } from "playwright";
import { getCookie } from "@mherod/get-cookie";

const targetUrl = "https://example.com/dashboard";

const cookies = await getCookie({
  name: "%",
  domain: "example.com",
});

if (cookies.length === 0) {
  throw new Error("No matching browser cookies found");
}

const browser = await chromium.launch();
const context = await browser.newContext();

try {
  await context.addCookies(
    cookies.map((cookie) => ({
      name: cookie.name,
      value: String(cookie.value),
      domain: cookie.domain,
      path: cookie.meta?.path ?? "/",
      ...(cookie.meta?.secure !== undefined && {
        secure: cookie.meta.secure,
      }),
      ...(cookie.meta?.httpOnly !== undefined && {
        httpOnly: cookie.meta.httpOnly,
      }),
    })),
  );

  const page = await context.newPage();
  await page.goto(targetUrl);

  // Perform the local, authorized task here.
} finally {
  await context.close();
  await browser.close();
}
```

The public `getCookie` API accepts a cookie `name` and `domain`. Use `%`
as the name only when the target needs all matching cookies; a named cookie is
safer when one is enough.

## Keep the boundary narrow

- Extract cookies immediately before creating the context.
- Use one target domain at a time.
- Do not cache, serialize, or share the returned array.
- Do not run this pattern in CI or on a shared machine.
- Prefer the service's official API token or test-login mechanism for
  repeatable automation.

## If no cookies are found

1. Confirm you are signed in to the target site in a supported local browser.
2. Check available profiles with `get-cookie --list-profiles`.
3. Try the equivalent CLI query locally:

   ```bash
   get-cookie --url https://example.com/dashboard --render
   ```

4. See [troubleshooting](/guide/troubleshooting) for permissions, locked
   databases, and decryption errors.

## Related docs

- [Automation overview](/automation/)
- [Shell scripts](/automation/shell-scripts)
- [CLI usage](/guide/cli-usage)
- [Security and privacy](/guide/security)

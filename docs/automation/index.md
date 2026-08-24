---
title: Automation
description: Use local browser cookies in short-lived scripts and browser sessions.
---

# Automation with get-cookie

`get-cookie` is useful when a local, user-initiated task needs the same
authenticated session that already exists in your browser. It reads browser
storage on the current machine; it is not a credential-management system.

> [!CAUTION]
> A browser cookie can grant account access. Use cookies only for accounts and
> sites you are authorized to access. Keep them in memory, do not print or
> persist them, and prefer official API tokens for unattended or CI workflows.

## Choose a path

- [Shell scripts](/automation/shell-scripts) cover short-lived local `curl`
  requests.
- [Browser automation](/automation/browser-automation) covers passing cookies
  into a fresh local browser context.
- [CLI usage](/guide/cli-usage) documents query, browser, profile, container,
  and output flags.
- [API reference](/reference/) documents the exported TypeScript surface.

## Two building blocks

For a request that needs one known cookie, name the cookie and target domain.
`--render` returns a Cookie-header string:

```bash
get-cookie sessionid example.com --render
```

`--url` can help inspect hostname and parent-domain matches, but it currently
does not stop at public suffixes. Do not pipe `--url ... --render` into an
outgoing request for an arbitrary URL.

For programmatic use, query by cookie name and domain:

```typescript
import { getCookie } from "@mherod/get-cookie";

const cookies = await getCookie({
  name: "%",
  domain: "example.com",
});
```

`getCookie` returns an array. An empty array is a normal result when no
matching cookie is available, so automation should stop rather than continue
without authentication.

## Safe operating rules

1. Run automation on the same local machine and user account as the browser
   session.
2. Request only the domain and cookie names needed for the current task.
3. Keep cookie values in process memory; never write them to files, logs,
   screenshots, traces, or shell history.
4. Check for an empty result before sending a request or opening a page.
5. Close browser contexts and unset shell variables as soon as the task ends.

## Next steps

- [Shell scripts](/automation/shell-scripts)
- [Browser automation](/automation/browser-automation)
- [Security and privacy](/guide/security)
- [Troubleshooting](/guide/troubleshooting)

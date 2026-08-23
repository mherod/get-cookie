---
title: Guide
description: Choose the shortest path to a safe, accurate get-cookie workflow.
---

# Guide

`get-cookie` reads cookies from browser data already present on your local
machine. Start with the path that matches what you are trying to do:

- Need a value in a shell? Start with [Getting started](./getting-started.md),
  then keep the [CLI reference](./cli-usage.md) nearby.
- Calling from TypeScript? Read [Library usage](./api-usage.md).
- Want ideas for what to build? Browse
  [Examples and recipes](./examples.md).
- Unsure whether your browser or operating system is covered? Check the
  [browser support matrix](./browser-support.md).
- Seeing empty output, profile mismatches, or permission errors? Go to
  [Troubleshooting](./troubleshooting.md).

Cookies often grant account access. Before scripting with them, read
[Security and privacy](./security.md).

## What the package does

The CLI can target a named browser, profile, Firefox container, or explicit
store path. The root library helpers intentionally have a smaller contract:
they query the default Chrome, Firefox, and Safari strategies with a required
`{ name, domain }` specification.

That distinction matters. Use the CLI when you need selection flags; use the
library helpers when you want a small, typed API in local code.

## Recommended reading order

1. [Getting started](./getting-started.md)
2. [CLI reference](./cli-usage.md) or [Library usage](./api-usage.md)
3. [Examples and recipes](./examples.md)
4. [Browser support](./browser-support.md)
5. [Security and privacy](./security.md)
6. [Troubleshooting](./troubleshooting.md)

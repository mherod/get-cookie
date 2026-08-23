# get-cookie examples

These examples show local development and debugging patterns for get-cookie.
They read cookies from browser profiles on the machine where they run, so treat
their output as sensitive credentials.

## Before running examples

Run examples only on a trusted local machine, preferably with a disposable or
test account. Do not run them in CI, on a shared machine, or while screen
sharing. Do not commit, paste, log, or redirect cookie output to files.

From the repository root:

```bash
nvm use
corepack enable
pnpm install --frozen-lockfile
```

Shell examples require:

- `get-cookie` on your `PATH`
- a local browser profile containing the cookies you intend to inspect
- `curl` for HTTP examples
- `jq` for JSON-filtering examples

For a source checkout, build before linking the CLI globally:

```bash
pnpm run build
pnpm link --global
```

The TypeScript examples run from source with `tsx`; they do not require a
global CLI install.

## Shell examples

- `quick-start.sh` — a guided tour of basic extraction, URL queries, rendered
  headers, and login checks.
- `curl-integration.sh` — local `curl`, `wget`, and HTTPie patterns for
  sites where browser-cookie authentication is appropriate.
- `github-auth.sh` — GitHub web-session examples and the distinction between
  GitHub web cookies and API authentication.
- `features-demo.sh` — profile discovery, browser selection, deduplication,
  expired-cookie filtering, and combined CLI flags.
- `cli-examples.sh` — source-tree CLI examples; it wraps
  `pnpm tsx src/cli/cli.ts` instead of requiring a globally installed binary.

Run a shell example from the repository root:

```bash
./examples/quick-start.sh
./examples/curl-integration.sh
./examples/github-auth.sh
./examples/features-demo.sh
./examples/cli-examples.sh
```

Read a script before executing it. Several examples query real local sessions
and may print cookie-derived output to the terminal.

## TypeScript examples

- `basic-usage.ts` — minimal public-package `getCookie` usage.
- `advanced-usage.ts` — wildcard and targeted queries against the source
  entrypoint.
- `comprehensive-demo.ts` — broader source-tree walkthrough, including
  browser-specific strategy selection and metadata summaries.
- `auth-tokens.ts` — sensitive local token-discovery example with truncated
  output; use only with accounts you are authorized to inspect.

Run them from the repository root:

```bash
pnpm exec tsx examples/basic-usage.ts
pnpm exec tsx examples/advanced-usage.ts
pnpm exec tsx examples/comprehensive-demo.ts
pnpm exec tsx examples/auth-tokens.ts
```

## Choosing an example

1. Start with `quick-start.sh` for the CLI.
2. Use `basic-usage.ts` for the public library API.
3. Use `features-demo.sh` to understand profiles and output flags.
4. Use `curl-integration.sh` or `github-auth.sh` only for authorized local
   web-session debugging.
5. Use `comprehensive-demo.ts` when working on source internals.

For the full guides, see the documentation under `docs/guide/`. Keep new
examples small, runnable from the repository root, and safe by default: use
placeholder domains, avoid full cookie values, and never add persistence or CI
recipes for browser cookies.

# Known Limitations

Use the [Browser Support Reference](./browser-support.md) for the canonical
selector matrix. The limitations below apply even on an implemented platform.

## Scope

- The tool reads persisted local browser stores. It cannot retrieve cookies
  that exist only in a private/incognito session or were never written to disk.
- The root `getCookie()` and `batchGetCookies()` helpers query only Chrome,
  Firefox, and Safari by default. Use a strategy directly for another Chromium
  selector.
- The CLI accepts nine `--browser` selectors. `chromium` and `whale` are
  direct `ChromiumCookieQueryStrategy` values, not CLI selectors.
- Safari is macOS-only and has no named-profile filtering.

## Matching and filtering

- Cookie specs require both `name` and `domain`.
- For SQL-backed browsers, name patterns use SQL `%` and `_`; only a
  standalone CLI `*` is normalized to `%`. Do not expect `session*` to
  behave as a wildcard.
- For SQL-backed browsers, the default domain pattern `%` is not a true
  all-domain sentinel: it can omit single-label stored domains such as
  `localhost`. Query those domains explicitly.
- A normal domain query matches the domain and its subdomains. It is not a
  shell-glob matcher, so `*.example.com` is not the recommended form.
- `--include-expired` is currently accepted by the CLI but not applied when
  querying cookies; each browser strategy keeps its existing expiry
  behavior. Do not rely on the flag to recover expired or session cookies.
- CLI deduplication is on by default and keeps one value for each
  `name:domain` pair, preferring the longer value. Use `--include-all` when
  duplicate rows matter.

## Profiles and stores

- `--profile` and `--container` need an explicit `--browser`; the default
  composite strategy does not apply those filters.
- Chromium profile filtering depends on readable `Local State` metadata. If
  that metadata is missing or malformed, the strategy can fall back to all
  discovered cookie files.
- Firefox profile names come from `profiles.ini`; container names come from
  the profile's `containers.json`.
- A custom `--store` path must be readable and must use a format the selected
  strategy understands.

## Permissions, encryption, and locks

- OS permissions, Keychain, DPAPI, keyring access, and locked files can all
  produce an empty result.
- Windows Chromium decryption needs the optional native `@primno/dpapi`
  binding for real DPAPI-protected keys.
- Linux Chromium decryption depends on an available keyring secret or the
  historical fallback password matching the browser's configuration.
- `--force` does not bypass permissions or encryption. It suppresses
  interactive lock/permission remediation, so a locked store may still return
  no cookies.

## Error behavior

The public helpers and browser strategies handle many failures by logging and
returning `[]`. An empty array or CLI `No results` message therefore means
“no readable match,” not necessarily “the cookie does not exist.”

For recovery steps, see [Troubleshooting](./troubleshooting.md).

# Browser Support Reference

This is the canonical browser matrix for the CLI `--browser` selector. It
describes the current source-level support contract; it is not a live
compatibility certification for every browser release.

## CLI browser selectors

| Selector | Browser family | macOS | Linux | Windows | Notes |
| --- | --- | --- | --- | --- | --- |
| `chrome` | Chromium | ✅ | ✅ | ✅ | Uses Chrome's platform data directory. |
| `chromium` | Chromium | ✅ | ✅ | ✅ | Uses the Chromium data directory and Safe Storage entry. |
| `whale` | Chromium | ✅ | ✅ | ✅ | Uses Naver Whale's data directory and Safe Storage entry. |
| `edge` | Chromium | ✅ | ✅ | ✅ | Uses Microsoft Edge's platform data directory. |
| `arc` | Chromium | ✅ | — | ⚠️ | Windows query paths exist, but availability detection still marks Arc unavailable; verify locally before relying on it. |
| `brave` | Chromium | ✅ | ✅ | ✅ | Uses Brave's platform data directory. |
| `opera` | Chromium | ✅ | ✅ | ✅ | Uses Opera's platform data directory. |
| `opera-gx` | Chromium | ✅ | ✅ | ✅ | Uses Opera GX's platform data directory. |
| `vivaldi` | Chromium | ✅ | ✅ | ✅ | Uses Vivaldi's platform data directory. |
| `firefox` | Firefox | ✅ | ✅ | ✅ | Covers regular Firefox plus discovered variant profile roots. |
| `safari` | Safari | ✅ | — | — | Safari is skipped outside macOS. |

- ✅ implemented platform path and strategy
- ⚠️ selector exists, but current source has conflicting platform assumptions
- — unavailable or intentionally skipped

When `--browser` is omitted, the CLI creates a composite strategy containing
all eleven selectors above. An invalid browser value also falls back to that
composite strategy, so use `--verbose` if a selector appears to be ignored.

## Library API boundary

The root `getCookie()` and `batchGetCookies()` helpers query Chrome, Firefox,
and Safari by default. They do not accept a `browser` option. For a specific
CLI selector in code, construct a browser strategy directly:

```typescript
import {
  ChromiumCookieQueryStrategy,
  FirefoxCookieQueryStrategy,
} from "@mherod/get-cookie";

const edge = new ChromiumCookieQueryStrategy("edge", "Work");
const firefox = new FirefoxCookieQueryStrategy("default-release");
```

`chromium` and `whale` work with `--browser`, `--list-profiles`, the public
strategy factory, and MCP browser selection.

## Profiles and containers

- Chromium selectors discover profiles from `Local State` and match
  `--profile` case-insensitively against either the display name or directory
  name.
- Firefox discovers profiles from `profiles.ini`; `--profile` matches the
  profile `Name` case-insensitively.
- `--container` applies only to Firefox and accepts a container name, numeric
  user-context ID, or `none`.
- Safari has one cookie store and does not support named profile filtering.
- Without `--browser`, `--profile` is passed to each supported browser and
  `--container` filters Firefox's portion of the results.

## Firefox variants

Firefox Developer Edition and Firefox ESR are not separate CLI selectors. The
`firefox` strategy discovers their profile roots on Windows alongside regular
Firefox. On Linux it checks native, XDG, Snap, and Flatpak profile roots.

For storage and encryption details, see [Browser-Specific Details](./browsers.md).
For operating-system requirements, see [Platform Support](./platform-support.md).

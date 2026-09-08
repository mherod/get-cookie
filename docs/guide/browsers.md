# Browser-Specific Details

The supported CLI selectors and platform caveats live in the
[Browser Support Reference](./browser-support.md). This page explains how each
browser family is read.

## Chromium family

The CLI selectors `chrome`, `edge`, `arc`, `brave`, `opera`,
`opera-gx`, and `vivaldi` use the same Chromium cookie schema. The strategy
scans for `Cookies` files below each browser's platform-specific user-data
directory and reads them as SQLite databases.

Typical roots include:

| Browser | macOS | Linux | Windows |
| --- | --- | --- | --- |
| Chrome | `~/Library/Application Support/Google/Chrome` | `~/.config/google-chrome` | `%LOCALAPPDATA%\\Google\\Chrome\\User Data` |
| Edge | `~/Library/Application Support/Microsoft Edge` | `~/.config/microsoft-edge` | `%LOCALAPPDATA%\\Microsoft\\Edge\\User Data` |
| Brave | `~/Library/Application Support/BraveSoftware/Brave-Browser` | `~/.config/BraveSoftware/Brave-Browser` | `%LOCALAPPDATA%\\BraveSoftware\\Brave-Browser\\User Data` |
| Opera | `~/Library/Application Support/com.operasoftware.Opera` | `~/.config/opera` | `%APPDATA%\\Opera Software\\Opera Stable` |
| Opera GX | `~/Library/Application Support/com.operasoftware.OperaGX` | `~/.config/opera-gx` | `%APPDATA%\\Opera Software\\Opera GX Stable` |
| Vivaldi | `~/Library/Application Support/Vivaldi` | `~/.config/vivaldi` | `%LOCALAPPDATA%\\Vivaldi\\User Data` |

Arc has an implementation caveat on Windows; use the
[canonical matrix](./browser-support.md) rather than assuming parity with the
other Chromium selectors.

### Chromium profiles

Without `--profile`, every discovered cookie file is queried. The profile
selector is matched case-insensitively against the
display name in `Local State.profile.info_cache`, then against the directory
name such as `Default` or `Profile 1`.

```bash
get-cookie session example.com --browser chrome --profile "Work"
get-cookie --browser chrome --list-profiles
```

If the profile metadata is missing or unreadable, the strategy falls back to
the discovered cookie files instead of proving that the requested profile was
applied. Check `--list-profiles` before relying on a profile-scoped result.

### Chromium encryption

- macOS retrieves a browser-specific Safe Storage secret from Keychain and can
  fall back to Chrome's Safe Storage entry for another Chromium browser.
- Windows reads the encrypted master key from `Local State` and uses DPAPI;
  real decryption requires the optional native `@primno/dpapi` binding.
- Linux tries `secret-tool`, Python `keyring`, and KWallet before falling
  back to Chromium's historical `peanuts` password.
- Modern Windows `v10` cookies use AES-256-GCM. The shared Chromium path also
  handles AES-128-CBC cookies and the modern domain-hash prefix.

## Firefox

Firefox uses `cookies.sqlite` with no additional browser encryption layer.
The strategy discovers profile databases from:

- macOS: `~/Library/Application Support/Firefox/Profiles`
- Windows: roaming `Mozilla\\Firefox`, `Firefox Developer Edition`, and
  `Firefox ESR` roots
- Linux: `~/.mozilla/firefox`, XDG, Snap, and Flatpak roots

`--profile` matches the `Name` field in `profiles.ini`. Use `--container` to
filter Firefox cookies and `--browser firefox` to query only Firefox:

```bash
get-cookie session example.com --browser firefox --profile "default-release"
get-cookie session example.com --browser firefox --container Work
get-cookie session example.com --browser firefox --container none
```

Container names are resolved from the profile's `containers.json`; numeric
IDs are accepted directly. The exported metadata includes `containerId` when
Firefox provides a user-context ID.

## Safari

Safari is macOS-only and uses `Cookies.binarycookies`. The modern container
path is preferred:

```text
~/Library/Containers/com.apple.Safari/Data/Library/Cookies/Cookies.binarycookies
```

If that file does not exist, the strategy falls back to:

```text
~/Library/Cookies/Cookies.binarycookies
```

Safari has no named-profile filter. It checks file readability and can guide an
interactive terminal user to Full Disk Access when macOS blocks the container
file.

## Correct strategy examples

```typescript
import {
  ChromiumCookieQueryStrategy,
  FirefoxCookieQueryStrategy,
  SafariCookieQueryStrategy,
} from "@mherod/get-cookie";

const edge = new ChromiumCookieQueryStrategy("edge", "Work");
const firefox = new FirefoxCookieQueryStrategy("default-release", "Work");
const safari = new SafariCookieQueryStrategy();

const cookies = await edge.queryCookies("session", "example.com");
```

Browser strategies handle inaccessible stores by logging and returning an
empty array. Treat an empty result as “no readable match,” not proof that the
cookie does not exist.

# Platform Support Guide

This guide details the current platform support status and requirements for get-cookie.

## Support Matrix

**→ See the complete [Browser Support Matrix](../reference/browser-support.md) for the definitive browser and platform compatibility table**

**Key platforms:**
- **macOS**: Full support for all 11 browsers including Safari
- **Linux**: Full support for 10 Chromium and Firefox variants  
- **Windows**: Full support for 10 browsers (Arc support added April 2024)

## Platform Details

### macOS

Primary supported platform with full functionality across all major browsers.

#### Supported Browsers

- **Chrome**: Full support with comprehensive cookie decryption
  - v11+ cookies: AES-128-CBC with PBKDF2 key derivation
  - Plaintext cookies: Legacy cookies stored without encryption
  - Keychain integration for encryption keys
  - Hash prefix handling for modern database versions
- **Edge**: Full support (Chromium-based, same as Chrome)
  - Identical encryption and storage format as Chrome
  - Keychain integration for encryption keys
  - All Chrome features supported
- **Firefox**: Full support with profile management
- **Safari**: Full support with container access

#### Requirements

- macOS 10.15 or later recommended
- Keychain Access for Chrome
- Browser profile directory access
- Safari container permissions
- System Integrity Protection enabled

#### Known Limitations

- Some cookies may require specific permissions
- Browser profiles must be unlocked
- Container access may need configuration
- System updates can affect access patterns

### Linux

Full Chrome and Edge support with experimental Firefox support.

#### Supported Browsers

- **Chrome**: Full support with comprehensive cookie decryption
  - v11+ cookies: AES-128-CBC with PBKDF2 key derivation
  - System keyring integration (libsecret)
  - Fallback encryption key support
  - Hash prefix handling for modern database versions
- **Edge**: Full support (Chromium-based, same as Chrome)
  - Identical encryption and storage format as Chrome
  - System keyring integration (libsecret)
  - All Chrome features supported
- **Firefox**: Basic support (experimental)
- **Safari**: Not available on platform

#### Requirements

- **Chrome**: Google Chrome installation, system keyring (libsecret) recommended
- **Edge**: Microsoft Edge installation, system keyring (libsecret) recommended
- **Firefox**: Firefox installation, read access to `~/.mozilla/firefox`
- SQLite database access
- Appropriate file permissions

#### Known Limitations

- **Chrome/Edge**: Requires keyring access or falls back to hardcoded key
- **Firefox**: Database locking issues possible, experimental feature set
- Profile discovery may be limited
- Some system configurations may require additional setup

### Windows

Full support for Chrome, Edge, and all Firefox variants.

#### Supported Browsers

- **Chrome**: Full support with comprehensive cookie decryption
- **Edge**: Full support (Chromium-based, same as Chrome)
  - v10 cookies: AES-256-GCM with DPAPI-protected keys
  - v11+ cookies: AES-128-CBC with PBKDF2 key derivation
  - Windows DPAPI integration for encryption keys
  - Local State file parsing for master key
- **Firefox**: Full support for all Firefox variants
- **Safari**: Not available on platform

#### Requirements

- **Chrome/Edge**: Windows DPAPI access for encrypted cookies
- **Firefox**: Read access to AppData Firefox profile directories
- Appropriate file permissions for browser data folders

#### Known Limitations

- **Chrome/Edge**: Requires DPAPI access, may need elevated permissions
- **Firefox**: Database locking issues possible during browser usage
- Some Windows configurations may require additional setup

## Browser-Specific Notes

### Chrome

- **macOS**: Full support with Keychain integration
  - v11+ cookies with AES-128-CBC encryption
  - Plaintext cookie support for legacy cookies
  - Keychain-based encryption keys
  - Hash prefix handling
- **Linux**: Full support with keyring integration
  - v11+ cookies with AES-128-CBC encryption
  - System keyring (libsecret) integration
  - Fallback encryption key support
  - Hash prefix handling
- **Windows**: Full support with DPAPI integration
  - v10 cookies with AES-256-GCM encryption
  - v11+ cookies with AES-128-CBC encryption
  - DPAPI-protected encryption keys
  - Local State file parsing

### Firefox

- **macOS**: Full support with multi-profile detection
- **Linux**: Full support with profile management
- **Windows**: Full support for all Firefox variants (regular, Developer Edition, ESR)
  - Multiple profile support
  - SQLite database access
  - No encryption handling needed

### Safari

- **macOS**: Full support
  - Container-based access
  - Binary cookie format
  - System-wide storage
- **Other Platforms**: Not available

## Installation Requirements

### macOS

```bash
# Check system version
sw_vers

# Verify Keychain access (for Chrome)
security find-generic-password -s "Chrome Safe Storage"

# Check browser installations
ls -la /Applications/Google\ Chrome.app
ls -la /Applications/Firefox.app
ls -la /Applications/Safari.app
```

### Linux

```bash
# Check Chrome installation
which google-chrome

# Verify Chrome profile access
ls -la ~/.config/google-chrome/Default/

# Check Firefox installation
which firefox

# Verify Firefox profile access
ls -la ~/.mozilla/firefox/

# Check SQLite support
sqlite3 --version

# Check keyring integration (for Chrome)
which secret-tool
```

## Common Issues

### macOS

- Keychain access denied
- Container permissions missing
- Profile directory unreadable
- Browser not installed

### Linux

- **Chrome**: Chrome not installed, keyring access denied, profile directory inaccessible
- **Firefox**: Firefox not installed, profile directory inaccessible, database locked
- Permission issues with browser directories

### Windows

- **Chrome/Edge**: DPAPI access denied, Local State file inaccessible
- **Firefox**: Profile directory inaccessible, database locked
- Permission issues with browser data directories

## Future Support Plans

1. **Browser Expansion**
   - Additional Chromium-based browser variants
   - Enhanced Arc browser support across platforms

2. **Platform Optimizations**
   - Linux keyring integration improvements
   - Windows DPAPI optimization
   - macOS keychain access enhancements

3. **Cross-Platform Enhancements**
   - Unified profile handling across browsers
   - Consistent error reporting and diagnostics
   - Enhanced encryption support for future browser versions

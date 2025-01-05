# Platform Support Guide

This guide details the current platform support status and requirements for get-cookie.

## Support Matrix

| Browser | macOS | Linux | Windows |
| ------- | ----- | ----- | ------- |
| Chrome  | ✅    | ❌    | ❌      |
| Firefox | ✅    | ⚠️    | ❌      |
| Safari  | ✅    | ❌    | ❌      |

✅ Full Support | ⚠️ Experimental | ❌ Not Supported

## Platform Details

### macOS

Primary supported platform with full functionality across all major browsers.

#### Supported Browsers

- **Chrome**: Full support with Keychain integration
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

Limited support with Firefox only.

#### Supported Browsers

- **Firefox**: Basic support (experimental)
- **Chrome**: Not currently supported
- **Safari**: Not available on platform

#### Requirements

- Firefox installation
- Read access to `~/.mozilla/firefox`
- SQLite database access
- Appropriate file permissions

#### Known Limitations

- Firefox only
- No encryption support
- Database locking issues possible
- Profile discovery may be limited
- Experimental feature set

### Windows

Currently not supported.

#### Future Plans

- Firefox support planned
- Chrome support under consideration
- No timeline for implementation

## Browser-Specific Notes

### Chrome

- **macOS**: Full support with Keychain integration
  - Requires Keychain access
  - Handles encrypted cookies
  - Supports multiple profiles
- **Linux**: Not supported
- **Windows**: Not supported

### Firefox

- **macOS**: Full support
  - Multiple profile support
  - SQLite database access
  - No encryption handling needed
- **Linux**: Experimental support
  - Basic cookie access
  - Profile management
  - Limited feature set
- **Windows**: Not supported

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
# Check Firefox installation
which firefox

# Verify profile access
ls -la ~/.mozilla/firefox/

# Check SQLite support
sqlite3 --version
```

## Common Issues

### macOS

- Keychain access denied
- Container permissions missing
- Profile directory unreadable
- Browser not installed

### Linux

- Firefox not installed
- Profile directory inaccessible
- Database locked
- Permission issues

## Future Support Plans

1. **Windows Support**

   - Firefox implementation planned
   - Chrome support under investigation
   - Timeline to be determined

2. **Linux Expansion**

   - Firefox stability improvements
   - Chrome support investigation
   - Better profile management

3. **Cross-Platform**
   - Unified profile handling
   - Consistent error reporting
   - Platform-specific optimisations

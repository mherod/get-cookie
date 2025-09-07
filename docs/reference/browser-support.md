# Browser Support Reference

This page provides the definitive browser and platform support matrix for get-cookie.

## Platform Support Matrix

| Browser                   | macOS | Linux | Windows |
|---------------------------|-------|-------|---------|
| Chrome                    | ✅     | ✅     | ✅       |
| Edge                      | ✅     | ✅     | ✅       |
| Arc                       | ✅     | ❌     | ✅       |
| Opera                     | ✅     | ✅     | ✅       |
| Opera GX                  | ✅     | ✅     | ✅       |
| Firefox                   | ✅     | ✅     | ✅       |
| Firefox Developer Edition | ✅     | ✅     | ✅       |
| Firefox ESR               | ✅     | ✅     | ✅       |
| Safari                    | ✅     | ❌     | ❌       |
| Chromium                  | ✅     | ✅     | ✅       |
| Brave                     | ✅     | ✅     | ✅       |

**Legend:** ✅ Full Support | ❌ Not Supported

## Browser Categories

### Chromium-Based Browsers
**Chrome, Edge, Arc, Opera, Opera GX, Chromium, Brave**

- Share the same cookie storage format and encryption methods
- Differ only in storage locations and keychain service names  
- All use platform-specific encryption (Keychain on macOS, DPAPI on Windows, keyring on Linux)

### Firefox-Based Browsers
**Firefox, Firefox Developer Edition, Firefox ESR**

- Use SQLite databases without additional encryption
- Support multiple profiles with automatic discovery
- Cross-platform with variant-specific profile paths

### Safari
**Safari (macOS only)**

- Uses proprietary binary cookie format
- Single system-wide cookie store
- Requires container permissions on macOS

## Platform Notes

### Arc Browser Availability
- **macOS**: Originally supported platform
- **Linux**: Arc browser is not available on Linux  
- **Windows**: Added Windows 11/10 support in April 2024

### Firefox on Windows
Full support for all Firefox variants on Windows:
- **Regular Firefox**: Standard installation in AppData\\Roaming
- **Firefox Developer Edition**: Separate profile support
- **Firefox ESR**: Extended Support Release detection
- **Local AppData**: Handles both Roaming and Local installations

## Implementation Details

For detailed information about how each browser is supported:

- **Storage locations**: [Browser-Specific Details](../guide/browsers.md)  
- **Platform requirements**: [Platform Support Guide](../guide/platform-support.md)
- **Security implementation**: [Security Guide](../guide/security.md)

## Version History

- **2024-04**: Arc browser added Windows support
- **2024**: Firefox Windows support implemented
- **2023**: Initial cross-platform support for Chrome, Edge, Firefox, Safari
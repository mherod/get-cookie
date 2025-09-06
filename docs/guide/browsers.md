# Browser-Specific Details 🔐

Understanding how get-cookie works with different browsers and platforms.

## Platform Support Matrix

| Browser  | macOS | Linux | Windows |
| -------- | ----- | ----- | ------- |
| Chrome   | ✅    | ✅    | ✅      |
| Edge     | ✅    | ✅    | ✅      |
| Arc      | ✅    | ✅    | ✅      |
| Opera    | ✅    | ✅    | ✅      |
| Opera GX | ✅    | ✅    | ✅      |
| Firefox  | ✅    | ✅    | ✅      |
| Safari   | ✅    | ❌    | ❌      |

✅ Full Support | ❌ Not Supported

All Chromium-based browsers (Chrome, Edge, Arc, Opera, Opera GX) share the same underlying cookie extraction implementation with browser-specific paths and keychain entries.

## Chromium-Based Browsers (Cross-Platform)

Chrome, Edge, Arc, Opera, and Opera GX are all Chromium-based browsers that share the same cookie storage format and encryption methods. The main differences are their storage locations and keychain service names.

### Storage Location

Chrome and Edge store cookies in SQLite databases:

#### Chrome

**macOS:**
```
~/Library/Application Support/Google/Chrome/Default/Cookies
```

**Linux:**
```
~/.config/google-chrome/Default/Cookies
```

**Windows:**
```
%LOCALAPPDATA%\Google\Chrome\User Data\Default\Cookies
```

#### Microsoft Edge

**macOS:**
```
~/Library/Application Support/Microsoft Edge/Default/Cookies
```

**Linux:**
```
~/.config/microsoft-edge/Default/Cookies
```

**Windows:**
```
%LOCALAPPDATA%\Microsoft\Edge\User Data\Default\Cookies
```

#### Arc Browser

**macOS:**
```
~/Library/Application Support/Arc/User Data/Default/Cookies
```

**Linux:**
```
~/.config/arc/Default/Cookies
```

**Windows:**
```
%LOCALAPPDATA%\Arc\User Data\Default\Cookies
```

#### Opera

**macOS:**
```
~/Library/Application Support/com.operasoftware.Opera/Default/Cookies
```

**Linux:**
```
~/.config/opera/Default/Cookies
```

**Windows:**
```
%APPDATA%\Opera Software\Opera Stable\Default\Cookies
```

#### Opera GX

**macOS:**
```
~/Library/Application Support/com.operasoftware.OperaGX/Default/Cookies
```

**Linux:**
```
~/.config/opera-gx/Default/Cookies
```

**Windows:**
```
%APPDATA%\Opera Software\Opera GX Stable\Default\Cookies
```

### Security Model

All Chromium-based browsers use platform-specific encryption methods:

#### macOS
- **v11+ cookies**: AES-128-CBC with PBKDF2 key derivation
- **Plaintext cookies**: Legacy cookies without version prefix are stored as plaintext
- Encryption keys stored in macOS Keychain with browser-specific service names:
  - Chrome: "Chrome Safe Storage"
  - Edge: "Microsoft Edge Safe Storage"
  - Arc: "Arc Safe Storage" 
  - Opera/Opera GX: "Opera Safe Storage"
- Hash prefix support for database meta version ≥ 24
- Automatic retry with graceful degradation on keychain access failures

#### Windows  
- **v10 cookies**: AES-256-GCM with DPAPI-protected key
- **v11+ cookies**: AES-128-CBC with PBKDF2 key derivation
- Encryption key protected by Windows DPAPI
- Local State file contains encrypted master key

#### Linux
- **v11+ cookies**: AES-128-CBC with PBKDF2 key derivation
- Encryption key stored in system keyring (libsecret)
- Fallback to hardcoded key if keyring unavailable
- Hash prefix support for database meta version ≥ 24

### Cookie Versions

- **v10**: Windows-only AES-256-GCM encryption
- **v11+**: Cross-platform AES-128-CBC encryption
- **Plaintext**: macOS legacy cookies without version prefix

### Profile Support

- Multiple profiles supported across all platforms
- Default profile: "Default"
- Profile list discovered from `Local State` file
- Each profile has:
  - Separate cookie database (`Profile Name/Cookies`)
  - Platform-specific encryption handling
  - Independent security context
  - Automatic profile detection and enumeration

### Limitations

- Requires appropriate system permissions (keychain access on macOS, DPAPI on Windows)
- Browser must be installed and cookie database must exist
- Session cookies (without expiry) not accessible
- Incognito/Private mode cookies not supported
- Profile directory must be accessible and readable
- Platform-specific security requirements apply
- Each browser requires its own keychain entry (macOS)
- Database locking handled with automatic retry mechanism

## Firefox (Cross-Platform)

### Storage Location

Firefox uses SQLite for cookie storage:

**macOS:**
```
~/Library/Application Support/Firefox/Profiles/<profile>/cookies.sqlite
```

**Linux:**
```
~/.mozilla/firefox/<profile>/cookies.sqlite
```

**Windows:**
```
%APPDATA%\Mozilla\Firefox\Profiles\<profile>\cookies.sqlite
%LOCALAPPDATA%\Mozilla\Firefox\Profiles\<profile>\cookies.sqlite
```

#### Windows Firefox Variants

**Firefox Developer Edition:**
```
%APPDATA%\Mozilla\Firefox Developer Edition\Profiles\<profile>\cookies.sqlite
```

**Firefox ESR (Extended Support Release):**
```
%APPDATA%\Mozilla\Firefox ESR\Profiles\<profile>\cookies.sqlite
```

### Security Model

- SQLite database with no additional encryption layer
- File system permissions-based security
- Database locking mechanism with automatic retry on SQLITE_BUSY
- Platform-specific profile path detection
- Direct database access via optimized SQL queries
- Graceful handling of locked databases with exponential backoff
- Connection pooling for improved performance

### Profile Support

- Multiple profiles supported across all Firefox variants
- Profile list discovered from `profiles.ini` 
- Each profile is a separate directory with its own cookie database
- Custom profile paths supported
- Cross-platform profile handling with OS-specific paths
- Automatic profile discovery including Developer Edition and ESR variants
- Support for both relative and absolute profile paths

### Limitations

- Database must be unlocked (handled with automatic retry)
- Firefox must be installed with valid profile
- Profile directory must be readable with proper permissions
- httpOnly cookies included but may have access restrictions
- Database temporarily locked during Firefox operations (handled gracefully)
- Automatic retry with exponential backoff on SQLITE_BUSY errors
- WAL mode databases supported

## Safari (macOS Only)

### Storage Location

Safari uses a binary cookie format:

```
~/Library/Containers/com.apple.Safari/Data/Library/Cookies/Cookies.binarycookies
```

### Security Model

- Custom binary cookie format ("cook" magic header)
- Container-based security via macOS sandboxing
- System-level permissions required for container access
- No additional encryption beyond file system protection
- macOS container isolation (com.apple.Safari)
- Requires Full Disk Access or specific container permissions
- Binary format parsing with comprehensive error handling

### Profile Support

- Single profile only
- System-wide cookie store
- No multi-profile support
- All cookies in one file
- Shared between instances
- No profile separation

### Limitations

- macOS only (no Windows or Linux support)
- Binary format may change between Safari versions
- Safari must be installed with valid container
- Full Disk Access or container permissions required
- No profile separation (single system-wide store)
- Some cookies may be restricted by Safari's security model
- Graceful fallback with detailed permission error messages
- Binary format requires custom decoder implementation

## Implementation Examples

### Chromium Browser Strategies (Cross-Platform)

```typescript
import { 
  ChromeCookieQueryStrategy,
  EdgeCookieQueryStrategy,
  ArcCookieQueryStrategy,
  OperaCookieQueryStrategy,
  OperaGXCookieQueryStrategy 
} from "@mherod/get-cookie";

// Create strategy for specific browser
const chromeStrategy = new ChromeCookieQueryStrategy();
const edgeStrategy = new EdgeCookieQueryStrategy();
const arcStrategy = new ArcCookieQueryStrategy();
const operaStrategy = new OperaCookieQueryStrategy();
const operaGXStrategy = new OperaGXCookieQueryStrategy();

try {
  // Query cookies (works on macOS, Linux, and Windows)
  const cookies = await strategy.queryCookies("auth", "example.com");
  console.log(`Found ${cookies.length} cookies`);
  
  // Access cookie properties
  cookies.forEach(cookie => {
    console.log(`${cookie.name}: ${cookie.value}`);
    console.log(`Decrypted: ${cookie.meta.decrypted}`);
    console.log(`Platform: ${process.platform}`);
  });
} catch (error) {
  // Platform-specific error handling
  if (error.message.includes("keychain")) {
    console.error("macOS Keychain access denied");
  } else if (error.message.includes("DPAPI")) {
    console.error("Windows DPAPI decryption failed");
  } else if (error.message.includes("keyring")) {
    console.error("Linux keyring access failed");
  } else if (error.message.includes("profile")) {
    console.error("Chrome profile not found or inaccessible");
  } else {
    console.error("Failed to query cookies:", error);
  }
}
```

### Firefox Strategy (Cross-Platform)

```typescript
import { FirefoxCookieQueryStrategy } from "@mherod/get-cookie";

// Create strategy
const strategy = new FirefoxCookieQueryStrategy();

try {
  // Works on macOS, Linux, and Windows
  const cookies = await strategy.queryCookies("auth", "example.com");
} catch (error) {
  if (error.message.includes("SQLITE_BUSY")) {
    console.error("Database is locked");
  } else if (error.message.includes("EACCES")) {
    console.error("Permission denied");
  } else {
    console.error("Failed to query cookies:", error);
  }
}
```

### Safari Strategy (macOS)

```typescript
import { SafariCookieQueryStrategy } from "@mherod/get-cookie";

// Create strategy
const strategy = new SafariCookieQueryStrategy();

try {
  // macOS only
  const cookies = await strategy.queryCookies("auth", "example.com");
} catch (error) {
  if (error.message.includes("container")) {
    console.error("Safari container access denied");
  } else if (error.message.includes("format")) {
    console.error("Invalid cookie file format");
  } else {
    console.error("Failed to query cookies:", error);
  }
}
```

## Best Practices

### Error Handling

1. **Always use try-catch blocks**

   ```typescript
   try {
     const cookies = await getCookie({
       name: "auth",
       domain: "example.com",
     });
   } catch (error) {
     // Handle specific error types
     console.error("Cookie extraction failed:", error);
   }
   ```

2. **Check platform compatibility**

   ```typescript
   // Chrome and Firefox now work on all platforms
   const supportedPlatforms = ["darwin", "linux", "win32"];
   if (!supportedPlatforms.includes(process.platform)) {
     console.warn("Platform not supported");
   }
   
   // Safari only works on macOS
   if (browserName === "safari" && process.platform !== "darwin") {
     console.warn("Safari support only available on macOS");
   }
   ```

3. **Handle browser-specific errors**
   ```typescript
   if (error.message.includes("SQLITE_BUSY")) {
     // Retry after delay
     await new Promise((resolve) => setTimeout(resolve, 1000));
   }
   ```

### Security Considerations

1. **Chrome Cross-Platform Security**

   - **macOS**: Request Keychain access permission, handle denied access gracefully
   - **Windows**: Ensure DPAPI access rights, handle encryption key failures
   - **Linux**: Verify keyring access, implement fallback for missing keyring
   - Never store or log decrypted encryption keys
   - Handle platform-specific permission errors appropriately

2. **Database Access (Firefox)**

   - Check file permissions before access
   - Handle locked database states
   - Implement retry mechanisms

3. **Container Access (Safari)**
   - Verify container permissions
   - Handle format version changes
   - Don't modify cookie store directly

## Troubleshooting

### Platform-Specific Issues

#### macOS (Chrome & Safari)

- **Chrome**: Check Keychain status, handle plaintext cookies, verify database meta version
- **Safari**: Verify container access, monitor binary format changes
- Handle encryption errors and permission denials
- Monitor profile changes and access rights

#### Linux (Chrome & Firefox)

- **Chrome**: Check keyring availability, handle fallback encryption keys
- **Firefox**: Check file permissions, monitor database locks
- Handle profile paths and SQLite access
- Verify system keyring integration

#### Windows (Chrome)

- **Chrome**: Ensure DPAPI availability, handle v10/v11 cookie versions
- Check Local State file accessibility
- Handle Windows permission model
- Monitor encryption key changes

### Common Problems

1. **Access Denied**

   - Check user permissions
   - Verify browser installation
   - Review security settings
   - Check file ownership

2. **Browser Issues**

   - Verify browser version
   - Check profile status
   - Monitor file locks
   - Handle updates

3. **Data Issues**
   - Validate cookie format
   - Check encryption status
   - Monitor file integrity
   - Handle corruption

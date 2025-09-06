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

All Chromium-based browsers use identical encryption methods depending on the platform and cookie version:

#### macOS
- **v11+ cookies**: AES-128-CBC with PBKDF2 key derivation
- **Plaintext cookies**: Legacy cookies without version prefix are stored as plaintext
- Encryption keys stored in macOS Keychain with browser-specific service names:
  - Chrome: "Chrome Safe Storage"
  - Edge: "Microsoft Edge Safe Storage"
  - Arc: "Arc Safe Storage"
  - Opera/Opera GX: "Opera Safe Storage"
- Hash prefix support for database meta version ≥ 24

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
- Profile list in `Local State` file
- Each profile has:
  - Separate cookie database
  - Platform-specific encryption handling
  - Independent security context

### Limitations

- Requires appropriate system permissions
- Browser must be installed
- Session cookies not accessible
- Incognito mode not supported
- Profile must be accessible
- Platform-specific security requirements
- Each browser requires its own keychain entry (macOS)

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

- SQLite database with no additional encryption
- File system permissions-based security
- Database locking mechanism for concurrent access
- Platform-specific profile paths
- Direct database access required
- Handles database busy states gracefully

### Profile Support

- Multiple profiles supported
- Profile list in `profiles.ini`
- Each profile is separate directory
- Custom profile paths supported
- Cross-platform profile handling
- Automatic profile discovery

### Limitations

- Database must be unlocked
- Firefox must be installed
- Profile directory must be readable
- Some cookies may be protected
- Database may be temporarily locked
- Fails gracefully if database is busy

## Safari (macOS Only)

### Storage Location

Safari uses a binary cookie format:

```
~/Library/Containers/com.apple.Safari/Data/Library/Cookies/Cookies.binarycookies
```

### Security Model

- Custom binary format
- Container-based security
- System-level permissions
- No additional encryption
- macOS container isolation
- Requires container access permission

### Profile Support

- Single profile only
- System-wide cookie store
- No multi-profile support
- All cookies in one file
- Shared between instances
- No profile separation

### Limitations

- macOS only
- Binary format can change between versions
- Safari must be installed
- Container permissions needed
- No profile separation
- Some cookies may be restricted
- Fails silently if container inaccessible

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

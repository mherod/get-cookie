# Browser-Specific Details 🔐

Understanding how get-cookie works with different browsers and platforms.

## Platform Support Matrix

| Browser | macOS | Linux | Windows |
| ------- | ----- | ----- | ------- |
| Chrome  | ✅    | ❌    | ❌      |
| Firefox | ✅    | ✅    | ❌      |
| Safari  | ✅    | ❌    | ❌      |

✅ Full Support | ❌ Not Supported

## Chrome (macOS Only)

### Storage Location

Chrome stores cookies in an SQLite database:

macOS:

```
~/Library/Application Support/Google/Chrome/Default/Cookies
```

### Security Model

- Cookies are encrypted using Chrome Safe Storage
- Encryption key stored in macOS Keychain
- Each profile has a unique encryption key
- Requires Keychain access permission
- Chrome must be installed and configured
- Profile must be unlocked and accessible

### Profile Support

- Multiple profiles supported
- Default profile: "Default"
- Profile list in `Local State` file
- Each profile requires:
  - Separate cookie database
  - Unique encryption key
  - Independent Keychain access

### Limitations

- macOS only (no Linux/Windows support)
- Requires Keychain access
- Chrome must be installed
- Session cookies not accessible
- Incognito mode not supported
- Profile must be unlocked
- Fails silently if encryption key unavailable

## Firefox (macOS & Linux)

### Storage Location

Firefox uses SQLite for cookie storage:

macOS:

```
~/Library/Application Support/Firefox/Profiles/<profile>/cookies.sqlite
```

Linux:

```
~/.mozilla/firefox/<profile>/cookies.sqlite
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

### Chrome Strategy (macOS)

```typescript
import { ChromeCookieQueryStrategy } from "@mherod/get-cookie";

// Create strategy
const strategy = new ChromeCookieQueryStrategy();

try {
  // Query cookies (macOS only)
  const cookies = await strategy.queryCookies("auth", "example.com");
} catch (error) {
  if (error.message.includes("platform")) {
    console.error("Chrome cookies only supported on macOS");
  } else if (error.message.includes("keychain")) {
    console.error("Keychain access denied");
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
  // Works on macOS and Linux
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
   if (process.platform !== "darwin") {
     console.warn("Some features only work on macOS");
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

1. **Keychain Access (Chrome)**

   - Request user permission for Keychain access
   - Handle denied access gracefully
   - Don't store Keychain passwords

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

#### macOS

- Check Keychain status
- Verify container access
- Monitor profile changes
- Handle encryption errors

#### Linux (Firefox)

- Check file permissions
- Monitor database locks
- Handle profile paths
- Verify SQLite access

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

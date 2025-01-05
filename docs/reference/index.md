**@mherod/get-cookie v2.1.1**

---

# @mherod/get-cookie v2.1.1

## Modules

- [cli/cli](cli/cli/index.html)
- [index](index/index.html)
- [types/CookieRender](types/CookieRender/index.html)
- [types/CookieSpec](types/CookieSpec/index.html)
- [types/ExportedCookie](types/ExportedCookie/index.html)

# API Reference

## Platform Requirements

This package is currently only supported on macOS. Support for other platforms is planned for future releases.

## Browser Support

The package supports the following browsers on macOS:

- **Chrome**: Requires macOS Keychain access for cookie decryption
- **Firefox**: Reads from SQLite database in profile directories
- **Safari**: Reads binary cookie format from Safari container

## Core Functions

### getCookie(options)

Retrieves cookies from installed browsers on macOS.

```typescript
interface GetCookieOptions {
  name: string; // Cookie name to search for (use "%" for all)
  domain: string; // Domain to filter cookies by
  removeExpired?: boolean; // Remove expired cookies from results
  limit?: number; // Limit number of results
}

// Returns: Promise<ExportedCookie[]>
```

**Error Handling**:

- Throws if not running on macOS
- Throws if unable to access browser profiles
- Throws if unable to access macOS Keychain (Chrome)
- May return empty array if cookies can't be decrypted

### comboQueryCookieSpec(specs, options)

Query multiple cookie specifications simultaneously.

```typescript
interface CookieSpec {
  name: string;
  domain: string;
}

interface QueryOptions {
  removeExpired?: boolean;
  limit?: number;
}

// Returns: Promise<ExportedCookie[]>
```

**Error Handling**:

- Aggregates errors from individual queries
- Continues even if some queries fail
- Returns successfully retrieved cookies

## Browser-Specific Classes

### ChromeCookieQueryStrategy

Queries cookies from Chrome browser.

**Requirements**:

- macOS only
- Access to Chrome profile directory
- Access to macOS Keychain

### FirefoxCookieQueryStrategy

Queries cookies from Firefox browser.

**Requirements**:

- Access to Firefox profile directory
- Read permission for SQLite database

### SafariCookieQueryStrategy

Queries cookies from Safari browser.

**Requirements**:

- macOS only
- Access to Safari container directory
- Permission to read binary cookie files

## Types

### ExportedCookie

```typescript
interface ExportedCookie {
  domain: string;
  name: string;
  value: string;
  expiry: Date | "Infinity";
  meta: {
    file: string;
    browser: "Chrome" | "Firefox" | "Safari";
    decrypted: boolean;
  };
}
```

## Error Handling

The package uses a comprehensive error handling strategy:

1. **Platform Checks**:

   - All functions verify macOS platform
   - Non-macOS platforms throw early

2. **Browser Access**:

   - Checks for browser profile accessibility
   - Handles missing or corrupt databases

3. **Decryption**:

   - Gracefully handles failed decryption
   - Marks cookies with `decrypted: false`

4. **Permissions**:
   - Checks for necessary file permissions
   - Validates Keychain access for Chrome

## Best Practices

1. **Always use try-catch**:

   ```typescript
   try {
     const cookies = await getCookie({
       name: "session",
       domain: "example.com",
     });
   } catch (error) {
     console.error("Cookie retrieval failed:", error);
   }
   ```

2. **Check decryption status**:

   ```typescript
   const cookies = await getCookie({...});
   const decrypted = cookies.filter(c => c.meta.decrypted);
   const failed = cookies.filter(c => !c.meta.decrypted);
   ```

3. **Handle platform limitations**:
   ```typescript
   if (process.platform !== "darwin") {
     throw new Error("This package only supports macOS");
   }
   ```

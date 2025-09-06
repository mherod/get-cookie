**@mherod/get-cookie v2.1.1**

---

# @mherod/get-cookie v2.1.1

## Modules

- [cli](/reference/cli/cli/)
- [index](/reference/index/)
- [index/functions](/reference/index/functions/)
- [index/type-aliases](/reference/index/type-aliases/)

# API Reference

## Platform Requirements

This package supports Windows, macOS, and Linux platforms with browser-specific compatibility.

## Browser Support

The package supports the following browsers:

- **Chrome, Edge, Arc, Opera, Opera GX**: Cross-platform support (Windows, macOS, Linux)
  - macOS: Keychain access for cookie decryption
  - Windows: DPAPI for cookie decryption  
  - Linux: Keyring (libsecret) for cookie decryption
- **Firefox**: Cross-platform support (Windows, macOS, Linux)
  - Direct SQLite database access
  - No additional encryption layer
- **Safari**: macOS only
  - Binary cookie format parsing
  - Container access required

## Core Functions

### getCookie(options)

Retrieves cookies from installed browsers across all supported platforms.

```typescript
interface GetCookieOptions {
  name: string;          // Cookie name to search for (use "%" for all)
  domain: string;        // Domain to filter cookies by
  removeExpired?: boolean; // Remove expired cookies from results
  limit?: number;        // Limit number of results
  browser?: string;      // Target specific browser
  store?: string;        // Path to specific cookie store
}

// Returns: Promise<ExportedCookie[]>
```

**Error Handling**:

- Returns empty array if platform not supported for specific browser
- Throws if unable to access browser profiles
- Platform-specific errors:
  - macOS: Keychain access errors
  - Windows: DPAPI decryption errors
  - Linux: Keyring access errors
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

- Cross-platform support (Windows, macOS, Linux)
- Access to Chrome profile directory
- Platform-specific decryption:
  - macOS: Keychain access
  - Windows: DPAPI access
  - Linux: Keyring or fallback key

### FirefoxCookieQueryStrategy

Queries cookies from Firefox browser.

**Requirements**:

- Cross-platform support (Windows, macOS, Linux)
- Access to Firefox profile directory
- Read permission for SQLite database
- Automatic retry on database lock

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
  expiry: Date | "Infinity" | undefined;
  meta: {
    file: string;
    browser: string; // "Chrome", "Edge", "Arc", "Opera", "Opera GX", "Firefox", "Safari"
    decrypted: boolean;
    profile?: string;
  };
}
```

## Error Handling

The package uses a comprehensive error handling strategy:

1. **Platform Checks**:

   - Functions verify platform compatibility
   - Safari-specific functions require macOS
   - Other browsers support all platforms

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
   // Safari is macOS-only
   if (browser === "safari" && process.platform !== "darwin") {
     console.warn("Safari is only supported on macOS");
     return [];
   }
   ```

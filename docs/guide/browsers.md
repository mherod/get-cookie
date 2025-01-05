# Browser-Specific Details 🔐

Understanding how get-cookie works with different browsers.

## Chrome

### Storage Location

Chrome stores cookies in an SQLite database:

```
~/Library/Application Support/Google/Chrome/Default/Cookies
```

### Security Model

- Cookies are encrypted using Chrome's Safe Storage
- Requires macOS Keychain access
- Each profile has its own encryption key

### Profile Support

- Multiple profiles supported
- Default profile: "Default"
- Profile list in `Local State` file
- Each profile has separate cookie storage

### Limitations

- Must have Keychain access
- Chrome must be installed
- Some cookies may be session-only
- Incognito mode not supported

## Firefox

### Storage Location

Firefox uses SQLite for cookie storage:

```
~/Library/Application Support/Firefox/Profiles/<profile>/cookies.sqlite
```

### Security Model

- Cookies stored in SQLite database
- No additional encryption
- Direct database access required

### Profile Support

- Multiple profiles supported
- Default profile in `profiles.ini`
- Each profile is a separate directory
- Custom profile paths supported

### Limitations

- Database must be unlocked
- Firefox must be installed
- Profile directory must be readable
- Some cookies may be protected

## Safari

### Storage Location

Safari uses a binary cookie format:

```
~/Library/Containers/com.apple.Safari/Data/Library/Cookies/Cookies.binarycookies
```

### Security Model

- Custom binary format
- No additional encryption
- Container access required

### Profile Support

- Single profile only
- No multi-profile support
- All cookies in one file

### Limitations

- Binary format can change
- Safari must be installed
- Container permissions needed
- Some cookies may be restricted

## Common Features

### Cookie Properties

All browsers support:

- Name
- Value
- Domain
- Path
- Expiry
- Secure flag
- HTTPOnly flag

### Access Requirements

Each browser needs:

- Read permissions
- Profile directory access
- Database/file access

## Implementation Details

### Chrome Strategy

```typescript
import { ChromeCookieQueryStrategy } from "@mherod/get-cookie";

const strategy = new ChromeCookieQueryStrategy();
const cookies = await strategy.queryCookies("auth", "example.com");
```

Key features:

- Safe Storage decryption
- Profile management
- SQLite query optimization

### Firefox Strategy

```typescript
import { FirefoxCookieQueryStrategy } from "@mherod/get-cookie";

const strategy = new FirefoxCookieQueryStrategy();
const cookies = await strategy.queryCookies("auth", "example.com");
```

Key features:

- SQLite direct access
- Profile discovery
- No encryption handling

### Safari Strategy

```typescript
import { SafariCookieQueryStrategy } from "@mherod/get-cookie";

const strategy = new SafariCookieQueryStrategy();
const cookies = await strategy.queryCookies("auth", "example.com");
```

Key features:

- Binary format parsing
- Container access
- Single profile handling

## Best Practices

### Chrome

1. **Profile Management**

   ```bash
   # List profiles
   get-cookie --list-profiles

   # Use specific profile
   get-cookie auth example.com --profile "Profile 1"
   ```

2. **Keychain Access**
   - Grant permanent access
   - Use system keychain
   - Keep Chrome installed

### Firefox

1. **Profile Handling**

   ```bash
   # Check profiles
   ls -la ~/Library/Application\ Support/Firefox/Profiles/

   # Use specific profile
   export FIREFOX_PROFILE="xyz123.default"
   ```

2. **Database Access**
   - Close Firefox
   - Check file permissions
   - Verify profile path

### Safari

1. **Container Access**

   ```bash
   # Check container
   ls -la ~/Library/Containers/com.apple.Safari/

   # Verify cookie file
   file ~/Library/Containers/com.apple.Safari/Data/Library/Cookies/Cookies.binarycookies
   ```

2. **Binary Format**
   - Keep Safari updated
   - Check file permissions
   - Monitor format changes

## Troubleshooting

### Chrome Issues

- Check Keychain Access
- Verify profile exists
- Test encryption key
- Check database permissions

### Firefox Issues

- Verify profile exists
- Check database lock
- Test file permissions
- Monitor profile changes

### Safari Issues

- Check container access
- Verify binary format
- Test file permissions
- Monitor Safari updates

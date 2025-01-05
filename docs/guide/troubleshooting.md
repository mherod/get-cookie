# Troubleshooting Guide 🔍

This guide helps you resolve common issues when using get-cookie.

## Common Issues

### Permission Denied Errors

```bash
Error: Permission denied: /Users/username/Library/...
```

**Solutions:**

1. Check file permissions:
   ```bash
   ls -la ~/Library/Application\ Support/Google/Chrome/
   ls -la ~/Library/Application\ Support/Firefox/Profiles/
   ls -la ~/Library/Containers/com.apple.Safari/
   ```
2. Ensure your user has read access
3. Reset permissions if needed:
   ```bash
   chmod 700 ~/Library/Application\ Support/Google/Chrome/
   ```

### Keychain Access Denied

```bash
Error: Unable to access Chrome Safe Storage
```

**Solutions:**

1. Open Keychain Access.app
2. Search for "Chrome Safe Storage"
3. Update access permissions
4. Allow access when prompted

### No Cookies Found

```bash
No cookies found for domain: example.com
```

**Solutions:**

1. Verify the domain is correct
2. Check if cookies exist in browser
3. Try using wildcard search:
   ```bash
   get-cookie % example.com
   ```
4. Check browser profile paths:
   ```bash
   get-cookie % example.com --dump-grouped
   ```

## Browser-Specific Issues

### Chrome

1. **Profile Access**

   - Ensure Chrome is not running
   - Check profile directory exists
   - Verify profile permissions

2. **Encryption**
   - Keychain access required
   - Safe Storage key must exist
   - Profile must be decryptable

### Firefox

1. **Profile Location**

   - Check default profile exists
   - Verify sqlite database access
   - Test file permissions

2. **Database Access**
   - Database must not be locked
   - File must be readable
   - Check for corruption

### Safari

1. **Container Access**

   - Verify container permissions
   - Check binary cookie file exists
   - Test file access rights

2. **Binary Format**
   - File must be valid format
   - Check for corruption
   - Verify Safari version

## Debugging Steps

1. **Enable Verbose Logging**

   ```bash
   DEBUG=* get-cookie auth example.com
   ```

2. **Check System Requirements**

   ```bash
   # Check macOS version
   sw_vers

   # Check Node.js version
   node --version
   ```

3. **Verify Installation**

   ```bash
   # Check global installation
   which get-cookie

   # Check package version
   get-cookie --version
   ```

4. **Test Basic Access**

   ```bash
   # Test Chrome access
   ls -la ~/Library/Application\ Support/Google/Chrome/Default/Cookies

   # Test Firefox access
   ls -la ~/Library/Application\ Support/Firefox/Profiles/*/cookies.sqlite

   # Test Safari access
   ls -la ~/Library/Containers/com.apple.Safari/Data/Library/Cookies/Cookies.binarycookies
   ```

## Still Having Issues?

1. **Check GitHub Issues**

   - Search existing issues
   - Look for similar problems
   - Check closed issues too

2. **Gather Debug Info**

   ```bash
   # Get system info
   get-cookie --debug-info > debug.log
   ```

3. **Report the Bug**

   - Include debug.log
   - Describe exact steps
   - Share error messages

4. **Get Support**
   - Open GitHub issue
   - Provide reproduction steps
   - Include system details

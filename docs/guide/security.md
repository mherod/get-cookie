# Security & Privacy Guide

This guide covers important security and privacy considerations when using get-cookie.

## Platform-Specific Requirements

### macOS Requirements

- **Keychain Access**: Required for Chrome cookie decryption
- **Browser Profile Directories**: Required for all browsers
- **Safari Container Access**: Required for Safari cookies
- **System Integrity Protection**: Must be enabled for secure operation

### Linux Requirements (Experimental)

- **Firefox Only**: Currently only Firefox is supported
- **Profile Directory**: Requires read access to `~/.mozilla/firefox`
- **SQLite Access**: Direct database access needed
- **No Encryption Support**: Only unencrypted cookies accessible

## System Access Requirements

Different browsers have different security models:

### Chrome (macOS only)

- Requires Keychain access for Safe Storage password
- Each profile has a unique encryption key
- Database must be readable by current user
- Chrome must be installed and configured

### Firefox (macOS & Linux)

- Direct access to profile directory required
- SQLite database must be unlocked
- No encryption handling needed
- Profile discovery varies by platform

### Safari (macOS only)

- Container access permissions required
- Binary cookie format parsing
- System-wide cookie storage
- No profile-specific permissions

## Data Handling

### Local Processing

- All cookie decryption happens locally
- No network communication
- No external services contacted
- Memory-only processing where possible

### Cookie Security

- Treat cookies as sensitive auth tokens
- Never commit to version control
- Avoid logging in CI/CD pipelines
- Clear from memory after use

## Best Practices

1. **Access Control**

   - Use only on development machines
   - Avoid shared/public computers
   - Maintain secure system configuration
   - Regular security updates

2. **Data Storage**

   - Use secure environment variables
   - Clear after use
   - Encrypt if storage needed
   - Use secure memory handling

3. **Usage Guidelines**
   - Only access authorized cookies
   - Respect browser security models
   - Monitor for permission changes
   - Regular security audits

## Platform-Specific Risks

### macOS Risks

- Keychain access restrictions
- Container permission changes
- Profile corruption
- System updates affecting access

### Linux Risks (Firefox)

- Profile directory permissions
- Database locking issues
- Missing browser support
- Limited functionality

## Troubleshooting

### macOS Issues

1. **Keychain Access**

   ```bash
   # Verify Chrome Keychain entry
   security find-generic-password -s "Chrome Safe Storage"

   # Check Keychain permissions
   security list-keychains
   ```

2. **Profile Access**

   ```bash
   # Chrome profiles
   ls -la ~/Library/Application\ Support/Google/Chrome/

   # Firefox profiles
   ls -la ~/Library/Application\ Support/Firefox/Profiles/
   ```

3. **Safari Container**
   ```bash
   # Check container
   ls -la ~/Library/Containers/com.apple.Safari/
   ```

### Linux Issues (Firefox)

1. **Profile Access**

   ```bash
   # Check Firefox profiles
   ls -la ~/.mozilla/firefox/

   # Verify database
   file ~/.mozilla/firefox/*/cookies.sqlite
   ```

2. **Permissions**
   ```bash
   # Fix profile permissions
   chmod 600 ~/.mozilla/firefox/*/cookies.sqlite
   ```

## Security Updates

- Keep get-cookie updated
- Monitor security advisories
- Report issues via GitHub
- Check browser compatibility

## Error Recovery

1. **Permission Denied**

   - Check file ownership
   - Verify user permissions
   - Review security settings
   - Check browser status

2. **Encryption Failures**

   - Verify Keychain status
   - Check profile integrity
   - Review browser config
   - Update if needed

3. **Access Blocked**
   - Check security settings
   - Review permissions
   - Verify browser state
   - Update system config

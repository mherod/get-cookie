# Security & Privacy Guide

This guide covers important security and privacy considerations when using get-cookie.

## System Access Requirements

get-cookie requires specific system-level access to function:

- **macOS Keychain Access**: Required for Chrome cookie decryption
- **Browser Profile Directories**: Required to read cookie databases
- **Safari Container Access**: Required for Safari cookie access

## Data Handling

### Local Processing

- All cookie decryption happens locally on your machine
- No data is ever sent over the network
- No external services are contacted

### Cookie Security

- Cookies are sensitive authentication tokens
- Treat extracted cookies as securely as passwords
- Never commit cookies to version control
- Avoid logging cookie values in CI/CD pipelines

## Best Practices

1. **Access Control**

   - Only run on trusted development machines
   - Don't use on shared or public computers
   - Keep your macOS Keychain secure

2. **Data Storage**

   - Don't store extracted cookies in plain text
   - Use environment variables for temporary storage
   - Clear stored cookies after use

3. **Usage Guidelines**
   - Only extract cookies you own/have permission to use
   - Don't share extracted cookies with other users
   - Be cautious with cookie automation in scripts

## Common Risks

1. **System Access**

   - Browser profile access may be restricted
   - Keychain access may require approval
   - Container permissions may need configuration

2. **Decryption Issues**

   - Some cookies may fail to decrypt
   - Chrome's encryption key may be unavailable
   - Profile corruption can prevent access

3. **Permission Errors**
   - File system permission denials
   - Keychain access denials
   - Container access restrictions

## Troubleshooting

If you encounter security-related issues:

1. **Keychain Access**

   ```bash
   # Check if Chrome has Keychain access
   security find-generic-password -s "Chrome Safe Storage"
   ```

2. **Profile Access**

   ```bash
   # Check Firefox profile permissions
   ls -la ~/Library/Application\ Support/Firefox/Profiles/

   # Check Chrome profile permissions
   ls -la ~/Library/Application\ Support/Google/Chrome/
   ```

3. **Safari Container**
   ```bash
   # Check Safari container permissions
   ls -la ~/Library/Containers/com.apple.Safari/
   ```

## Security Updates

- Keep get-cookie updated to latest version
- Watch for security advisories
- Report security issues via GitHub

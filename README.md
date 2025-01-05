# get-cookie 🍪

Tired of manually copying cookies for API testing? `get-cookie` extracts authentication cookies directly from Chrome, Firefox, and Safari - perfect for testing, debugging, and automation.

## Quick Start 🚀

```bash
# Install globally
pnpm add -g @mherod/get-cookie

# Get a cookie
get-cookie auth example.com

# Get all cookies for a domain
get-cookie % example.com
```

```typescript
// Node.js usage
import { getCookie } from "@mherod/get-cookie";

const cookies = await getCookie({
  name: "auth",
  domain: "example.com",
});
```

⚠️ **Note: macOS only. Windows/Linux support planned.**

## Installation 📦

```bash
pnpm add @mherod/get-cookie    # recommended
npm install @mherod/get-cookie # or npm
yarn add @mherod/get-cookie    # or yarn
```

## Common Use Cases 🎯

- 🔐 Get auth cookies for API testing
- 🔍 Debug cookie issues across browsers
- 🤖 Automate cookie extraction
- 🧪 Use real cookies in integration tests

## Basic Usage Examples 💡

### CLI

```bash
# Get specific cookie
get-cookie auth example.com

# Pretty print
get-cookie auth example.com --render

# From URL
get-cookie --url https://example.com/path
```

### Node.js

```typescript
import { getCookie } from "@mherod/get-cookie";

try {
  // Get specific cookie
  const authCookie = await getCookie({
    name: "auth",
    domain: "example.com",
  });

  // Get multiple cookies
  const cookies = await getCookie({
    name: "%", // all cookies
    domain: "example.com",
    removeExpired: true, // skip expired
  });
} catch (error) {
  console.error("Failed:", error);
}
```

## Features ✨

- 🌐 **Multi-Browser Support**: Works with Chrome, Firefox, and Safari on macOS
- 🔒 **Secure**: Safe cookie extraction with proper encryption handling
- 📝 **TypeScript Ready**: Built with TypeScript for excellent type safety
- 🎯 **Flexible Querying**: Search by name, domain, or URL pattern
- 🔄 **Multiple Output Formats**: JSON, rendered, or grouped results
- 👥 **Profile Support**: Query cookies from different browser profiles

## Platform Support 🖥️

**Important: This package currently only works on macOS.**

- ✅ macOS: Full support for Chrome, Firefox, and Safari
- ❌ Windows: Not currently supported
- ❌ Linux: Not currently supported

Browser-specific notes:

- Chrome: Requires macOS Keychain access for cookie decryption
- Firefox: Reads from SQLite database in profile directories
- Safari: Reads binary cookie format from Safari container

## Output Formats 📊

The CLI supports various output formats:

```bash
# Default output (just values)
get-cookie auth example.com

# JSON output
get-cookie auth example.com --output json

# Rendered output (human-readable)
get-cookie auth example.com --render

# Grouped by browser/profile
get-cookie auth example.com --dump-grouped
```

## Documentation 📚

Full docs at [mherod.github.io/get-cookie](https://mherod.github.io/get-cookie/)

- API Reference
- Advanced Usage
- TypeScript Types
- [Security Guide](https://mherod.github.io/get-cookie/guide/security.html) ⚠️

## Contributing 🤝

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## License 📄

This project is licensed under the MIT License - see the LICENSE file for details.

## Known Limitations 🚧

1. **Platform Support**

   - Only works on macOS
   - Windows and Linux support is planned for future releases

2. **Browser Support**

   - Chrome: Requires macOS Keychain access
   - Firefox: Requires readable profile directory
   - Safari: Requires access to Safari container directory

3. **Error Handling**
   - Some cookies may fail to decrypt
   - Browser profile access may be restricted
   - Keychain access may require user approval

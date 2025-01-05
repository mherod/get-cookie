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

⚠️ **Platform Support**:

- Chrome: macOS only
- Firefox: macOS and Linux
- Safari: macOS only

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
import { getCookie, type CookieSpec } from "@mherod/get-cookie";

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
  });
} catch (error) {
  console.error("Failed:", error);
}
```

## Features ✨

- 🌐 **Multi-Browser Support**:
  - Chrome (macOS)
  - Firefox (macOS, Linux)
  - Safari (macOS)
- 🔒 **Secure**: Browser-specific encryption handling
- 📝 **TypeScript Ready**: Full type safety with exported type definitions
- 🎯 **Flexible Querying**: Search by name, domain, or use wildcards
- 🔄 **Multiple Output Formats**: JSON, rendered, or grouped results
- 👥 **Profile Support**: Chrome and Firefox multi-profile support

⚠️ **Note: Platform support varies by browser. See our [Platform Support Guide](https://mherod.github.io/get-cookie/guide/platform-support.html) for details.**

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

For a comprehensive list of limitations and known issues, please see our [Known Limitations Guide](https://mherod.github.io/get-cookie/guide/limitations.html).

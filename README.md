# get-cookie 🍪

## What is it? 🤔

get-cookie is a powerful command-line utility and Node.js module that allows you to securely retrieve browser cookies from your locally installed browsers. Perfect for:

- 🔐 Testing authenticated web applications
- 🔍 Debugging cookie-related issues
- 🤖 Automating browser cookie extraction
- 🧪 Integration testing with real browser cookies

## Documentation 📚

Visit our [comprehensive documentation](https://mherod.github.io/get-cookie/) for:

- Detailed API reference
- Getting started guides
- Advanced usage examples
- TypeScript type definitions

## Features ✨

- 🌐 **Multi-Browser Support**: Works with Chrome, Firefox, and Safari
- 🔒 **Secure**: Safe cookie extraction with proper encryption handling
- 📝 **TypeScript Ready**: Built with TypeScript for excellent type safety
- 🎯 **Flexible Querying**: Search by name, domain, or URL pattern
- 🔄 **Multiple Output Formats**: JSON, rendered, or grouped results
- 👥 **Profile Support**: Query cookies from different browser profiles

## Installation 📦

Install from npm registry using your preferred package manager:

```bash
# Using pnpm (recommended)
pnpm add @mherod/get-cookie

# Using npm
npm install @mherod/get-cookie

# Using yarn
yarn add @mherod/get-cookie
```

For global installation:

```bash
# Using pnpm (recommended)
pnpm add -g @mherod/get-cookie

# Using npm
npm install -g @mherod/get-cookie

# Using yarn
yarn global add @mherod/get-cookie
```

**Note: Currently only macOS is supported. Windows support is planned for a future release.** 🚧

## How do I use it? 🚀

### CLI Usage 💻

Basic cookie retrieval:

```bash
# Get a specific cookie
get-cookie auth example.com

# Get all cookies for a domain
get-cookie % example.com

# Get cookies with output formatting
get-cookie auth example.com --render
get-cookie auth example.com --dump-grouped

# Get cookies from a specific URL
get-cookie --url https://example.com/path
```

### Node.js Module Usage 📚

Basic usage:

```typescript
import { getCookie } from "@mherod/get-cookie";

// Get a specific cookie
const authCookies = await getCookie({
  name: "auth",
  domain: "example.com",
});

// Get all cookies for a domain
const allCookies = await getCookie({
  name: "%",
  domain: "example.com",
});

// Get cookies from multiple specifications
import { comboQueryCookieSpec } from "@mherod/get-cookie";

const cookies = await comboQueryCookieSpec(
  [
    { name: "session", domain: "api.example.com" },
    { name: "auth", domain: "auth.example.com" },
  ],
  {
    removeExpired: true,
    limit: 10,
  },
);
```

### Advanced Usage 🔧

Using browser-specific strategies:

```typescript
import {
  ChromeCookieQueryStrategy,
  FirefoxCookieQueryStrategy,
} from "@mherod/get-cookie";

// Query Chrome cookies
const chromeStrategy = new ChromeCookieQueryStrategy();
const chromeCookies = await chromeStrategy.queryCookies(
  "sessionId",
  "example.com",
);

// Query Firefox cookies
const firefoxStrategy = new FirefoxCookieQueryStrategy();
const firefoxCookies = await firefoxStrategy.queryCookies(
  "auth",
  "example.com",
);
```

Using URL-based cookie extraction:

```typescript
import { cookieSpecsFromUrl } from "@mherod/get-cookie";

// Get all cookies needed for a specific URL
const specs = cookieSpecsFromUrl("https://example.com/dashboard");
const cookies = await comboQueryCookieSpec(specs);
```

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

## Contributing 🤝

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## License 📄

This project is licensed under the MIT License - see the LICENSE file for details.

## Security 🛡️

This tool handles sensitive data (cookies). Always be careful when extracting and storing cookie information. Never share your cookies or use this tool on untrusted machines.

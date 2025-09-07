# get-cookie 🍪

Extract cookies from your browser's local storage and use them programmatically. This tool reads browser databases directly, handles decryption, and outputs cookies you can use in API calls, testing, or automation.

## What it does

**The Problem**: You're logged into a website in your browser, but you need those same cookies for API testing, automation, or debugging. Manually copying cookies from DevTools is tedious and they expire quickly.

**The Solution**: `get-cookie` reads cookies directly from browser databases (Chrome, Firefox, Safari, etc.), handles all the encryption/decryption, and gives you the cookie values to use programmatically.

## Quick Start

```bash
# Install globally
pnpm add -g @mherod/get-cookie

# Get a specific cookie
get-cookie sessionid example.com

# Get all cookies for a domain  
get-cookie % example.com

# Use in curl/API calls
curl -H "Cookie: auth=$(get-cookie auth api.example.com)" https://api.example.com/user
```

```typescript
// Node.js/TypeScript usage
import { getCookie } from "@mherod/get-cookie";

const cookies = await getCookie({
  name: "auth_token",
  domain: "api.example.com",
});

// Use in fetch, axios, etc.
fetch("https://api.example.com/data", {
  headers: {
    Cookie: `auth_token=${cookies[0]?.value}`
  }
});
```

## Common Use Cases

- **API Testing**: Extract session cookies to test authenticated endpoints
- **Browser Automation**: Get real cookies instead of managing login flows  
- **Debugging**: Compare cookies across browsers to troubleshoot auth issues
- **CI/CD**: Automate authenticated API tests without storing credentials
- **Development**: Test with production-like authentication locally

## How it works

1. **Locates browser databases** on your system (Chrome uses SQLite, Safari uses binary files)
2. **Handles encryption** (Chrome's keychain/DPAPI encryption, etc.) 
3. **Extracts and parses** cookie data
4. **Returns usable values** you can immediately use in HTTP requests

No browser automation, no complex setup - just direct database access.

## Installation 📦

```bash
pnpm add @mherod/get-cookie    # recommended
npm install @mherod/get-cookie # or npm
yarn add @mherod/get-cookie    # or yarn
```

### Node.js Version Requirements 🔧

This project requires Node.js v20.0.0 or v22.0.0. We recommend using [nvm](https://github.com/nvm-sh/nvm) to manage your Node.js versions.

```bash
# Install the correct Node.js version using nvm
nvm install 22.0.0
nvm use 22.0.0

# Or simply run this in the project directory (we've included an .nvmrc file)
nvm use
```

The project includes an `.nvmrc` file that specifies the required Node.js version, so `nvm use` will automatically switch to the correct version when you're in the project directory.

## More Examples

### Command Line

```bash
# Basic cookie extraction
get-cookie sessionid github.com

# Get all cookies for a domain
get-cookie % api.stripe.com

# Pretty print with metadata
get-cookie auth example.com --render

# JSON output for scripting
get-cookie % example.com --output json

# Specific browser/profile
get-cookie auth example.com --browser chrome --profile "Work"
```

### API Usage

```typescript
import { getCookie, batchGetCookies } from "@mherod/get-cookie";

// Single cookie
const auth = await getCookie({
  name: "sessionid", 
  domain: "github.com"
});

// Multiple cookies efficiently (2-3x faster than individual calls)
const cookies = await batchGetCookies([
  { name: "auth", domain: "api.example.com" },
  { name: "session", domain: "app.example.com" },
  { name: "csrf", domain: "admin.example.com" }
]);

// Use in HTTP client
const response = await fetch("https://api.github.com/user", {
  headers: {
    "Cookie": `sessionid=${auth[0]?.value}`
  }
});
```

### Real-world Integration

```bash
# Test API endpoint with browser cookies
AUTH=$(get-cookie connect.sid api.example.com)
curl -H "Cookie: connect.sid=$AUTH" https://api.example.com/profile

# Compare session across browsers  
echo "Chrome:" && get-cookie JSESSIONID app.example.com --browser chrome
echo "Firefox:" && get-cookie JSESSIONID app.example.com --browser firefox

# Batch export for migration
get-cookie % example.com --output json > cookies-backup.json
```

## Features

- **Multiple browsers**: Chrome, Firefox, Safari, Edge, Opera, Arc, Brave - reads from each browser's native storage format
- **Handles encryption**: Automatically decrypts Chrome's keychain-encrypted cookies (macOS), DPAPI-encrypted cookies (Windows), and keyring encryption (Linux)
- **Multiple profiles**: Works with all browser profiles (Personal, Work, etc.)
- **Batch operations**: Get multiple cookies efficiently with built-in SQL optimization (2-3x faster)
- **Cross-platform**: macOS, Linux, Windows support
- **Output formats**: Raw values, JSON, pretty-printed tables

## Browser Support 🌐

Supports **11 major browsers** across **macOS, Linux, and Windows**:

- **Chromium-based**: Chrome, Edge, Arc¹, Opera, Opera GX, Chromium, Brave
- **Firefox-based**: Firefox, Firefox Developer Edition, Firefox ESR  
- **Safari**: macOS only

¹ *Arc added Windows support in April 2024*

**→ See complete [Browser Support Matrix](https://mherod.github.io/get-cookie/reference/browser-support.html) for detailed platform compatibility**

## Documentation 📚

Explore our comprehensive docs at [mherod.github.io/get-cookie](https://mherod.github.io/get-cookie/)

## Contributing 🤝

We welcome contributions! Open an issue or submit a PR to get started.

## License 📄

MIT Licensed. Build something amazing.

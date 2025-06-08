# get-cookie 🍪

Extract browser cookies programmatically. A command-line tool and library that handles Chrome's encryption, Safari's binary formats, and Firefox's data - all through one command. Perfect for testing, automation, and debugging.

## Quick Start 🚀

```bash
pnpm add -g @mherod/get-cookie
get-cookie auth example.com     # Get specific cookie
get-cookie % example.com        # Get all cookies
```

```typescript
import { getCookie } from "@mherod/get-cookie";

const cookies = await getCookie({
  name: "auth",
  domain: "example.com",
});
```

## Perfect For 🎯

- 🔑 **API Testing**: Grab auth cookies directly from your browser for API calls
- 🐞 **Debugging**: Inspect cookies across browsers to track down session issues
- 🤖 **Test Automation**: Use real browser cookies in your integration tests
- 🔄 **CI/CD**: Automate cookie extraction in your testing pipelines
- 🧪 **Local Development**: Test your apps with production-like authentication

## Why get-cookie? ✨

- 🔐 **Battle-tested Security**: Handles complex browser encryption with ease
- 🎯 **Universal Browser Support**: Chrome, Firefox, Safari - we've got you covered
- 🚀 **Developer Experience**: Rich CLI options and type-safe Node.js API
- ⚡ **Lightning Fast**: Optimised binary parsing and decryption
- 🛠️ **Production Ready**: Used in critical testing pipelines worldwide

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

## Usage Examples 💡

### Command Line

```bash
get-cookie auth example.com            # Basic extraction
get-cookie auth example.com --render   # Pretty print
get-cookie --url https://example.com   # URL-based extraction
```

### Node.js API

```typescript
import { getCookie } from "@mherod/get-cookie";

// Specific cookie
const authCookie = await getCookie({
  name: "auth",
  domain: "example.com",
});

// All cookies
const cookies = await getCookie({
  name: "%",
  domain: "example.com",
});
```

## Core Features 🎯

- 🌐 **Cross-Browser**: Chrome (macOS), Firefox (macOS/Linux), Safari (macOS)
- 🔒 **Enterprise Security**: Browser-native encryption handling
- 📝 **TypeScript First**: Complete type safety and IntelliSense
- 🎨 **Flexible Output**: JSON, rendered, or grouped results
- 👥 **Multi-Profile**: Full support for browser profiles

## Documentation 📚

Explore our comprehensive docs at [mherod.github.io/get-cookie](https://mherod.github.io/get-cookie/)

## CI/CD Pipeline 🔄

Our GitHub Actions workflows ensure quality and reliability:

- **🚀 CI Pipeline**: Automated testing across Node.js 20.x & 22.x on macOS
- **📖 Documentation**: Auto-generated docs with TypeScript APIs
- **🧪 Comprehensive Testing**: Swift CookieCreator, binary cookies, and validation scripts
- **📦 Automated Releases**: NPM publishing with GitHub release creation
- **✅ Quality Gates**: TypeScript checking, ESLint, Prettier, and link validation

All workflows run on macOS to ensure native browser compatibility and proper cookie encryption testing.

## Contributing 🤝

We welcome contributions! Open an issue or submit a PR to get started.

## License 📄

MIT Licensed. Build something amazing.

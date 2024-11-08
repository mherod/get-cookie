# get-cookie

## What is it?

get-cookie is a powerful command-line utility and library for retrieving browser cookie values. It provides seamless access to cookies from locally installed browsers, making it invaluable for:

- Testing authenticated web applications
- Automating browser interactions
- Debugging cookie-related issues
- Making authenticated HTTP requests

## Features

- Access cookies from Chrome, Firefox, and Safari browsers
- Support for encrypted cookies
- Cookie filtering by name and domain
- Multiple output formats (plain text, JSON, grouped)
- HTTP request capabilities with automatic cookie injection
- TypeScript support

## Installation

Install globally via npm:

```bash
npm install @mherod/get-cookie --global
```

Or with pnpm:

```bash
pnpm add -g @mherod/get-cookie
```

**Note: Currently supports macOS. Windows support planned.**

## Usage

### Command Line

Basic usage:

```bash
get-cookie <cookie-name> <domain>
```

Example:
```bash
get-cookie auth www.example.com
```

Advanced options:
```bash
get-cookie [options]

Options:
  -h, --help                    Show help
  -v, --verbose                 Enable verbose output
  -d, --dump                    Dump all results
  -D, --dump-grouped            Dump results grouped by profile
  -r, --render                  Render all results
  -F, --fetch <url>            Fetch data from URL
  -H <header>                   Add request header
  --dump-response-headers       Show response headers
  --dump-response-body         Show response body
```

### Library Usage

#### Basic Cookie Retrieval
```typescript
import { getCookie } from "@mherod/get-cookie";

const value = await getCookie("auth", "www.example.com");
console.log(value);
```

#### Fetch with Cookies
```typescript
import { fetchWithCookies } from "@mherod/get-cookie";

const response = await fetchWithCookies("https://api.example.com/data", {
  headers: {
    "Content-Type": "application/json"
  }
});

const data = await response.json();
```

#### Browser-Specific Access
```typescript
import { getChromeCookie, getFirefoxCookie } from "@mherod/get-cookie";

// Chrome cookies
const chromeCookie = await getChromeCookie("auth", "www.example.com");

// Firefox cookies
const firefoxCookie = await getFirefoxCookie("auth", "www.example.com");
```

## API Reference

### Core Functions

- `getCookie(name: string, domain: string): Promise<string>`
- `fetchWithCookies(url: string, options?: RequestInit): Promise<Response>`
- `getChromeCookie(name: string, domain: string): Promise<string>`
- `getFirefoxCookie(name: string, domain: string): Promise<string>`
- `getMergedRenderedCookies(cookieSpec: MultiCookieSpec): Promise<string>`
- `getGroupedRenderedCookies(cookieSpec: MultiCookieSpec): Promise<string[]>`

## Contributing

Contributions welcome! Please read our contributing guidelines and submit pull requests.

## License

MIT
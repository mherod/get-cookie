---
title: What is get-cookie?
description: A powerful Node.js module for querying browser cookies
---

# What is get-cookie?

`get-cookie` is a Node.js module designed to securely retrieve cookies from your local browsers. It provides a simple and secure way to access browser cookies programmatically, with support for multiple browsers and profiles.

## Key Features

- **Multi-Browser Support**: Query cookies from Chrome, Edge, Arc, Opera, Opera GX, Firefox, and Safari browsers
- **Cross-Platform**: Full support for Windows, macOS, and Linux (Safari is macOS-only)
- **Secure Handling**: Safe cookie extraction with proper encryption handling (Keychain on macOS, DPAPI on Windows, keyring on Linux)
- **TypeScript Ready**: Built with TypeScript for excellent type safety and IDE support
- **Chrome Profile Selection**: Target specific Chrome profiles with `--profile` flag
- **Profile Discovery**: List available browser profiles with `--list-profiles`
- **Smart Cookie Deduplication**: Automatically keeps the most valid cookie values from multiple profiles
- **Expired Cookie Filtering**: Filters expired cookies by default with override options
- **CLI Tool**: Easy to use command-line interface with multiple output formats
- **Performance Optimized**: Connection pooling, query monitoring, and automatic retry mechanisms
- **Graceful Degradation**: Handles locked databases and permission issues elegantly

## Use Cases

- Automated testing requiring browser cookies
- Development tools needing cookie access
- Browser automation scripts
- Cookie management utilities
- API authentication and testing
- Security auditing and compliance
- Multi-profile cookie management
- CI/CD pipeline integration

See our comprehensive [Use Cases Guide](./use-cases.md) for detailed examples and best practices.

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
- **Profile Support**: Access cookies from different browser profiles with automatic discovery
- **CLI Tool**: Easy to use command-line interface with multiple output formats
- **Performance Optimized**: Connection pooling, query monitoring, and automatic retry mechanisms
- **Graceful Degradation**: Handles locked databases and permission issues elegantly

## Use Cases

- Automated testing requiring browser cookies
- Development tools needing cookie access
- Browser automation scripts
- Cookie management utilities

# get-cookie Examples

This directory contains example scripts demonstrating various ways to use get-cookie.

## Shell Script Examples

### Quick Start
- **`quick-start.sh`**: Essential patterns for immediate use. Perfect for getting started quickly with basic cookie extraction and one-liner curl commands. Includes a reusable shell function for your `.bashrc/.zshrc`.

### Comprehensive Guides
- **`curl-integration.sh`**: Complete guide for using get-cookie with curl. Covers everything from basic single-cookie requests to complex multi-cookie authentication, POST requests, and cookie validation. Includes colored output and reusable functions.

- **`github-auth.sh`**: Complete GitHub authentication reference. Demonstrates session cookie filtering, endpoint testing, private repository access patterns, and clarifies the difference between web and API authentication.

- **`features-demo.sh`**: All CLI features in one place. Demonstrates profile listing and selection, cookie deduplication, expired cookie filtering, browser-specific extraction, and how to combine features.

### Development Examples
- **`cli-examples.sh`**: Basic reference for development. Shows how to use the command-line interface for common tasks using `pnpm tsx` for local development.

## TypeScript/Node.js Examples

- **`basic-usage.ts`**: Demonstrates basic Node.js module usage
- **`advanced-usage.ts`**: Shows advanced usage with browser-specific strategies

## Running the Examples

### Shell Script Examples

```bash
# Make the script executable
chmod +x quick-start.sh
chmod +x curl-integration.sh
chmod +x github-auth.sh
chmod +x features-demo.sh

# Run the examples
./quick-start.sh          # Quick start guide
./curl-integration.sh     # Comprehensive curl integration
./github-auth.sh          # GitHub authentication patterns
./features-demo.sh        # All CLI features
```

### Development Examples

```bash
# For cli-examples.sh (uses pnpm tsx)
chmod +x cli-examples.sh
./cli-examples.sh
```

### TypeScript Examples

```bash
# Install dependencies if you haven't already
pnpm install

# Run TypeScript examples
ts-node basic-usage.ts
ts-node advanced-usage.ts
```

## Example File Organization

The examples are organized by use case:

1. **Quick Start** → Start here for immediate practical patterns
2. **curl Integration** → For HTTP/API automation workflows
3. **GitHub Auth** → For GitHub-specific authentication scenarios
4. **Features Demo** → For understanding all CLI capabilities

Note: Make sure you have get-cookie installed either globally or as a project dependency before running the examples.

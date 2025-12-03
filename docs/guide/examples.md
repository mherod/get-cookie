# Examples & Tutorials 📚

This guide provides comprehensive examples demonstrating real-world usage of get-cookie. All examples are available in the `examples/` directory of the repository.

## Quick Start Examples

For immediate practical patterns, see the **Quick Start Guide**:

```bash
# View the quick start examples
./examples/quick-start.sh
```

The quick start guide covers:
- Basic cookie extraction patterns
- One-liner curl commands
- Reusable shell functions for your `.bashrc/.zshrc`
- Common output formats
- Quick login status checks

**Example File:** [`examples/quick-start.sh`](https://github.com/mherod/get-cookie/tree/main/examples/quick-start.sh)

## curl Integration Examples

For comprehensive curl integration patterns, see the **curl Integration Guide**:

```bash
# View comprehensive curl integration examples
./examples/curl-integration.sh
```

This guide demonstrates:
- Basic single cookie extraction with curl
- The perfect pattern using `--url` flag
- Multiple cookie authentication
- Downloading protected content
- POST requests with authentication
- Cookie validation functions
- Integration with wget, HTTPie, and other tools

**Example File:** [`examples/curl-integration.sh`](https://github.com/mherod/get-cookie/tree/main/examples/curl-integration.sh)

### Key Patterns from curl Integration

#### The Perfect One-Liner

```bash
# Automatically get all cookies for a URL
curl -H "Cookie: $(get-cookie --url <URL> --render)" <URL>
```

#### Reusable Shell Function

```bash
# Add to your .bashrc/.zshrc
authenticated_curl() {
    local url=$1
    shift
    curl -H "Cookie: $(get-cookie --url "$url" --render 2>/dev/null)" "$@" "$url"
}

# Usage
authenticated_curl https://github.com/settings/profile -s | grep username
```

## GitHub Authentication Examples

For GitHub-specific authentication patterns, see the **GitHub Authentication Guide**:

```bash
# View GitHub authentication examples
./examples/github-auth.sh
```

This guide covers:
- Smart cookie filtering for valid sessions
- JSON filtering for valid cookies
- Expired cookie filtering comparison
- Systematic endpoint testing
- Private repository access patterns
- Web vs API authentication clarification

**Example File:** [`examples/github-auth.sh`](https://github.com/mherod/get-cookie/tree/main/examples/github-auth.sh)

### Important: Web vs API Authentication

Browser cookies work for GitHub **web pages**, NOT the REST API:

✅ **Works with browser cookies:**
- Viewing private repositories in browser
- Accessing settings pages
- Web scraping authenticated content

❌ **Does NOT work with browser cookies:**
- GitHub REST API (`api.github.com`)
- GitHub GraphQL API
- Git operations (clone, push, pull)

For API access, use:
- GitHub CLI: `gh auth login`
- Personal Access Tokens
- OAuth apps

### GitHub Authentication Patterns

#### Method 1: Smart Cookie Filtering (Recommended)

```bash
# Using --url and --render with automatic filtering
COOKIES=$(get-cookie --url https://github.com/settings/profile --render)
curl -H "Cookie: $COOKIES" https://github.com/settings/profile
```

#### Method 2: JSON Filtering for Valid Cookies

```bash
# Get valid session cookie (filter by length)
VALID_SESSION=$(get-cookie --url https://github.com --output json | \
    jq -r '.[] | select(.name == "user_session" and (.value | length) > 20) | .value' | \
    head -1)

# Build cookie header
COOKIE_HEADER="user_session=$VALID_SESSION; __Host-user_session_same_site=$VALID_SESSION"
curl -H "Cookie: $COOKIE_HEADER" https://github.com/settings/profile
```

## CLI Features Examples

For comprehensive demonstrations of all CLI features, see the **Features Demo**:

```bash
# View all CLI features
./examples/features-demo.sh
```

This guide demonstrates:
- Profile listing and selection with `--list-profiles`
- Cookie deduplication (automatic and manual)
- Expired cookie filtering
- Browser-specific extraction
- Combining multiple features
- Practical workflows

**Example File:** [`examples/features-demo.sh`](https://github.com/mherod/get-cookie/tree/main/examples/features-demo.sh)

### Key Features Demonstrated

#### Profile Discovery

```bash
# List available Chrome profiles
get-cookie --browser chrome --list-profiles

# Use a specific profile
get-cookie --url https://github.com --browser chrome --profile "Work" --render
```

#### Cookie Deduplication

```bash
# Default: automatically deduplicates (keeps longest/most valid)
get-cookie user_session github.com --render

# Include all duplicates (for debugging)
get-cookie user_session github.com --include-all --output json
```

#### Expired Cookie Filtering

```bash
# Default: filters expired cookies
get-cookie % github.com --output json

# Include expired cookies (for audit)
get-cookie % github.com --include-expired --output json
```

## Development Examples

For development and testing, see the **CLI Examples**:

```bash
# View development examples
./examples/cli-examples.sh
```

This file demonstrates basic CLI usage patterns for development and testing.

**Example File:** [`examples/cli-examples.sh`](https://github.com/mherod/get-cookie/tree/main/examples/cli-examples.sh)

## TypeScript Examples

For programmatic usage, see the TypeScript examples:

- **`examples/basic-usage.ts`**: Basic Node.js module usage
- **`examples/advanced-usage.ts`**: Advanced usage with browser-specific strategies
- **`examples/comprehensive-demo.ts`**: Comprehensive demonstration of all features
- **`examples/auth-tokens.ts`**: Authentication token extraction patterns

## Running the Examples

### Prerequisites

1. Install get-cookie globally or ensure it's in your PATH:
   ```bash
   npm install -g @mherod/get-cookie
   # or
   pnpm add -g @mherod/get-cookie
   ```

2. Make scripts executable:
   ```bash
   chmod +x examples/*.sh
   ```

3. Ensure required tools are installed:
   - `curl` (for HTTP examples)
   - `jq` (for JSON processing)
   - Browser with cookies (Chrome, Firefox, or Safari)

### Running Shell Script Examples

```bash
# Quick start
./examples/quick-start.sh

# curl integration
./examples/curl-integration.sh

# GitHub authentication
./examples/github-auth.sh

# CLI features
./examples/features-demo.sh
```

### Running TypeScript Examples

```bash
# Install dependencies
pnpm install

# Run TypeScript examples
pnpm tsx examples/basic-usage.ts
pnpm tsx examples/advanced-usage.ts
pnpm tsx examples/comprehensive-demo.ts
pnpm tsx examples/auth-tokens.ts
```

## Example Use Cases Covered

### Authentication & Session Management
- ✅ Extracting authentication tokens
- ✅ Managing multiple browser profiles
- ✅ Session cookie analysis
- ✅ GitHub authentication patterns

### API Testing & Development
- ✅ curl integration patterns
- ✅ Multiple cookie handling
- ✅ POST requests with authentication
- ✅ Cookie validation

### Security & Compliance
- ✅ Cookie deduplication
- ✅ Expired cookie filtering
- ✅ Security token extraction
- ✅ Cookie auditing

### Automation & CI/CD
- ✅ Automated testing patterns
- ✅ Continuous monitoring
- ✅ Error handling patterns
- ✅ Shell script automation

## Best Practices from Examples

### 1. Always Use `--url` Flag for curl Integration

```bash
# ✅ Recommended
curl -H "Cookie: $(get-cookie --url <URL> --render)" <URL>

# ❌ Not recommended (requires knowing domain and cookie names)
curl -H "Cookie: $(get-cookie user_session github.com --render)" <URL>
```

### 2. Filter for Valid Cookies

```bash
# Filter by length to avoid truncated/invalid cookies
VALID_SESSION=$(get-cookie --url https://github.com --output json | \
    jq -r '.[] | select(.name == "user_session" and (.value | length) > 20) | .value' | \
    head -1)
```

### 3. Use Profile Selection to Avoid Conflicts

```bash
# List profiles first
get-cookie --browser chrome --list-profiles

# Then use specific profile
get-cookie --url <URL> --browser chrome --profile "Profile Name" --render
```

### 4. Handle Errors Gracefully

```bash
# Always check for empty results
COOKIES=$(get-cookie --url <URL> --render 2>/dev/null)
if [ -z "$COOKIES" ]; then
    echo "No cookies found" >&2
    exit 1
fi
```

## Related Documentation

- [CLI Usage Guide](./cli-usage.md) - Complete CLI reference
- [Use Cases](./use-cases.md) - Real-world use case patterns
- [Shell Script Automation](../automation/shell-scripts.md) - Automation patterns
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions
- [Security Guide](./security.md) - Security best practices

## Contributing Examples

If you have a useful example pattern, consider contributing it to the examples directory. See the [Contributing Guide](https://github.com/mherod/get-cookie/blob/main/CONTRIBUTING.md) for details.


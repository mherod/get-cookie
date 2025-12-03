# Real-World Use Cases 🚀

This guide demonstrates practical applications of get-cookie for various scenarios. For complete working examples, see the [Examples Guide](./examples.md) and the `examples/` directory in the repository.

## Authentication & Session Management

### Extracting Authentication Tokens

Extract authentication tokens from popular services for API automation:

```bash
# GitHub authentication
AUTH=$(get-cookie user_session github.com)
curl -H "Cookie: user_session=$AUTH" https://api.github.com/user

# Google authentication
SID=$(get-cookie SID google.com)
HSID=$(get-cookie HSID google.com)
curl -H "Cookie: SID=$SID; HSID=$HSID" https://www.google.com/settings

# Multiple authentication cookies (efficiently handled by internal batch operations)
get-cookie % github.com --output json | jq '.[] | select(.name | startswith("_gh_"))'

# For programmatic batch operations, use the API:
# const cookies = await batchGetCookies([...specs])
```

### Managing Multiple Profiles

When working with multiple browser profiles (e.g., personal and work accounts):

```bash
# List all available Chrome profiles
get-cookie --browser chrome --list-profiles

# Extract cookies from specific profile
get-cookie auth example.com --browser chrome --profile "Work Profile"

# Compare cookies across profiles
for profile in "Default" "Profile 1" "Profile 2"; do
  echo "Profile: $profile"
  get-cookie user_session github.com --browser chrome --profile "$profile"
done
```

### Session Cookie Analysis

Analyze session cookies across multiple services efficiently:

```typescript
import { batchGetCookies } from "@mherod/get-cookie";

async function analyzeMultipleServices() {
  // Batch retrieve authentication cookies from multiple services
  const authSpecs = [
    { name: "user_session", domain: "github.com" },
    { name: "SID", domain: "google.com" },
    { name: "sessionid", domain: "linkedin.com" },
    { name: "auth-token", domain: "api.example.com" },
    { name: "_gh_sess", domain: "github.com" }
  ];

  const cookies = await batchGetCookies(authSpecs, {
    deduplicate: true,
    continueOnError: true // Don't fail if one service isn't accessible
  });

  // Group by browser
  const byBrowser = cookies.reduce((acc, cookie) => {
    const browser = cookie.meta?.browser || "Unknown";
    if (!acc[browser]) acc[browser] = [];
    acc[browser].push(cookie);
    return acc;
  }, {});

  // Find most recent session
  const mostRecent = cookies
    .filter(c => c.value && c.value.length > 0)
    .sort((a, b) => b.value.length - a.value.length)[0];

  console.log(`Active sessions: ${Object.keys(byBrowser).length} browsers`);
  console.log(`Most valid session: ${mostRecent?.meta?.browser}`);
}
```

## API Testing & Development

### cURL Integration

Use cookies with cURL for authenticated API requests:

```bash
#!/bin/bash
# Simple authenticated request
curl -H "Cookie: $(get-cookie auth api.example.com)" \
     https://api.example.com/user/profile

# Multiple cookies
COOKIES=$(get-cookie % api.example.com --output json | \
  jq -r '.[] | "\(.name)=\(.value)"' | paste -sd ';')
curl -H "Cookie: $COOKIES" https://api.example.com/data

# With error handling
AUTH=$(get-cookie auth api.example.com 2>/dev/null)
if [ -z "$AUTH" ]; then
  echo "Error: Not logged in"
  exit 1
fi
curl -H "Cookie: auth=$AUTH" https://api.example.com/protected
```

### GitHub Private Repository Access

Access private GitHub repositories or gists:

```bash
#!/bin/bash
# Get GitHub session cookie
SESSION=$(get-cookie user_session github.com)

if [ -z "$SESSION" ]; then
  echo "Error: Not logged into GitHub"
  exit 1
fi

# Access private gist
curl -s -H "Cookie: user_session=$SESSION" \
     https://gist.github.com/username/private-gist-id \
     | grep -o '<div class="blob-code".*</div>' \
     | sed 's/<[^>]*>//g'

# Download private repository archive
curl -L -H "Cookie: user_session=$SESSION" \
     https://github.com/username/private-repo/archive/refs/heads/main.zip \
     -o private-repo.zip
```

## Security & Compliance

### Cookie Deduplication

Handle duplicate cookies from multiple profiles intelligently:

```bash
# Default behavior: deduplicates, keeping longest/most valid values
get-cookie auth example.com

# Include all duplicates for security audit
get-cookie auth example.com --include-all --output json | \
  jq 'group_by(.value) | map({value: .[0].value, count: length})'

# Find conflicting sessions
get-cookie user_session example.com --include-all --render | \
  grep "Browser:" | sort | uniq -c | sort -rn
```

### Expired Cookie Filtering

Manage expired cookies for security compliance:

```bash
# Default: filters expired cookies
get-cookie % example.com

# Include expired cookies for audit
get-cookie % example.com --include-expired --output json | \
  jq '.[] | select(.expiry != "Infinity" and .expiry < now)'

# Count expired vs active cookies
TOTAL=$(get-cookie % example.com --include-expired --output json | jq length)
ACTIVE=$(get-cookie % example.com --output json | jq length)
echo "Active: $ACTIVE, Expired: $((TOTAL - ACTIVE))"
```

### Security Token Extraction

Extract and validate security tokens:

```bash
#!/bin/bash
# Extract JWT tokens
get-cookie % example.com --output json | \
  jq -r '.[] | select(.value | test("^eyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+$")) |
  "\(.name): \(.value | split(".") | .[1] | @base64d | fromjson)"'

# Find OAuth tokens
get-cookie % example.com --output json | \
  jq '.[] | select(.name | test("(oauth|token|jwt|auth|session)"; "i"))'

# Security audit report
echo "=== Cookie Security Audit ==="
echo "Domain: example.com"
echo "Date: $(date)"
echo ""
echo "Secure cookies:"
get-cookie % example.com --output json | jq '.[] | select(.meta.secure == true) | .name'
echo ""
echo "HttpOnly cookies:"
get-cookie % example.com --output json | jq '.[] | select(.meta.httpOnly == true) | .name'
```

## Automation & CI/CD

### Automated Testing

Use in automated test scripts:

```bash
#!/bin/bash
# Test authentication across browsers
BROWSERS=("chrome" "firefox" "safari" "edge")
FAILED=0

for browser in "${BROWSERS[@]}"; do
  echo "Testing $browser..."
  AUTH=$(get-cookie auth example.com --browser "$browser" 2>/dev/null)

  if [ -n "$AUTH" ]; then
    # Test the auth cookie
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
               -H "Cookie: auth=$AUTH" \
               https://api.example.com/verify)

    if [ "$RESPONSE" = "200" ]; then
      echo "✓ $browser: Authentication valid"
    else
      echo "✗ $browser: Authentication failed (HTTP $RESPONSE)"
      FAILED=$((FAILED + 1))
    fi
  else
    echo "- $browser: No auth cookie found"
  fi
done

exit $FAILED
```

### Continuous Monitoring

Monitor cookie health and expiration using batch operations:

```typescript
import { batchGetCookies } from "@mherod/get-cookie";
import { addDays, isAfter } from "date-fns";

async function monitorCookies() {
  // Use batch operation to monitor multiple domains efficiently
  const domains = ["example.com", "api.example.com", "auth.example.com"];
  const cookieSpecs = domains.map(domain => ({ name: "%", domain }));

  const cookies = await batchGetCookies(cookieSpecs, {
    deduplicate: false // Include all cookies for comprehensive monitoring
  });

  const report = {
    total: cookies.length,
    expiringSoon: 0,
    expired: 0,
    session: 0,
    byBrowser: {}
  };

  const soon = addDays(new Date(), 7);
  const now = new Date();

  cookies.forEach(cookie => {
    // Count by browser
    const browser = cookie.meta?.browser || "Unknown";
    report.byBrowser[browser] = (report.byBrowser[browser] || 0) + 1;

    // Check expiration
    if (cookie.expiry === "Infinity") {
      report.session++;
    } else if (cookie.expiry instanceof Date) {
      if (isAfter(now, cookie.expiry)) {
        report.expired++;
      } else if (isAfter(soon, cookie.expiry)) {
        report.expiringSoon++;
      }
    }
  });

  console.log("Cookie Health Report:", report);

  // Alert if issues found
  if (report.expiringSoon > 0) {
    console.warn(`⚠️ ${report.expiringSoon} cookies expiring within 7 days`);
  }
  if (report.expired > 0) {
    console.error(`❌ ${report.expired} expired cookies found`);
  }
}
```

## Browser Migration

### Migrating Between Browsers

Export cookies from one browser to import into another:

```bash
#!/bin/bash
# Export from Chrome
get-cookie % example.com --browser chrome --output json > chrome-cookies.json

# Export from Firefox
get-cookie % example.com --browser firefox --output json > firefox-cookies.json

# Compare cookies between browsers
echo "Cookies in Chrome but not Firefox:"
jq -r '.[] | .name' chrome-cookies.json | sort > chrome-names.txt
jq -r '.[] | .name' firefox-cookies.json | sort > firefox-names.txt
comm -23 chrome-names.txt firefox-names.txt

# Merge cookies from all browsers (deduplicated)
get-cookie % example.com --output json > all-cookies.json
echo "Total unique cookies: $(jq length all-cookies.json)"
```

### Profile Migration

Migrate cookies between Chrome profiles:

```bash
#!/bin/bash
SOURCE_PROFILE="Default"
TARGET_PROFILE="Profile 1"

# List cookies in source profile
echo "Extracting cookies from $SOURCE_PROFILE..."
get-cookie % example.com \
  --browser chrome \
  --profile "$SOURCE_PROFILE" \
  --output json > source-cookies.json

# Compare with target profile
echo "Comparing with $TARGET_PROFILE..."
get-cookie % example.com \
  --browser chrome \
  --profile "$TARGET_PROFILE" \
  --output json > target-cookies.json

# Find missing cookies
echo "Cookies to migrate:"
jq -r '.[] | .name' source-cookies.json | while read name; do
  if ! jq -e ".[] | select(.name == \"$name\")" target-cookies.json >/dev/null 2>&1; then
    echo "  - $name"
  fi
done
```

## Development Tools

### Cookie Inspector

Build a comprehensive cookie inspection tool:

```typescript
import { getCookie } from "@mherod/get-cookie";

async function inspectCookie(name: string, domain: string) {
  const cookies = await getCookie({ name, domain });

  if (cookies.length === 0) {
    console.log("Cookie not found");
    return;
  }

  cookies.forEach((cookie, index) => {
    console.log(`\n=== Cookie ${index + 1} of ${cookies.length} ===`);
    console.log(`Name: ${cookie.name}`);
    console.log(`Domain: ${cookie.domain}`);
    console.log(`Value: ${cookie.value.substring(0, 50)}...`);
    console.log(`Browser: ${cookie.meta?.browser || "Unknown"}`);
    console.log(`Profile: ${cookie.meta?.file?.split("/").slice(-2, -1)[0] || "Default"}`);
    console.log(`Secure: ${cookie.meta?.secure || false}`);
    console.log(`HttpOnly: ${cookie.meta?.httpOnly || false}`);
    console.log(`Path: ${cookie.meta?.path || "/"}`);

    if (cookie.expiry === "Infinity") {
      console.log("Expiry: Session cookie");
    } else if (cookie.expiry) {
      const exp = new Date(cookie.expiry);
      const days = Math.ceil((exp.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      console.log(`Expiry: ${exp.toISOString()} (${days} days)`);
    }

    // Check if it's a JWT
    if (cookie.value.match(/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/)) {
      console.log("Type: JWT Token");
      try {
        const payload = JSON.parse(
          Buffer.from(cookie.value.split('.')[1], 'base64').toString()
        );
        console.log("JWT Claims:", JSON.stringify(payload, null, 2));
      } catch (e) {
        console.log("JWT: Failed to decode");
      }
    }
  });
}

// Usage
inspectCookie("user_session", "github.com");
```

### Cookie Watcher

Monitor cookie changes in real-time:

```bash
#!/bin/bash
# Watch for cookie changes
DOMAIN="example.com"
INTERVAL=5
LAST_HASH=""

echo "Watching cookies for $DOMAIN..."
echo "Press Ctrl+C to stop"

while true; do
  CURRENT_HASH=$(get-cookie % "$DOMAIN" --output json | sha256sum | cut -d' ' -f1)

  if [ "$CURRENT_HASH" != "$LAST_HASH" ]; then
    if [ -n "$LAST_HASH" ]; then
      echo "[$(date '+%H:%M:%S')] Cookies changed!"
      get-cookie % "$DOMAIN" --render
    fi
    LAST_HASH="$CURRENT_HASH"
  fi

  sleep $INTERVAL
done
```

## Best Practices

### Error Handling

Always implement proper error handling:

```bash
#!/bin/bash
# Robust cookie extraction with fallbacks
get_auth_cookie() {
  local domain="$1"
  local cookie=""

  # Try Chrome first
  cookie=$(get-cookie auth "$domain" --browser chrome 2>/dev/null)
  if [ -n "$cookie" ]; then
    echo "$cookie"
    return 0
  fi

  # Fall back to Firefox
  cookie=$(get-cookie auth "$domain" --browser firefox 2>/dev/null)
  if [ -n "$cookie" ]; then
    echo "$cookie"
    return 0
  fi

  # Try all browsers
  cookie=$(get-cookie auth "$domain" 2>/dev/null)
  if [ -n "$cookie" ]; then
    echo "$cookie"
    return 0
  fi

  return 1
}

# Usage with error handling
if AUTH=$(get_auth_cookie "example.com"); then
  echo "Authentication cookie found"
  # Use the cookie
else
  echo "Error: No authentication cookie found"
  echo "Please log in to example.com in your browser"
  exit 1
fi
```

### Performance Optimization

For optimal performance when querying multiple cookies, use the built-in `batchGetCookies` function:

```typescript
import { batchGetCookies } from "@mherod/get-cookie";

// Optimized batch cookie retrieval (2-3x faster than individual queries)
const cookies = await batchGetCookies([
  { name: "auth", domain: "api.example.com" },
  { name: "session", domain: "example.com" },
  { name: "token", domain: "*.example.com" }
], {
  deduplicate: true,      // Remove duplicate cookies (default: true)
  concurrency: 10,        // Fallback concurrency limit (default: 10)
  continueOnError: true   // Don't fail entire batch on individual errors (default: true)
});

console.log(`Retrieved ${cookies.length} cookies from ${specs.length} specifications`);

// Get detailed results with error information
import { batchGetCookiesWithResults } from "@mherod/get-cookie";

const results = await batchGetCookiesWithResults([
  { name: "auth", domain: "api.example.com" },
  { name: "session", domain: "example.com" },
  { name: "invalid", domain: "nonexistent.com" }
]);

results.forEach(result => {
  if (result.error) {
    console.error(`Failed to get ${result.spec.name}: ${result.error.message}`);
  } else {
    console.log(`Found ${result.cookies.length} cookies for ${result.spec.name}`);
  }
});
```

**Performance Benefits:**
- **2-3x faster** than individual queries
- **Reduced database round-trips** (N queries → 1 combined query)
- **Connection pooling** with 100% cache hit rates
- **Automatic fallback** to parallel individual queries if batch fails

## Troubleshooting Common Issues

### Multiple Profile Conflicts

When cookies from multiple profiles conflict:

```bash
# Debug which profile has which cookie
get-cookie auth example.com --include-all --output json | \
  jq '.[] | {profile: (.meta.file | split("/") | .[-2]), value: .value}'

# Force specific profile
get-cookie auth example.com --browser chrome --profile "Work Profile"

# Clear profile specification to search all
get-cookie auth example.com --browser chrome
```

### Database Lock Errors

Handle locked database errors gracefully:

```bash
# Force extraction despite locks
get-cookie auth example.com --force

# Retry with exponential backoff
for i in 1 2 4 8 16; do
  if AUTH=$(get-cookie auth example.com 2>/dev/null); then
    echo "Success: $AUTH"
    break
  fi
  echo "Retrying in ${i}s..."
  sleep $i
done
```

### Platform-Specific Issues

Handle platform differences:

```bash
#!/bin/bash
# Cross-platform cookie extraction
case "$(uname -s)" in
  Darwin)
    # macOS: Try Safari first
    COOKIE=$(get-cookie auth example.com --browser safari 2>/dev/null)
    ;;
  Linux)
    # Linux: Try Firefox first
    COOKIE=$(get-cookie auth example.com --browser firefox 2>/dev/null)
    ;;
  MINGW*|MSYS*|CYGWIN*)
    # Windows: Try Edge first
    COOKIE=$(get-cookie auth example.com --browser edge 2>/dev/null)
    ;;
esac

# Fall back to Chrome if needed
if [ -z "$COOKIE" ]; then
  COOKIE=$(get-cookie auth example.com --browser chrome 2>/dev/null)
fi

# Final fallback: try all browsers
if [ -z "$COOKIE" ]; then
  COOKIE=$(get-cookie auth example.com 2>/dev/null)
fi
```

## See Also

- [Examples & Tutorials](./examples.md) - Complete working examples and tutorials
- [CLI Usage Guide](./cli-usage.md) - Complete CLI reference
- [API Documentation](../reference/index.md) - Programmatic usage
- [Security Guide](./security.md) - Security best practices
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions

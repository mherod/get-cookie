# Shell Script Automation 📜

Learn how to automate tasks with get-cookie using shell scripts.

## Basic Scripts

### Cookie Extraction

```bash
#!/bin/bash

# Get a single cookie
AUTH_COOKIE=$(get-cookie auth example.com)

# Get multiple cookies
get-cookie % example.com --output json > cookies.json

# Use with curl
curl -H "Cookie: auth=$AUTH_COOKIE" https://api.example.com/data
```

### Error Handling

```bash
#!/bin/bash
set -e

function get_auth_cookie() {
    local domain=$1
    local cookie

    if ! cookie=$(get-cookie auth "$domain"); then
        echo "Failed to get auth cookie" >&2
        return 1
    }

    if [ -z "$cookie" ]; then
        echo "No auth cookie found" >&2
        return 1
    }

    echo "$cookie"
}

# Usage with error handling
if cookie=$(get_auth_cookie "example.com"); then
    echo "Cookie found: $cookie"
else
    echo "Error: $?"
    exit 1
fi
```

## Common Use Cases

### API Testing

```bash
#!/bin/bash

# Test endpoints with authentication
function test_endpoint() {
    local endpoint=$1
    local domain=$2
    local cookie

    cookie=$(get-cookie auth "$domain") || {
        echo "Failed to get auth cookie" >&2
        return 1
    }

    curl -H "Cookie: auth=$cookie" "https://$domain$endpoint"
}

# Usage
test_endpoint "/api/user" "example.com"
```

### Cookie Backup

```bash
#!/bin/bash

# Backup cookies for a domain
function backup_cookies() {
    local domain=$1
    local backup_dir="./cookie-backups"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local filename="$backup_dir/${domain//[.]/_}_$timestamp.json"

    mkdir -p "$backup_dir"
    get-cookie % "$domain" --output json > "$filename"
    echo "Cookies backed up to: $filename"
}

# Usage
backup_cookies "example.com"
```

### Multi-Domain Scripts

```bash
#!/bin/bash

# Process multiple domains
function process_domains() {
    local domains=("$@")
    local success=0
    local failed=()

    for domain in "${domains[@]}"; do
        if get-cookie auth "$domain" > /dev/null; then
            ((success++))
        else
            failed+=("$domain")
        fi
    done

    echo "Processed $success domains successfully"
    if [ ${#failed[@]} -gt 0 ]; then
        echo "Failed domains: ${failed[*]}"
        return 1
    fi
}

# Usage
process_domains "api.example.com" "auth.example.com" "app.example.com"
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: API Tests
on: [push]

jobs:
  test:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v2

      - name: Setup
        run: |
          npm install -g @mherod/get-cookie

      - name: Run Tests
        run: |
          ./scripts/test-api.sh
```

### Test Script

```bash
#!/bin/bash
# test-api.sh

set -e

# Setup
echo "Setting up test environment..."
npm install -g @mherod/get-cookie

# Get auth cookie
AUTH_COOKIE=$(get-cookie auth api.example.com) || {
    echo "Failed to get auth cookie"
    exit 1
}

# Run tests
echo "Running API tests..."
for endpoint in "/api/v1/user" "/api/v1/data" "/api/v1/settings"; do
    if ! curl -H "Cookie: auth=$AUTH_COOKIE" "https://api.example.com$endpoint"; then
        echo "Failed testing endpoint: $endpoint"
        exit 1
    fi
done

echo "All tests passed!"
```

## Best Practices

### Error Handling

```bash
#!/bin/bash

# Set error handling
set -e                  # Exit on error
set -u                  # Exit on undefined variable
set -o pipefail        # Exit on pipe failure

# Trap errors
trap 'echo "Error on line $LINENO"' ERR

# Function with proper error handling
function safe_get_cookie() {
    local domain=$1
    local retries=3
    local delay=1

    for ((i=1; i<=retries; i++)); do
        if cookie=$(get-cookie auth "$domain"); then
            echo "$cookie"
            return 0
        fi

        echo "Attempt $i failed, retrying in ${delay}s..." >&2
        sleep $delay
        delay=$((delay * 2))
    done

    echo "Failed after $retries attempts" >&2
    return 1
}
```

### Logging

```bash
#!/bin/bash

# Setup logging
LOG_FILE="cookie-script.log"

function log() {
    local level=$1
    local message=$2
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] [$level] $message" | tee -a "$LOG_FILE"
}

# Usage
log "INFO" "Starting cookie extraction"
if ! cookie=$(get-cookie auth example.com); then
    log "ERROR" "Failed to get cookie"
    exit 1
fi
log "SUCCESS" "Cookie extracted successfully"
```

### Cleanup

```bash
#!/bin/bash

# Cleanup function
function cleanup() {
    log "INFO" "Cleaning up..."
    rm -f cookies.json
    # Add other cleanup tasks
}

# Register cleanup
trap cleanup EXIT

# Script logic
get-cookie % example.com --output json > cookies.json
# Process cookies
# Cleanup happens automatically on exit
```

## Debug Support

```bash
#!/bin/bash

# Debug mode
DEBUG=${DEBUG:-0}

function debug() {
    if [ "$DEBUG" = "1" ]; then
        echo "[DEBUG] $*" >&2
    fi
}

# Usage
debug "Attempting to get cookie for domain: $domain"
cookie=$(get-cookie auth "$domain")
debug "Cookie result: ${cookie:0:10}..."
```

## Security Considerations

1. **Cookie Storage**

   ```bash
   # Store cookies securely
   umask 077  # Restrict file permissions
   get-cookie auth example.com > secure_cookie.txt
   ```

2. **Cleanup Sensitive Data**

   ```bash
   # Secure cleanup
   function secure_cleanup() {
       local file=$1
       dd if=/dev/urandom of="$file" bs=1k count=1
       rm -f "$file"
   }
   ```

3. **Environment Variables**
   ```bash
   # Avoid exposing sensitive data
   cookie=$(get-cookie auth example.com)
   export COOKIE_HASH=$(echo "$cookie" | sha256sum)
   # Use COOKIE_HASH for tracking, not the actual cookie
   ```

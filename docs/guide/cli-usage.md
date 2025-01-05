# CLI Usage Guide 💻

Learn how to use get-cookie from the command line.

## Basic Commands

### Get a Specific Cookie

```bash
get-cookie auth example.com
```

### Get All Cookies for a Domain

```bash
get-cookie % example.com
```

### Get Cookies by URL

```bash
get-cookie --url https://example.com/dashboard
```

## Output Formats

### Default Output (Values Only)

```bash
get-cookie auth example.com
# Output: value1234
```

### JSON Output

```bash
get-cookie auth example.com --output json
# Output:
# {
#   "name": "auth",
#   "value": "value1234",
#   "domain": "example.com",
#   "expiry": "2024-12-31T23:59:59.000Z"
# }
```

### Pretty Printed

```bash
get-cookie auth example.com --render
# Output:
# 🍪 Cookie: auth
# 📍 Domain: example.com
# 📝 Value: value1234
# ⏰ Expires: 31 Dec 2024
```

### Grouped by Browser

```bash
get-cookie auth example.com --dump-grouped
# Output:
# Chrome (Default Profile):
#   - auth=value1234
# Firefox (default):
#   - auth=value5678
# Safari:
#   - auth=value90ab
```

## Advanced Usage

### Filter by Browser

```bash
# Chrome only
get-cookie auth example.com --browser chrome

# Firefox only
get-cookie auth example.com --browser firefox

# Safari only
get-cookie auth example.com --browser safari
```

### Handle Multiple Domains

```bash
# Get auth cookies from multiple domains
get-cookie auth "*.example.com"

# Get all cookies from multiple domains
get-cookie % "*.example.com"
```

### Profile Selection

```bash
# List available profiles
get-cookie --list-profiles

# Use specific profile
get-cookie auth example.com --profile "Profile 1"
```

## Options Reference

| Option           | Description                    | Example               |
| ---------------- | ------------------------------ | --------------------- |
| `--output`       | Output format (json, rendered) | `--output json`       |
| `--browser`      | Target browser                 | `--browser chrome`    |
| `--profile`      | Browser profile                | `--profile "Default"` |
| `--url`          | Get cookies for URL            | `--url https://...`   |
| `--render`       | Pretty print output            | `--render`            |
| `--dump-grouped` | Group by browser/profile       | `--dump-grouped`      |
| `--version`      | Show version                   | `--version`           |
| `--help`         | Show help                      | `--help`              |

## Environment Variables

| Variable          | Description             | Default     |
| ----------------- | ----------------------- | ----------- |
| `DEBUG`           | Enable debug logging    | `false`     |
| `NO_COLOR`        | Disable colored output  | `false`     |
| `CHROME_PROFILE`  | Default Chrome profile  | `"Default"` |
| `FIREFOX_PROFILE` | Default Firefox profile | `null`      |

## Examples

### Testing API Authentication

```bash
# Get auth cookie and use with curl
curl -H "Cookie: $(get-cookie auth api.example.com)" https://api.example.com/me
```

### Export Multiple Cookies

```bash
# Export all cookies for domain
get-cookie % example.com --output json > cookies.json
```

### Debug Mode

```bash
# Enable verbose logging
DEBUG=* get-cookie auth example.com

# Show browser paths
get-cookie --debug-paths
```

### Automation

```bash
# Use in shell scripts
AUTH_COOKIE=$(get-cookie auth example.com)
if [ -n "$AUTH_COOKIE" ]; then
    echo "Cookie found: $AUTH_COOKIE"
fi
```

## Error Handling

The CLI uses exit codes to indicate status:

| Code | Meaning           |
| ---- | ----------------- |
| `0`  | Success           |
| `1`  | General error     |
| `2`  | Invalid arguments |
| `3`  | Permission denied |
| `4`  | Browser error     |

Example error handling in scripts:

```bash
get-cookie auth example.com || {
    case $? in
        2) echo "Invalid arguments" ;;
        3) echo "Permission denied" ;;
        4) echo "Browser error" ;;
        *) echo "Unknown error" ;;
    esac
    exit 1
}
```

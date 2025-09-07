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

### Rendered Output

```bash
get-cookie auth example.com --render
# Or short form:
get-cookie auth example.com -r

# Output:
# Cookie: auth
# Domain: example.com
# Value: value1234
# Expires: 31 Dec 2024
# Browser: Chrome
# Profile: Default
```

### Detailed Dump

```bash
get-cookie auth example.com --dump
# Or short form:
get-cookie auth example.com -d

# Dumps all cookie details including metadata
```

### Grouped Output

```bash
# Grouped dump output
get-cookie auth example.com --dump-grouped
# Or short form:
get-cookie auth example.com -G

# Output groups cookies by browser and profile:
# Chrome (Default):
#   auth: value1234
#   (expires: 2024-12-31T23:59:59.000Z)
# Firefox (default-release):
#   auth: value5678
#   (expires: 2024-12-31T23:59:59.000Z)
# Safari:
#   auth: value90ab
#   (expires: 2024-12-31T23:59:59.000Z)
```

## Advanced Usage

### Filter by Browser

```bash
# Chrome only
get-cookie auth example.com --browser chrome

# Edge only
get-cookie auth example.com --browser edge

# Arc only
get-cookie auth example.com --browser arc

# Opera only
get-cookie auth example.com --browser opera

# Opera GX only
get-cookie auth example.com --browser opera-gx

# Firefox only
get-cookie auth example.com --browser firefox

# Safari only
get-cookie auth example.com --browser safari
```

### Chrome Profile Selection

```bash
# Target a specific Chrome profile
get-cookie auth example.com --browser chrome --profile "Profile 1"

# Use the default Chrome profile
get-cookie auth example.com --browser chrome --profile Default

# List all available Chrome profiles
get-cookie --browser chrome --list-profiles
```

### Cookie Management Options

```bash
# Include expired cookies (filtered by default)
get-cookie auth example.com --include-expired

# Include all duplicate cookies (deduplicated by default)
get-cookie auth example.com --include-all

# Combine both options for complete cookie dump
get-cookie % example.com --include-expired --include-all
```

### Force Operations

```bash
# Force extraction despite locked database
get-cookie auth example.com --force

# Short form
get-cookie auth example.com -f
```

### Verbose Logging

```bash
# Enable verbose output for debugging
get-cookie auth example.com --verbose

# Short form
get-cookie auth example.com -v
```

### Use Custom Cookie Store

```bash
# Specify path to cookie database
get-cookie auth example.com --store ~/custom/path/cookies.sqlite

# Use with Firefox profile
get-cookie auth example.com --store ~/.mozilla/firefox/abc123.default/cookies.sqlite
```

### Handle Multiple Domains

```bash
# Get auth cookies from multiple domains
get-cookie auth "*.example.com"

# Get all cookies from multiple domains
get-cookie % "*.example.com"
```

### Alternative Query Methods

```bash
# Using --name and --domain flags
get-cookie --name auth --domain example.com
get-cookie -n auth -D example.com

# Wildcard pattern for all cookies
get-cookie --name % --domain example.com
get-cookie -n % -D example.com

# Pattern matching in name
get-cookie --name "session*" --domain example.com
```

## Options Reference

### General Options

| Option      | Short | Description                                         | Example     |
|-------------|-------|-----------------------------------------------------|-------------|
| `--help`           | `-h`  | Show help message with build timestamp             | `--help`           |
| `--verbose`        | `-v`  | Enable verbose output                               | `--verbose`        |
| `--force`          | `-f`  | Force operation despite warnings (e.g., locked DBs) | `--force`          |
| `--list-profiles`  |       | List available browser profiles                     | `--list-profiles`  |
| `--include-expired`|       | Include expired cookies (filtered by default)       | `--include-expired`|
| `--include-all`    |       | Include all duplicate cookies (deduplicated by default) | `--include-all` |

### Query Options

| Option      | Short | Description                          | Example                  |
|-------------|-------|--------------------------------------|--------------------------|
| `--name`    | `-n`  | Cookie name pattern (% or * for wildcard)| `--name auth%`           |
| `--domain`  | `-D`  | Cookie domain pattern                    | `--domain *.example.com` |
| `--url`     | `-u`  | URL to extract cookie specs from         | `--url https://...`      |
| `--browser` |       | Target specific browser                  | `--browser chrome`       |
| `--profile` |       | Target specific Chrome profile           | `--profile "Profile 1"`  |
| `--store`   |       | Path to specific cookie store file       | `--store /path/to/db`    |

### Output Options

| Option           | Short | Description                     | Example          |
|------------------|-------|---------------------------------|------------------|
| `--output`       |       | Output format (json)                | `--output json`  |
| `--dump`         | `-d`  | Dump all cookie details             | `--dump`         |
| `--dump-grouped` | `-G`  | Dump results grouped by browser     | `--dump-grouped` |
| `--render`       | `-r`  | Render formatted human-readable output | `--render`    |

## Environment Variables

| Variable          | Description             | Default     |
|-------------------|-------------------------|-------------|
| `DEBUG`    | Enable debug logging           | `false`     |
| `NO_COLOR` | Disable colored output         | `false`     |
| `NODE_ENV` | Set to 'production' for less verbose output | `development` |

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

# Or use verbose flag
get-cookie auth example.com --verbose
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
|------|-------------------|
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

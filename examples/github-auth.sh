#!/bin/bash

# ============================================================================
# GitHub Authentication with get-cookie
# ============================================================================
# Complete guide for authenticating with GitHub using browser cookies.
# Covers web authentication, private repository access, and API limitations.
# ============================================================================

echo "🔐 GitHub Authentication with get-cookie"
echo "========================================"
echo ""

# ============================================================================
# Method 1: Smart Cookie Filtering (Recommended)
# ============================================================================
echo "1️⃣ Method 1: Smart Cookie Filtering"
echo "───────────────────────────────────"

echo "Using --url and --render with automatic filtering:"
COOKIES=$(get-cookie --url https://github.com/settings/profile --render 2>/dev/null)
echo "Cookie string length: $(echo "$COOKIES" | wc -c) characters"

# Test authentication
echo -n "Testing authentication: "
RESPONSE=$(curl -s -L \
    -H "Cookie: $COOKIES" \
    -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" \
    -H "Accept: text/html,application/xhtml+xml" \
    "https://github.com/settings/profile")

if echo "$RESPONSE" | grep -q "Sign in to GitHub"; then
    echo "❌ Not authenticated (redirected to login)"
elif echo "$RESPONSE" | grep -q "Your profile"; then
    echo "✅ Authenticated! (settings page accessed)"
else
    TITLE=$(echo "$RESPONSE" | grep -o "<title>[^<]*</title>" | head -1)
    echo "ℹ️  Page title: $TITLE"
fi
echo ""

# ============================================================================
# Method 2: JSON Filtering for Valid Session Cookies
# ============================================================================
echo "2️⃣ Method 2: JSON Filtering for Valid Cookies"
echo "─────────────────────────────────────────────"

# Function to get valid cookies only
get_valid_cookie() {
    local cookie_name=$1
    local domain=$2
    local min_length=${3:-10}  # Minimum valid length

    get-cookie "$cookie_name" "$domain" --output json 2>/dev/null | \
        jq -r --arg min "$min_length" \
        '.[] | select(.value | length > ($min | tonumber)) | .value' | \
        head -1
}

# Get a valid session
VALID_SESSION=$(get_valid_cookie "user_session" "github.com" 20)

if [ -n "$VALID_SESSION" ]; then
    echo "✅ Found valid session: ${VALID_SESSION:0:20}... (${#VALID_SESSION} chars)"

    # Build cookie header with same-site cookie
    COOKIE_HEADER="user_session=$VALID_SESSION; __Host-user_session_same_site=$VALID_SESSION"

    # Test with curl
    echo -n "Testing with filtered session: "
    AUTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Cookie: $COOKIE_HEADER" \
        -H "User-Agent: Mozilla/5.0" \
        "https://github.com/settings/profile")

    if [ "$AUTH_CODE" = "200" ]; then
        echo "✅ Authenticated (HTTP 200)"
    else
        echo "❌ Not authenticated (HTTP $AUTH_CODE)"
    fi
else
    echo "❌ No valid session cookie found"
fi
echo ""

# ============================================================================
# Method 3: Expired Cookie Filtering Comparison
# ============================================================================
echo "3️⃣ Method 3: Expired Cookie Filtering"
echo "─────────────────────────────────────"

DEFAULT_COUNT=$(get-cookie --url https://github.com --output json 2>/dev/null | jq 'length')
EXPIRED_COUNT=$(get-cookie --url https://github.com --output json --include-expired 2>/dev/null | jq 'length')

echo "Cookies comparison:"
echo "  • Without --include-expired: $DEFAULT_COUNT cookies"
echo "  • With --include-expired: $EXPIRED_COUNT cookies"

if [ "$EXPIRED_COUNT" -gt "$DEFAULT_COUNT" ]; then
    DIFF=$((EXPIRED_COUNT - DEFAULT_COUNT))
    echo "  • ✅ Filtered out $DIFF expired cookies"
else
    echo "  • ℹ️  No expired cookies to filter (all cookies are valid)"
fi
echo ""

# ============================================================================
# Method 4: Systematic Endpoint Testing
# ============================================================================
echo "4️⃣ Method 4: Testing GitHub Endpoints"
echo "────────────────────────────────────"

# Function to test GitHub endpoints
test_endpoint() {
    local name=$1
    local url=$2
    local check_string=$3

    echo -n "  • $name: "

    COOKIES=$(get-cookie --url "$url" --render 2>/dev/null)
    if [ -z "$COOKIES" ]; then
        echo "No cookies found"
        return 1
    fi

    RESPONSE=$(curl -s -L \
        -H "Cookie: $COOKIES" \
        -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" \
        -H "Accept: text/html,application/xhtml+xml" \
        "$url")

    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Cookie: $COOKIES" \
        -H "User-Agent: Mozilla/5.0" \
        "$url")

    if echo "$RESPONSE" | grep -q "$check_string" > /dev/null 2>&1; then
        echo "✅ Authenticated (HTTP $HTTP_CODE)"
        return 0
    elif [ "$HTTP_CODE" = "200" ]; then
        echo "⚠️  Accessible but not authenticated (HTTP 200)"
        return 1
    elif [ "$HTTP_CODE" = "404" ]; then
        echo "❌ Not found (HTTP 404)"
        return 1
    elif [ "$HTTP_CODE" = "302" ] || [ "$HTTP_CODE" = "301" ]; then
        echo "🔄 Redirected - not authenticated (HTTP $HTTP_CODE)"
        return 1
    else
        echo "❌ Failed (HTTP $HTTP_CODE)"
        return 1
    fi
}

echo "Testing various GitHub endpoints:"
test_endpoint "Public profile" \
    "https://github.com/$(get-cookie dotcom_user github.com --output json 2>/dev/null | jq -r '.[0].value' | cut -d';' -f1)" \
    "Follow"

test_endpoint "Settings page" \
    "https://github.com/settings/profile" \
    "Public profile"

test_endpoint "Notifications" \
    "https://github.com/notifications" \
    "notifications"

test_endpoint "Security settings" \
    "https://github.com/settings/security" \
    "Two-factor"

test_endpoint "SSH keys" \
    "https://github.com/settings/keys" \
    "SSH keys"
echo ""

# ============================================================================
# Method 5: Private Repository Access
# ============================================================================
echo "5️⃣ Method 5: Private Repository Access"
echo "───────────────────────────────────────"

# Get username
USERNAME=$(get-cookie dotcom_user github.com --output json 2>/dev/null | jq -r '.[0].value' | cut -d';' -f1)

if [ -n "$USERNAME" ] && [ "$USERNAME" != "null" ]; then
    echo "👤 Logged in as: $USERNAME"
    echo ""

    # Get valid session
    FULL_SESSION=$(get-cookie user_session github.com --output json 2>/dev/null | \
        jq -r '.[] | select(.value | length > 10) | .value' | head -1)

    if [ -n "$FULL_SESSION" ]; then
        COOKIE_HEADER="user_session=$FULL_SESSION; __Host-user_session_same_site=$FULL_SESSION"

        echo "📊 Repository Statistics:"
        REPOS_HTML=$(curl -s -L \
            -H "Cookie: $COOKIE_HEADER" \
            -H "User-Agent: Mozilla/5.0" \
            "https://github.com/$USERNAME?tab=repositories")

        PUBLIC_COUNT=$(echo "$REPOS_HTML" | grep -o '>Public<' | wc -l | xargs)
        PRIVATE_COUNT=$(echo "$REPOS_HTML" | grep -o '>Private<' | wc -l | xargs)

        echo "  • Public repositories: $PUBLIC_COUNT"
        echo "  • Private repositories: $PRIVATE_COUNT"
        echo "  • Total: $((PUBLIC_COUNT + PRIVATE_COUNT))"

        if [ "$PRIVATE_COUNT" -gt 0 ]; then
            echo ""
            echo "✅ Can see private repositories!"
        fi
    else
        echo "⚠️  Could not get valid session cookie"
    fi
else
    echo "❌ Could not detect username from cookies"
fi
echo ""

# ============================================================================
# Important: Web vs API Authentication
# ============================================================================
echo "⚠️  Important: Web vs API Authentication"
echo "─────────────────────────────────────────"
echo ""
echo "Browser cookies work for GitHub WEB pages, NOT the REST API:"
echo ""
echo "✅ Works with browser cookies:"
echo "  • Viewing private repositories in browser"
echo "  • Accessing settings pages"
echo "  • Web scraping authenticated content"
echo ""
echo "❌ Does NOT work with browser cookies:"
echo "  • GitHub REST API (api.github.com)"
echo "  • GitHub GraphQL API"
echo "  • Git operations (clone, push, pull)"
echo ""
echo "For API access, use:"
echo "  • GitHub CLI: gh auth login"
echo "  • Personal Access Tokens"
echo "  • OAuth apps"
echo ""

# ============================================================================
# Practical Examples
# ============================================================================
echo "💡 Practical Examples"
echo "────────────────────"
echo ""
echo "# The Ultimate One-Liner:"
echo 'curl -H "Cookie: $(get-cookie --url https://github.com/settings/profile --render)" \'
echo '     https://github.com/settings/profile'
echo ""
echo "# Download a file from a private repo:"
echo 'curl -H "Cookie: $(get-cookie --url https://github.com/user/repo --render)" \'
echo '     https://github.com/user/repo/raw/main/file.txt'
echo ""
echo "# Access private gist:"
echo 'curl -H "Cookie: $(get-cookie --url https://gist.github.com --render)" \'
echo '     https://gist.github.com/user/gist-id'
echo ""

# ============================================================================
# Debugging Tips
# ============================================================================
echo "🔍 Debugging Tips"
echo "────────────────"
echo ""
echo "If authentication isn't working:"
echo ""
echo "1. Check cookie quality:"
echo '   get-cookie --url <URL> --output json | jq '"'"'.[] | {name, value: .value[:20], len: (.value | length)}'"'"
echo ""
echo "2. Check for expired cookies:"
echo '   get-cookie --url <URL> --output json | jq '"'"'.[] | select(.expiry < now | todate)'"'"
echo ""
echo "3. Filter for valid session cookies:"
echo '   get-cookie --url <URL> --output json | jq -r '"'"'.[] | select(.name == "user_session" and (.value | length) > 20) | .value'"'"
echo ""
echo "4. Try specific browser profiles:"
echo '   get-cookie --url <URL> --browser chrome --render'
echo ""

echo "✅ GitHub authentication guide complete!"
echo ""
echo "💡 Key Insights:"
echo "  • Default behavior filters expired cookies for better success"
echo "  • Use --include-expired to include all cookies (debugging)"
echo "  • For best results: get-cookie --url <URL> --render"
echo "  • Some browsers may store invalid cookies that need filtering"
echo "  • Browser cookies work for web pages, not the API"


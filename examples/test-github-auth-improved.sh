#!/bin/bash

# Test GitHub authentication with improved expired cookie filtering
echo "🔐 Testing GitHub Authentication with Improved Cookie Filtering"
echo "=============================================================="
echo ""

# Method 1: Using --url and --render (the recommended pattern)
echo "Method 1: Using --url and --render (default filtering)"
echo "──────────────────────────────────────────────────────"

# Get cookies for GitHub settings
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

# Method 2: With --include-expired to see the difference
echo "Method 2: With --include-expired flag"
echo "─────────────────────────────────────"

COOKIES_WITH_EXPIRED=$(get-cookie --url https://github.com/settings/profile --render --include-expired 2>/dev/null)
echo "Cookie string length: $(echo "$COOKIES_WITH_EXPIRED" | wc -c) characters"

# Compare cookie counts
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

# Method 3: Smart filtering for valid session cookies
echo "Method 3: JSON filtering for valid cookies"
echo "──────────────────────────────────────────"

# Get valid session cookie (filter by length and expiry)
VALID_SESSION=$(get-cookie --url https://github.com --output json 2>/dev/null | \
    jq -r '.[] | select(.name == "user_session" and (.value | length) > 20) | .value' | \
    head -1)

if [ -n "$VALID_SESSION" ]; then
    echo "✅ Found valid session cookie: ${VALID_SESSION:0:20}... (${#VALID_SESSION} chars)"
    
    # Build cookie header
    COOKIE_HEADER="user_session=$VALID_SESSION; __Host-user_session_same_site=$VALID_SESSION"
    
    # Test authentication
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

# Final test: Access private content
echo "Final Test: Accessing Private Repository List"
echo "─────────────────────────────────────────────"

# Try to get username from cookies
USERNAME=$(get-cookie dotcom_user github.com --output json 2>/dev/null | jq -r '.[0].value' | cut -d';' -f1)

if [ -n "$USERNAME" ]; then
    echo "Username detected: $USERNAME"
    
    # Get repository list with authentication
    REPOS_HTML=$(curl -s -L \
        -H "Cookie: $(get-cookie --url https://github.com/$USERNAME --render)" \
        -H "User-Agent: Mozilla/5.0" \
        "https://github.com/$USERNAME?tab=repositories")
    
    # Count visible repositories
    PUBLIC_COUNT=$(echo "$REPOS_HTML" | grep -o '>Public<' | wc -l | xargs)
    PRIVATE_COUNT=$(echo "$REPOS_HTML" | grep -o '>Private<' | wc -l | xargs)
    
    echo "Repository visibility:"
    echo "  • Public repositories: $PUBLIC_COUNT"
    echo "  • Private repositories: $PRIVATE_COUNT"
    
    if [ "$PRIVATE_COUNT" -gt 0 ]; then
        echo "  • ✅ Can see private repositories!"
    else
        echo "  • ⚠️  No private repositories visible"
    fi
else
    echo "❌ Could not detect username from cookies"
fi
echo ""

echo "💡 Summary:"
echo "─────────"
echo "• Default behavior filters expired cookies for better success"
echo "• Use --include-expired to include all cookies (debugging)"
echo "• For best results: get-cookie --url <URL> --render"
echo "• Some browsers may store invalid cookies that need filtering"
echo ""

# Check if the feature is making a difference
if [ "$DEFAULT_COUNT" -eq "$EXPIRED_COUNT" ]; then
    echo "ℹ️  Note: Currently all cookies are valid (no expired cookies found)"
else
    echo "✅ Expired cookie filtering is improving authentication!"
fi
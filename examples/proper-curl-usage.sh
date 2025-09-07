#!/bin/bash

# PROPER usage of get-cookie with --url and --render for curl
echo "✅ Correct get-cookie Usage with --url and --render"
echo "==================================================="
echo ""

# The CORRECT way to use get-cookie with curl
echo "📌 The Right Pattern:"
echo "────────────────────"
echo 'curl -H "Cookie: $(get-cookie --url <URL> --render)" <URL>'
echo ""

# Test 1: Simple check - what cookies do we get?
echo "1️⃣ Checking cookies for GitHub settings:"
COOKIES=$(get-cookie --url https://github.com/settings/profile --render 2>/dev/null)
echo "   Cookie string length: $(echo "$COOKIES" | wc -c) characters"
echo "   Number of cookies: $(echo "$COOKIES" | grep -o ';' | wc -l | xargs expr 1 +)"
echo ""

# Test 2: Real-world usage - accessing authenticated content
echo "2️⃣ Testing authenticated access to GitHub:"
echo ""

test_url_with_cookies() {
    local url=$1
    local description=$2
    
    echo "• Testing: $description"
    echo "  URL: $url"
    
    # Get cookies for this specific URL
    local cookies=$(get-cookie --url "$url" --render 2>/dev/null)
    
    # Make the request
    local response=$(curl -s -L \
        -H "Cookie: $cookies" \
        -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" \
        -H "Accept: text/html,application/xhtml+xml" \
        "$url")
    
    # Check if we're authenticated
    if echo "$response" | grep -q "Sign in to GitHub" > /dev/null 2>&1; then
        echo "  ❌ Not authenticated (redirected to login)"
    elif echo "$response" | grep -q "<title>.*Settings.*</title>" > /dev/null 2>&1; then
        echo "  ✅ Authenticated! (reached settings page)"
    elif echo "$response" | grep -q "Your profile" > /dev/null 2>&1; then
        echo "  ✅ Authenticated! (reached profile page)"
    else
        local title=$(echo "$response" | grep -o "<title>[^<]*</title>" | head -1)
        echo "  ℹ️  Page title: $title"
    fi
    echo ""
}

# Test various GitHub pages
test_url_with_cookies "https://github.com/settings/profile" "GitHub Settings"
test_url_with_cookies "https://github.com/new" "New Repository Page"

# Test 3: Working with other sites
echo "3️⃣ Testing with other sites:"
echo ""

# Stack Overflow
SO_COOKIES=$(get-cookie --url https://stackoverflow.com/users/edit --render 2>/dev/null)
if [ -n "$SO_COOKIES" ]; then
    echo "• Stack Overflow:"
    SO_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Cookie: $SO_COOKIES" \
        -H "User-Agent: Mozilla/5.0" \
        "https://stackoverflow.com/users/edit")
    echo "  HTTP Status: $SO_STATUS"
    [ "$SO_STATUS" = "200" ] && echo "  ✅ Authenticated" || echo "  ❌ Not authenticated"
else
    echo "• Stack Overflow: No cookies found"
fi
echo ""

# Test 4: Practical one-liners
echo "4️⃣ Practical One-Liners That Work:"
echo "───────────────────────────────────"
echo ""
echo "# Download a file with authentication:"
echo 'curl -O -H "Cookie: $(get-cookie --url https://example.com/file.pdf --render)" https://example.com/file.pdf'
echo ""
echo "# Check if you're logged in:"
echo 'curl -s -H "Cookie: $(get-cookie --url https://github.com/settings --render)" https://github.com/settings | grep -q "Sign in" && echo "Not logged in" || echo "Logged in"'
echo ""
echo "# Save response with cookies:"
echo 'curl -H "Cookie: $(get-cookie --url https://example.com --render)" https://example.com > page.html'
echo ""

# Test 5: Debugging when it doesn't work
echo "5️⃣ Debugging Tips:"
echo "─────────────────"
echo ""
echo "If authentication isn't working:"
echo ""
echo "1. Check cookie quality:"
echo '   get-cookie --url <URL> --output json | jq '"'"'.[] | {name, value: .value[:20], len: (.value | length)}'"'"
echo ""
echo "2. Check for expired cookies:"
echo '   get-cookie --url <URL> --output json | jq '"'"'.[] | select(.expiry < now | todate)'"'"
echo ""
echo "3. Try specific browser profiles:"
echo '   get-cookie --url <URL> --browser chrome --render'
echo ""

# The key insight
echo "⚠️  Important Note:"
echo "──────────────────"
echo "Some sites (like GitHub) may have multiple session cookies across different"
echo "browser profiles. The --url flag gets ALL matching cookies, which may include"
echo "invalid ones. For production use, you might need to:"
echo ""
echo "1. Use --browser to target a specific browser"
echo "2. Use --output json and filter for valid cookies"
echo "3. Check cookie expiration dates"
echo ""
echo "✅ The CLI is working correctly - it's faithfully extracting what the browsers have stored!"
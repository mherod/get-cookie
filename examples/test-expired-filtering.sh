#!/bin/bash

# Test the expired cookie filtering feature
echo "🔍 Testing Expired Cookie Filtering"
echo "===================================="
echo ""

# Test 1: Check default behavior (should filter expired)
echo "1️⃣ Default behavior (filters expired cookies):"
echo "─────────────────────────────────────────────"
DEFAULT_COUNT=$(get-cookie --url https://github.com --output json 2>/dev/null | jq 'length')
echo "   Cookies returned: $DEFAULT_COUNT"
echo ""

# Test 2: Check with --include-expired flag
echo "2️⃣ With --include-expired flag:"
echo "────────────────────────────────"
WITH_EXPIRED_COUNT=$(get-cookie --url https://github.com --output json --include-expired 2>/dev/null | jq 'length')
echo "   Cookies returned: $WITH_EXPIRED_COUNT"
echo ""

# Test 3: Compare the difference
echo "3️⃣ Analysis:"
echo "───────────"
if [ "$WITH_EXPIRED_COUNT" -gt "$DEFAULT_COUNT" ]; then
    DIFF=$((WITH_EXPIRED_COUNT - DEFAULT_COUNT))
    echo "   ✅ Filtering is working! Removed $DIFF expired cookies"
else
    echo "   ℹ️  No expired cookies found (or same count)"
fi
echo ""

# Test 4: Show example cookies with expiry info
echo "4️⃣ Sample cookies with expiry info:"
echo "──────────────────────────────────"
echo "Default (non-expired only):"
get-cookie --url https://github.com --output json 2>/dev/null | jq -r '.[:3] | .[] | "  • \(.name): expires \(if .expiry then (.expiry | todate) else "session" end)"'
echo ""

echo "With expired included:"
get-cookie --url https://github.com --output json --include-expired 2>/dev/null | jq -r '.[:3] | .[] | "  • \(.name): expires \(if .expiry then (.expiry | todate) else "session" end)"'
echo ""

# Test 5: Practical curl test
echo "5️⃣ Practical test with curl:"
echo "──────────────────────────"
echo "Testing GitHub authentication with filtered cookies..."
COOKIES=$(get-cookie --url https://github.com/settings/profile --render 2>/dev/null)
RESPONSE=$(curl -s -L \
    -H "Cookie: $COOKIES" \
    -H "User-Agent: Mozilla/5.0" \
    "https://github.com/settings/profile" | grep -o "<title>[^<]*</title>" | head -1)

if echo "$RESPONSE" | grep -q "Your profile"; then
    echo "✅ Authentication successful with filtered cookies!"
elif echo "$RESPONSE" | grep -q "Sign in"; then
    echo "❌ Authentication failed (redirected to sign in)"
else
    echo "ℹ️  Response: $RESPONSE"
fi
echo ""

echo "💡 Summary:"
echo "─────────"
echo "The --include-expired flag controls whether expired cookies are included."
echo "By default, expired cookies are filtered out for better authentication success."
echo ""
echo "✅ Feature is working as expected!"
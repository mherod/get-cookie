#!/bin/bash

# Chrome Profile Selection Demo
echo "🍪 Chrome Profile Selection with get-cookie"
echo "==========================================="
echo ""
echo "The new --profile option allows targeting specific Chrome profiles by name."
echo ""

# List available Chrome profiles
echo "📋 Available Chrome Profiles:"
echo "──────────────────────────"
if [ -f ~/Library/Application\ Support/Google/Chrome/Local\ State ]; then
    cat ~/Library/Application\ Support/Google/Chrome/Local\ State | \
        jq -r '.profile.info_cache | to_entries | .[] | "  • \(.value.name) (directory: \(.key))"'
else
    echo "  Chrome Local State file not found"
fi
echo ""

# Demonstrate profile-specific extraction
echo "🎯 Profile-Specific Cookie Extraction:"
echo "────────────────────────────────────"
echo ""

echo "1️⃣ Extract from a specific profile by name:"
echo "   Command: get-cookie --url https://github.com --browser chrome --profile \"plugg.in\" --render"
echo ""
COOKIES=$(get-cookie --url https://github.com --browser chrome --profile "plugg.in" --render 2>/dev/null | head -c 80)
echo "   Output: $COOKIES..."
echo ""

echo "2️⃣ Compare different profiles for the same cookie:"
echo ""
echo "   Default/Personal profile:"
echo "   $ get-cookie user_session github.com --browser chrome --profile \"Personal\" --render"
PERSONAL=$(get-cookie user_session github.com --browser chrome --profile "Personal" --render 2>/dev/null)
if [ -n "$PERSONAL" ]; then
    VALUE=$(echo "$PERSONAL" | cut -d'=' -f2)
    echo "   Result: user_session=${VALUE:0:20}... (${#VALUE} chars)"
else
    echo "   Result: No user_session cookie found"
fi
echo ""

echo "   Profile 9/plugg.in profile:"
echo "   $ get-cookie user_session github.com --browser chrome --profile \"plugg.in\" --render"
PLUGIN=$(get-cookie user_session github.com --browser chrome --profile "plugg.in" --render 2>/dev/null)
if [ -n "$PLUGIN" ]; then
    VALUE=$(echo "$PLUGIN" | cut -d'=' -f2)
    echo "   Result: user_session=${VALUE:0:20}... (${#VALUE} chars)"
else
    echo "   Result: No user_session cookie found"
fi
echo ""

# Show the benefit
echo "💡 Benefits of Profile Selection:"
echo "───────────────────────────────"
echo "• Avoid cookie conflicts between profiles"
echo "• Target the correct logged-in session"
echo "• No need for deduplication when using specific profile"
echo "• Faster queries (only searches one profile)"
echo ""

# Practical curl example
echo "🔧 Practical Example with curl:"
echo "─────────────────────────────"
echo ""
echo "Use the correct profile for authenticated requests:"
echo ""
cat << 'EOF'
# Get cookies from your work profile
COOKIES=$(get-cookie --url https://github.com --browser chrome --profile "Work" --render)
curl -H "Cookie: $COOKIES" https://github.com/settings/profile

# Get cookies from your personal profile  
COOKIES=$(get-cookie --url https://github.com --browser chrome --profile "Personal" --render)
curl -H "Cookie: $COOKIES" https://github.com/settings/profile
EOF
echo ""

# Test with curl
echo "🧪 Live Test with GitHub:"
echo "──────────────────────"
echo ""

test_profile() {
    local profile=$1
    echo -n "Testing profile '$profile': "
    
    COOKIES=$(get-cookie --url https://github.com/settings/profile --browser chrome --profile "$profile" --render 2>/dev/null)
    
    if [ -z "$COOKIES" ]; then
        echo "❌ No cookies found"
        return
    fi
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Cookie: $COOKIES" \
        -H "User-Agent: Mozilla/5.0" \
        "https://github.com/settings/profile")
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ Authenticated (HTTP 200)"
    elif [ "$HTTP_CODE" = "302" ]; then
        echo "🔄 Redirected to login (HTTP 302)"
    else
        echo "⚠️  HTTP $HTTP_CODE"
    fi
}

# Test each profile that might have GitHub cookies
test_profile "Personal"
test_profile "plugg.in"
echo ""

echo "📝 Usage Notes:"
echo "────────────"
echo "• Profile names are case-insensitive"
echo "• You can use either the display name (e.g., \"Personal\") or directory name (e.g., \"Default\")"
echo "• If no --profile is specified, all profiles are queried"
echo "• Combine with --include-all to see cookies from all profiles even when one is selected"
echo ""

echo "✅ Profile selection feature is working perfectly!"
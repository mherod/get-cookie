#!/bin/bash

# Ultimate get-cookie + curl integration using --url flag
echo "🚀 get-cookie + curl: The Perfect Integration"
echo "============================================="
echo ""
echo "The --url flag automatically gets all cookies for a specific URL!"
echo ""

# Example 1: Simple one-liner for any URL
echo "1️⃣ One-liner to curl any URL with cookies:"
echo "─────────────────────────────────────────"
echo 'curl -H "Cookie: $(get-cookie --url https://github.com/settings/profile --render)" https://github.com/settings/profile'
echo ""

# Example 2: Function for easy authenticated requests
authenticated_curl() {
    local url=$1
    shift  # Remove first argument, pass the rest to curl
    
    # Get cookies for this specific URL
    local cookies=$(get-cookie --url "$url" --render 2>/dev/null)
    
    if [ -n "$cookies" ]; then
        curl -H "Cookie: $cookies" "$@" "$url"
    else
        echo "No cookies found for $url" >&2
        curl "$@" "$url"
    fi
}

echo "2️⃣ Testing authenticated requests:"
echo "──────────────────────────────────"

# Test GitHub settings page
echo "• GitHub Settings:"
HTTP_CODE=$(authenticated_curl "https://github.com/settings/profile" -s -o /dev/null -w "%{http_code}")
if [ "$HTTP_CODE" = "200" ]; then
    echo "  ✅ Successfully accessed (HTTP 200)"
elif [ "$HTTP_CODE" = "302" ]; then
    echo "  ⚠️ Redirected to login (HTTP 302)"
else
    echo "  ❌ Failed (HTTP $HTTP_CODE)"
fi

# Test Stack Overflow profile
echo "• Stack Overflow Profile:"
HTTP_CODE=$(authenticated_curl "https://stackoverflow.com/users/edit/current" -s -o /dev/null -w "%{http_code}")
if [ "$HTTP_CODE" = "200" ]; then
    echo "  ✅ Successfully accessed (HTTP 200)"
elif [ "$HTTP_CODE" = "302" ] || [ "$HTTP_CODE" = "404" ]; then
    echo "  ⚠️ Not logged in or no profile (HTTP $HTTP_CODE)"
else
    echo "  ❌ Failed (HTTP $HTTP_CODE)"
fi

echo ""
echo "3️⃣ Practical Examples:"
echo "────────────────────"

# Download a file with authentication
echo "• Download authenticated content:"
echo '  curl -H "Cookie: $(get-cookie --url https://example.com/private/file.pdf --render)" \\'
echo '       -o file.pdf https://example.com/private/file.pdf'

# POST request with cookies
echo ""
echo "• POST with authentication:"
echo '  curl -X POST \\'
echo '       -H "Cookie: $(get-cookie --url https://api.example.com/endpoint --render)" \\'
echo '       -H "Content-Type: application/json" \\'
echo '       -d '"'"'{"key": "value"}'"'"' \\'
echo '       https://api.example.com/endpoint'

# Follow redirects with cookies
echo ""
echo "• Follow redirects while maintaining cookies:"
echo '  curl -L \\'
echo '       -H "Cookie: $(get-cookie --url https://example.com/dashboard --render)" \\'
echo '       https://example.com/dashboard'

echo ""
echo "4️⃣ Advanced Usage:"
echo "─────────────────"

# Show what cookies would be sent for different URLs
echo "• Preview cookies for different URLs:"
for url in "https://github.com/" "https://api.github.com/" "https://gist.github.com/"; do
    COOKIE_COUNT=$(get-cookie --url "$url" --output json 2>/dev/null | jq 'length // 0')
    echo "  $url → $COOKIE_COUNT cookies"
done

echo ""
echo "5️⃣ Shell Function for Your .bashrc/.zshrc:"
echo "──────────────────────────────────────────"
cat << 'EOF'
# Add to your shell config for easy authenticated requests
auth_curl() {
    local url=$1
    shift
    curl -H "Cookie: $(get-cookie --url "$url" --render 2>/dev/null)" "$@" "$url"
}

# Usage: auth_curl https://github.com/settings/profile -s | grep username
EOF

echo ""
echo "6️⃣ Comparison: Manual vs --url flag:"
echo "────────────────────────────────────"
echo "❌ Manual (need to know domain and cookie names):"
echo '  get-cookie user_session github.com --render'
echo ""
echo "✅ With --url (automatic):"
echo '  get-cookie --url https://github.com/settings/profile --render'
echo ""
echo "The --url flag automatically:"
echo "  • Extracts the domain from the URL"
echo "  • Gets ALL relevant cookies for that domain"
echo "  • Handles subdomains correctly"
echo "  • Returns cookies in the right format for curl"

echo ""
echo "7️⃣ Real Example - Download your GitHub avatar:"
echo "──────────────────────────────────────────────"
USERNAME=$(get-cookie dotcom_user github.com --render 2>/dev/null | cut -d'=' -f2 | cut -d';' -f1)
if [ -n "$USERNAME" ]; then
    echo "Downloading avatar for: $USERNAME"
    echo "Command:"
    echo "  curl -H \"Cookie: \$(get-cookie --url https://github.com/$USERNAME.png --render)\" \\"
    echo "       -o avatar.png https://github.com/$USERNAME.png"
else
    echo "Not logged into GitHub"
fi

echo ""
echo "✅ The --url flag makes cookie extraction automatic and foolproof!"
#!/bin/bash

# Quick Start Guide: Essential get-cookie Patterns
# ================================================
# This script demonstrates the most common and practical patterns
# for using get-cookie in your daily workflow.

echo "🚀 get-cookie Quick Start Guide"
echo "==============================="
echo ""

# Example 1: Basic cookie extraction
echo "1️⃣ Basic Cookie Extraction"
echo "──────────────────────────"
echo ""
echo "Get a single cookie value:"
echo '  get-cookie user_session github.com --render'
echo ""
USER_SESSION=$(get-cookie user_session github.com --render 2>/dev/null | head -1)
if [ -n "$USER_SESSION" ]; then
    echo "   ✅ Found: ${USER_SESSION:0:30}..."
else
    echo "   ℹ️  No user_session cookie found (example only)"
fi
echo ""

# Example 2: Get all cookies for a domain
echo "2️⃣ Get All Cookies for a Domain"
echo "───────────────────────────────"
echo ""
echo "Get all cookies (use % as wildcard):"
echo '  get-cookie % github.com --output json | jq length'
echo ""
COOKIE_COUNT=$(get-cookie % github.com --output json 2>/dev/null | jq 'length // 0')
echo "   Found $COOKIE_COUNT cookies for github.com"
echo ""

# Example 3: The Perfect One-Liner for curl
echo "3️⃣ One-Liner for curl (Most Common Pattern)"
echo "───────────────────────────────────────────"
echo ""
echo "The --url flag automatically gets all cookies for a URL:"
echo '  curl -H "Cookie: $(get-cookie --url <URL> --render)" <URL>'
echo ""
echo "Example:"
echo '  curl -H "Cookie: $(get-cookie --url https://github.com/settings/profile --render)" \'
echo '       https://github.com/settings/profile'
echo ""

# Example 4: Reusable Shell Function
echo "4️⃣ Reusable Shell Function (Add to .bashrc/.zshrc)"
echo "──────────────────────────────────────────────────"
echo ""
cat << 'EOF'
# Add this function to your shell config for easy authenticated requests
auth_curl() {
    local url=$1
    shift
    curl -H "Cookie: $(get-cookie --url "$url" --render 2>/dev/null)" "$@" "$url"
}

# Usage examples:
#   auth_curl https://github.com/settings/profile -s | grep username
#   auth_curl https://example.com/api/data -o data.json
EOF
echo ""

# Example 5: Quick Login Check
echo "5️⃣ Quick Login Status Check"
echo "───────────────────────────"
echo ""
echo "Check if you're logged into a site:"
echo '  get-cookie user_session github.com --render && echo "✅ Logged in" || echo "❌ Not logged in"'
echo ""
if get-cookie user_session github.com --render 2>/dev/null | grep -q "user_session="; then
    echo "   ✅ You appear to be logged into GitHub"
else
    echo "   ❌ Not logged into GitHub (or no cookies found)"
fi
echo ""

# Example 6: Save Cookies to File
echo "6️⃣ Save Cookies for Later Use"
echo "──────────────────────────────"
echo ""
echo "Backup all cookies to JSON:"
echo '  get-cookie % github.com --output json > github-cookies-backup.json'
echo ""
echo "Restore and use with curl:"
echo '  COOKIES=$(jq -r ".[] | \"\(.name)=\(.value)\"" github-cookies-backup.json | tr "\n" ";")'
echo '  curl -H "Cookie: $COOKIES" https://github.com'
echo ""

# Example 7: Common Output Formats
echo "7️⃣ Output Format Options"
echo "────────────────────────"
echo ""
echo "JSON (for scripting):"
echo '  get-cookie user_session github.com --output json'
echo ""
echo "Rendered (for curl headers):"
echo '  get-cookie user_session github.com --render'
echo ""
echo "Dump (human-readable debug):"
echo '  get-cookie user_session github.com --dump'
echo ""

echo "📚 Next Steps"
echo "───────────"
echo "• See curl-integration.sh for comprehensive curl patterns"
echo "• See github-auth.sh for GitHub-specific authentication"
echo "• See features-demo.sh for advanced CLI features"
echo ""
echo "✅ Quick start complete!"


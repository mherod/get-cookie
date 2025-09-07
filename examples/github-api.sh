#!/bin/bash

# Real-world example: Using get-cookie to access GitHub's authenticated endpoints
# This demonstrates how browser cookies can be used for API automation

echo "🔐 GitHub API Authentication with get-cookie"
echo "============================================"

# Get all relevant GitHub cookies using --render
echo -e "\nExtracting GitHub cookies..."
COOKIES=$(get-cookie % github.com --render 2>/dev/null | grep -E "(user_session|dotcom_user|__Host)" | paste -sd '; ')

if [ -z "$COOKIES" ]; then
    echo "❌ No GitHub cookies found. Please log into GitHub in your browser."
    exit 1
fi

echo "✅ Found GitHub cookies"
echo "   Cookie count: $(echo "$COOKIES" | grep -o ';' | wc -l | xargs expr 1 +)"

# Test authentication with various GitHub endpoints
echo -e "\n📊 Testing GitHub API endpoints:\n"

# 1. User profile (public API, but returns more data when authenticated)
echo "1. Fetching user profile..."
USER_DATA=$(curl -s -H "Cookie: $COOKIES" https://api.github.com/user)
LOGIN=$(echo "$USER_DATA" | jq -r '.login // empty')
if [ -n "$LOGIN" ]; then
    echo "   ✅ Authenticated as: @$LOGIN"
    echo "   • Name: $(echo "$USER_DATA" | jq -r '.name // "N/A"')"
    echo "   • Public repos: $(echo "$USER_DATA" | jq -r '.public_repos // 0')"
    echo "   • Followers: $(echo "$USER_DATA" | jq -r '.followers // 0')"
else
    echo "   ⚠️ API authentication failed (cookies may not work for API)"
fi

# 2. Check notifications (requires authentication)
echo -e "\n2. Checking notifications..."
NOTIFICATIONS=$(curl -s -H "Cookie: $COOKIES" \
    -H "Accept: application/vnd.github.v3+json" \
    "https://api.github.com/notifications" | jq '. | length')
if [ "$NOTIFICATIONS" != "null" ]; then
    echo "   📬 Unread notifications: $NOTIFICATIONS"
else
    echo "   ⚠️ Could not fetch notifications"
fi

# 3. List private repos (if any)
echo -e "\n3. Checking private repositories..."
PRIVATE_REPOS=$(curl -s -H "Cookie: $COOKIES" \
    "https://api.github.com/user/repos?type=private" | jq '. | length')
if [ "$PRIVATE_REPOS" != "null" ] && [ "$PRIVATE_REPOS" != "0" ]; then
    echo "   🔒 Private repositories: $PRIVATE_REPOS"
else
    echo "   ℹ️ No private repositories accessible"
fi

# 4. Recent activity
echo -e "\n4. Fetching recent activity..."
EVENTS=$(curl -s -H "Cookie: $COOKIES" \
    "https://api.github.com/users/$LOGIN/events?per_page=5" | jq -r '.[] | "\(.type) in \(.repo.name)"' 2>/dev/null | head -5)
if [ -n "$EVENTS" ]; then
    echo "   Recent activity:"
    echo "$EVENTS" | while read event; do
        echo "   • $event"
    done
else
    echo "   ⚠️ Could not fetch activity"
fi

# Practical example: Create a gist
echo -e "\n💡 Example: Creating a gist with authentication"
echo "──────────────────────────────────────────────"
cat << 'EOF'
curl -X POST \
  -H "Cookie: $(get-cookie % github.com --render | grep -E 'user_session|__Host' | paste -sd '; ')" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Created via get-cookie + curl",
    "public": false,
    "files": {
      "test.md": {
        "content": "# Hello from get-cookie!\nThis gist was created using browser cookies."
      }
    }
  }' \
  https://api.github.com/gists
EOF

echo -e "\n🔍 Debugging tip:"
echo "──────────────────"
echo "If authentication fails, GitHub cookies might not work with the API."
echo "GitHub's API primarily uses OAuth tokens, not browser session cookies."
echo ""
echo "To see what cookies you have:"
echo "  get-cookie % github.com --dump"
echo ""
echo "To get just the cookie values:"
echo "  get-cookie user_session github.com --render"
echo ""
echo "✅ Script complete!"
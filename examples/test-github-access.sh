#!/bin/bash

# Test what GitHub content we can actually access with browser cookies
echo "🔐 Testing GitHub Private Access with Browser Cookies"
echo "====================================================="
echo ""

# Get all GitHub cookies
COOKIES=$(get-cookie --url https://github.com --render 2>/dev/null)

if [ -z "$COOKIES" ]; then
    echo "❌ No GitHub cookies found. Please log into GitHub in your browser."
    exit 1
fi

echo "✅ Found GitHub cookies ($(echo "$COOKIES" | grep -o ';' | wc -l | xargs expr 1 +) cookies)"
echo ""

# Extract username from cookies
USERNAME=$(get-cookie dotcom_user github.com --render 2>/dev/null | cut -d'=' -f2 | cut -d';' -f1)
if [ -n "$USERNAME" ]; then
    echo "👤 Detected GitHub username: $USERNAME"
else
    echo "⚠️  Could not detect username from cookies"
    USERNAME="mherod"  # fallback for testing
fi

echo ""
echo "Testing various GitHub endpoints..."
echo "────────────────────────────────────"

# Function to test GitHub endpoints
test_endpoint() {
    local name=$1
    local url=$2
    local check_string=$3
    
    echo -n "• $name: "
    
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

# Test public profile (should work either way)
test_endpoint "Public profile" \
    "https://github.com/$USERNAME" \
    "Follow"

# Test settings page (requires authentication)
test_endpoint "Settings page" \
    "https://github.com/settings/profile" \
    "Public profile"

# Test notifications (requires authentication)
test_endpoint "Notifications" \
    "https://github.com/notifications" \
    "notifications"

# Test security settings (requires authentication)
test_endpoint "Security settings" \
    "https://github.com/settings/security" \
    "Two-factor"

# Test SSH keys page (requires authentication)
test_endpoint "SSH keys" \
    "https://github.com/settings/keys" \
    "SSH keys"

echo ""
echo "Testing repository access..."
echo "────────────────────────────"

# Test accessing this repository (get-cookie)
echo -n "• get-cookie repo: "
REPO_RESPONSE=$(curl -s -L \
    -H "Cookie: $COOKIES" \
    -H "User-Agent: Mozilla/5.0" \
    "https://github.com/$USERNAME/get-cookie")

if echo "$REPO_RESPONSE" | grep -q "Code" > /dev/null 2>&1; then
    echo "✅ Can access"
    
    # Check if we can see the clone button (indicates authenticated access)
    if echo "$REPO_RESPONSE" | grep -q "Use Git or checkout with SVN" > /dev/null 2>&1; then
        echo "  └─ ✅ Authenticated view (can see clone options)"
    fi
else
    echo "❌ Cannot access"
fi

# Test creating a new repository page (requires authentication)
echo -n "• New repo page: "
NEW_REPO_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Cookie: $COOKIES" \
    -H "User-Agent: Mozilla/5.0" \
    "https://github.com/new")

if [ "$NEW_REPO_CODE" = "200" ]; then
    echo "✅ Can access (authenticated)"
else
    echo "❌ Cannot access (HTTP $NEW_REPO_CODE)"
fi

echo ""
echo "Testing private repository detection..."
echo "───────────────────────────────────────"

# Try to list repositories including private ones
echo "Attempting to fetch repository list..."

REPOS_PAGE=$(curl -s -L \
    -H "Cookie: $COOKIES" \
    -H "User-Agent: Mozilla/5.0" \
    "https://github.com/$USERNAME?tab=repositories")

# Count repositories visible
PUBLIC_COUNT=$(echo "$REPOS_PAGE" | grep -o 'itemprop="name codeRepository"' | wc -l | xargs)
echo "• Repositories visible: $PUBLIC_COUNT"

# Check if we can see private repo indicators
if echo "$REPOS_PAGE" | grep -q "Private" > /dev/null 2>&1; then
    echo "• ✅ Can see private repository badges"
    PRIVATE_COUNT=$(echo "$REPOS_PAGE" | grep -o '>Private<' | wc -l | xargs)
    echo "• Private repositories visible: $PRIVATE_COUNT"
else
    echo "• ⚠️  No private repository badges found (may not have any or not authenticated)"
fi

echo ""
echo "Testing specific private repository (if you have one)..."
echo "────────────────────────────────────────────────────────"

# Function to test a specific private repo
test_private_repo() {
    local repo_name=$1
    echo -n "• Testing $USERNAME/$repo_name: "
    
    REPO_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Cookie: $COOKIES" \
        -H "User-Agent: Mozilla/5.0" \
        "https://github.com/$USERNAME/$repo_name")
    
    if [ "$REPO_CODE" = "200" ]; then
        echo "✅ Accessible (HTTP 200)"
        
        # Try to get file list
        FILE_LIST=$(curl -s \
            -H "Cookie: $COOKIES" \
            -H "User-Agent: Mozilla/5.0" \
            "https://github.com/$USERNAME/$repo_name" | grep -o 'js-navigation-open Link--primary' | wc -l | xargs)
        
        if [ "$FILE_LIST" -gt 0 ]; then
            echo "  └─ ✅ Can see $FILE_LIST files/folders"
        fi
        return 0
    elif [ "$REPO_CODE" = "404" ]; then
        echo "❌ Not found or no access (HTTP 404)"
        return 1
    else
        echo "❌ Cannot access (HTTP $REPO_CODE)"
        return 1
    fi
}

# Test some common private repo names (you can modify these)
echo "Testing potential private repositories..."
for repo in "private" "personal" "dotfiles" "config" "secrets" "private-notes"; do
    test_private_repo "$repo"
done

echo ""
echo "Testing raw file access..."
echo "─────────────────────"

# Try to access a raw file from a public repo (should work)
echo -n "• Public repo raw file: "
RAW_PUBLIC=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Cookie: $COOKIES" \
    -H "User-Agent: Mozilla/5.0" \
    "https://raw.githubusercontent.com/$USERNAME/get-cookie/main/README.md")

if [ "$RAW_PUBLIC" = "200" ]; then
    echo "✅ Can access"
else
    echo "❌ Cannot access (HTTP $RAW_PUBLIC)"
fi

echo ""
echo "Advanced: Testing GitHub's auth state..."
echo "────────────────────────────────────────"

# Check the actual auth state from GitHub's perspective
AUTH_CHECK=$(curl -s \
    -H "Cookie: $COOKIES" \
    -H "User-Agent: Mozilla/5.0" \
    -H "Accept: application/json" \
    "https://github.com/users/$USERNAME/hovercard" | jq -r '.message // "authenticated"')

if [ "$AUTH_CHECK" = "authenticated" ]; then
    echo "✅ GitHub recognizes our session as authenticated"
else
    echo "⚠️  GitHub response: $AUTH_CHECK"
fi

echo ""
echo "Summary"
echo "======="
echo ""
echo "📝 What we learned:"
echo "• Browser cookies work for GitHub web pages (not API)"
echo "• Can access authenticated pages like settings"
echo "• Can view private repositories through the web interface"
echo "• Cannot use these cookies for the REST API (needs tokens)"
echo ""
echo "💡 To actually work with private repos via CLI:"
echo "• Use GitHub CLI: gh auth login"
echo "• Or create a Personal Access Token"
echo "• Browser cookies are mainly useful for web scraping"
echo ""
echo "✅ Test complete!"
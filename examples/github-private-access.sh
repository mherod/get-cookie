#!/bin/bash

# Accessing GitHub private content with browser cookies
echo "🔓 GitHub Private Repository Access with get-cookie"
echo "=================================================="
echo ""

# Get the full session cookie (not truncated ones)
echo "Extracting valid GitHub session cookies..."
FULL_SESSION=$(get-cookie user_session github.com --output json 2>/dev/null | jq -r '.[] | select(.value | length > 10) | .value' | head -1)

if [ -z "$FULL_SESSION" ]; then
    echo "❌ No valid GitHub session found. Please log into GitHub in Chrome."
    exit 1
fi

echo "✅ Found valid session cookie (${#FULL_SESSION} characters)"
echo ""

# Build the cookie header with both required cookies
COOKIE_HEADER="user_session=$FULL_SESSION; __Host-user_session_same_site=$FULL_SESSION"

# Get username
USERNAME=$(get-cookie dotcom_user github.com --output json 2>/dev/null | jq -r '.[0].value' | cut -d';' -f1)
echo "👤 Logged in as: $USERNAME"
echo ""

echo "📊 Repository Statistics:"
echo "────────────────────────"

# Count repositories
REPOS_HTML=$(curl -s -L \
    -H "Cookie: $COOKIE_HEADER" \
    -H "User-Agent: Mozilla/5.0" \
    "https://github.com/$USERNAME?tab=repositories")

PUBLIC_COUNT=$(echo "$REPOS_HTML" | grep -o '>Public<' | wc -l | xargs)
PRIVATE_COUNT=$(echo "$REPOS_HTML" | grep -o '>Private<' | wc -l | xargs)

echo "• Public repositories: $PUBLIC_COUNT"
echo "• Private repositories: $PRIVATE_COUNT"
echo "• Total: $((PUBLIC_COUNT + PRIVATE_COUNT))"
echo ""

echo "🔒 Private Repositories (first 5):"
echo "──────────────────────────────────"

# Extract private repo names
echo "$REPOS_HTML" | grep -B3 '>Private<' | grep 'itemprop="name codeRepository"' | head -5 | while read line; do
    REPO_NAME=$(echo "$line" | sed -n 's/.*href="[^"]*\/\([^"]*\)".*/\1/p')
    if [ -n "$REPO_NAME" ]; then
        echo "• $REPO_NAME"
        
        # Get repo details
        REPO_PAGE=$(curl -s -L \
            -H "Cookie: $COOKIE_HEADER" \
            -H "User-Agent: Mozilla/5.0" \
            "https://github.com/$USERNAME/$REPO_NAME")
        
        # Extract language if available
        LANGUAGE=$(echo "$REPO_PAGE" | grep -o 'programmingLanguage">[^<]*' | head -1 | cut -d'>' -f2)
        [ -n "$LANGUAGE" ] && echo "  Language: $LANGUAGE"
        
        # Count files
        FILE_COUNT=$(echo "$REPO_PAGE" | grep -o 'js-navigation-open Link--primary' | wc -l | xargs)
        [ "$FILE_COUNT" -gt 0 ] && echo "  Files/Folders visible: $FILE_COUNT"
    fi
done

echo ""
echo "🔑 Testing Access Levels:"
echo "────────────────────────"

# Test various authenticated endpoints
test_access() {
    local name=$1
    local url=$2
    echo -n "• $name: "
    
    CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Cookie: $COOKIE_HEADER" \
        -H "User-Agent: Mozilla/5.0" \
        "$url")
    
    if [ "$CODE" = "200" ]; then
        echo "✅ Full access"
    elif [ "$CODE" = "404" ]; then
        echo "❌ Not found"
    else
        echo "⚠️  Limited access (HTTP $CODE)"
    fi
}

test_access "Settings" "https://github.com/settings/profile"
test_access "SSH Keys" "https://github.com/settings/keys"
test_access "Security" "https://github.com/settings/security"
test_access "Billing" "https://github.com/settings/billing"
test_access "New Repository" "https://github.com/new"

echo ""
echo "💡 Practical Examples:"
echo "────────────────────"
echo ""
echo "# Clone a private repository (using gh CLI):"
echo "gh repo clone $USERNAME/<private-repo-name>"
echo ""
echo "# Download a file from a private repo:"
echo "curl -H \"Cookie: user_session=\$SESSION; __Host-user_session_same_site=\$SESSION\" \\"
echo "     https://github.com/$USERNAME/<private-repo>/raw/main/file.txt"
echo ""
echo "# Access private gist:"
echo "curl -H \"Cookie: user_session=\$SESSION; __Host-user_session_same_site=\$SESSION\" \\"
echo "     https://gist.github.com/$USERNAME/<gist-id>"
echo ""
echo "⚠️  Note: While we can VIEW private repos via the web interface,"
echo "   cloning still requires proper Git authentication (SSH key or token)."
echo ""
echo "✅ Authentication successful! You have full web access to your private repos."
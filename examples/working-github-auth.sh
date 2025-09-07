#!/bin/bash

# Working GitHub authentication with get-cookie
# This shows how to handle real-world cookie issues

echo "🔐 Working GitHub Authentication with get-cookie"
echo "==============================================="
echo ""

# Method 1: Using --url and --render with validation
echo "Method 1: Smart cookie filtering"
echo "────────────────────────────────"

# Get cookies and filter out invalid ones (too short)
COOKIES=$(node dist/cli.cjs --url https://github.com/settings/profile --output json 2>/dev/null | \
    jq -r '.[] | select(.name == "user_session" and (.value | length) > 10) | "\(.name)=\(.value)"' | \
    head -1)

if [ -n "$COOKIES" ]; then
    echo "✅ Found valid session cookie"
    
    # Add the same-site cookie
    COOKIES="$COOKIES; __Host-user_session_same_site=${COOKIES#*=}"
    
    echo "Testing authentication..."
    TITLE=$(curl -s -L \
        -H "Cookie: $COOKIES" \
        -H "User-Agent: Mozilla/5.0" \
        "https://github.com/settings/profile" | \
        grep -o "<title>[^<]*</title>" | head -1)
    
    if echo "$TITLE" | grep -q "Your profile"; then
        echo "✅ Successfully authenticated!"
    else
        echo "❌ Not authenticated: $TITLE"
    fi
else
    echo "❌ No valid session cookies found"
fi

echo ""
echo "Method 2: Direct approach with validation"
echo "─────────────────────────────────────────"

# Function to get valid cookies only
get_valid_cookie() {
    local cookie_name=$1
    local domain=$2
    local min_length=${3:-10}  # Minimum valid length
    
    node dist/cli.cjs "$cookie_name" "$domain" --output json 2>/dev/null | \
        jq -r --arg min "$min_length" \
        '.[] | select(.value | length > ($min | tonumber)) | .value' | \
        head -1
}

# Get a valid session
VALID_SESSION=$(get_valid_cookie "user_session" "github.com" 20)

if [ -n "$VALID_SESSION" ]; then
    echo "✅ Found valid session: ${VALID_SESSION:0:20}... (truncated)"
    
    # Test with curl
    curl -s -I \
        -H "Cookie: user_session=$VALID_SESSION; __Host-user_session_same_site=$VALID_SESSION" \
        -H "User-Agent: Mozilla/5.0" \
        "https://github.com/settings/profile" | head -1
else
    echo "❌ No valid session found"
fi

echo ""
echo "Method 3: The Ultimate One-Liner"
echo "────────────────────────────────"
echo ""
echo "# Get valid cookies and access private content:"
echo 'curl -H "Cookie: $(get-cookie --url https://github.com --output json | jq -r '"'"'.[] | select(.name == "user_session" and (.value | length) > 20) | "\(.name)=\(.value)"'"'"' | head -1)" https://github.com/settings/profile'
echo ""

echo "💡 Key Insights:"
echo "──────────────"
echo "• Some browsers store truncated/invalid cookies"
echo "• Filter cookies by value length for validity"  
echo "• GitHub needs both user_session and __Host-user_session_same_site"
echo "• The new --include-expired flag helps debug cookie issues"
echo ""
echo "✅ With proper filtering, get-cookie works perfectly for authentication!"
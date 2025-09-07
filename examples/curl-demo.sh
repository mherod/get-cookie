#!/bin/bash

# Simple demonstration of get-cookie + curl integration
echo "🍪 get-cookie + curl Integration Demo"
echo "======================================"

# First, let's verify we have cookies
echo -e "\n1️⃣ Checking available cookies..."
COOKIE_COUNT=$(node dist/cli.cjs % github.com --output json 2>/dev/null | jq 'length')
echo "   Found $COOKIE_COUNT GitHub cookies"

# Extract a specific cookie value
echo -e "\n2️⃣ Extracting user_session cookie..."
USER_SESSION=$(node dist/cli.cjs user_session github.com --output json 2>/dev/null | jq -r '.[0].value' 2>/dev/null)

if [ -n "$USER_SESSION" ] && [ "$USER_SESSION" != "null" ]; then
    echo "   ✅ Got user_session cookie"
    echo "   Value: ${USER_SESSION:0:20}... (truncated for security)"
    
    # Use the cookie with curl
    echo -e "\n3️⃣ Making authenticated GitHub API request..."
    RESPONSE=$(curl -s \
        -H "Cookie: user_session=$USER_SESSION" \
        -H "User-Agent: get-cookie-demo" \
        "https://api.github.com/user")
    
    # Check if we got user data
    LOGIN=$(echo "$RESPONSE" | jq -r '.login' 2>/dev/null)
    if [ -n "$LOGIN" ] && [ "$LOGIN" != "null" ]; then
        echo "   ✅ Authenticated as: @$LOGIN"
        
        # Get more user info
        NAME=$(echo "$RESPONSE" | jq -r '.name' 2>/dev/null)
        COMPANY=$(echo "$RESPONSE" | jq -r '.company' 2>/dev/null)
        PUBLIC_REPOS=$(echo "$RESPONSE" | jq -r '.public_repos' 2>/dev/null)
        
        echo "   Name: $NAME"
        [ "$COMPANY" != "null" ] && echo "   Company: $COMPANY"
        echo "   Public repos: $PUBLIC_REPOS"
    else
        echo "   ⚠️ API did not return user data (cookie might not work for API)"
    fi
else
    echo "   ❌ No user_session cookie found"
fi

# Example with multiple cookies
echo -e "\n4️⃣ Building multi-cookie header..."
COOKIES=""

# Extract multiple cookies and combine them
for cookie_name in "user_session" "dotcom_user" "__Host-user_session_same_site"; do
    COOKIE_VALUE=$(node dist/cli.cjs "$cookie_name" github.com --output json 2>/dev/null | jq -r '.[0].value' 2>/dev/null)
    if [ -n "$COOKIE_VALUE" ] && [ "$COOKIE_VALUE" != "null" ]; then
        [ -n "$COOKIES" ] && COOKIES="$COOKIES; "
        COOKIES="$COOKIES$cookie_name=$COOKIE_VALUE"
        echo "   ✅ Added $cookie_name"
    fi
done

if [ -n "$COOKIES" ]; then
    echo -e "\n5️⃣ Testing page access with cookies..."
    # Test accessing a protected page
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Cookie: $COOKIES" \
        -H "User-Agent: Mozilla/5.0" \
        "https://github.com/settings/profile")
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo "   ✅ Successfully accessed settings page (HTTP 200)"
    elif [ "$HTTP_CODE" = "302" ] || [ "$HTTP_CODE" = "301" ]; then
        echo "   ⚠️ Redirected (HTTP $HTTP_CODE) - might need more cookies"
    else
        echo "   ❌ Access failed (HTTP $HTTP_CODE)"
    fi
fi

# Practical example: Download with authentication
echo -e "\n6️⃣ Example: Downloading with authentication..."
echo "   Command to download your GitHub avatar:"
if [ -n "$LOGIN" ]; then
    echo "   curl -H \"Cookie: user_session=\$COOKIE\" -o avatar.png https://github.com/$LOGIN.png"
else
    echo "   curl -H \"Cookie: user_session=\$COOKIE\" -o avatar.png https://github.com/USERNAME.png"
fi

# One-liner examples
echo -e "\n📝 Useful one-liners:"
echo "────────────────────"
echo "# Get cookie value only:"
echo "node dist/cli.cjs user_session github.com --output json | jq -r '.[0].value'"
echo ""
echo "# Direct pipe to curl:"
echo "curl -H \"Cookie: user_session=\$(node dist/cli.cjs user_session github.com --output json | jq -r '.[0].value')\" https://api.github.com/user"
echo ""
echo "# Save all cookies to file:"
echo "node dist/cli.cjs % github.com --output json > github-cookies.json"
echo ""
echo "# Use with HTTPie instead of curl:"
echo "http https://api.github.com/user \"Cookie:user_session=\$(node dist/cli.cjs user_session github.com --output json | jq -r '.[0].value')\""

echo -e "\n✅ Demo complete!"
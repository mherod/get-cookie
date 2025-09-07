#!/bin/bash

# Simple and practical get-cookie + curl integration using --render
echo "🍪 get-cookie + curl Integration (using --render)"
echo "=================================================="

# The --render flag outputs cookies in the perfect format for curl: name=value

# Example 1: Single cookie with curl
echo -e "\n1️⃣ Getting GitHub user session cookie..."
USER_SESSION=$(get-cookie user_session github.com --render 2>/dev/null)

if [ -n "$USER_SESSION" ]; then
    echo "   ✅ Got cookie: ${USER_SESSION:0:30}..."
    
    # Use directly with curl
    echo -e "\n2️⃣ Using cookie with GitHub API..."
    curl -s \
        -H "Cookie: $USER_SESSION" \
        -H "User-Agent: get-cookie-demo" \
        "https://api.github.com/user" | jq -r '.login' | while read LOGIN; do
        if [ -n "$LOGIN" ] && [ "$LOGIN" != "null" ]; then
            echo "   ✅ Authenticated as: @$LOGIN"
        else
            echo "   ⚠️ Cookie didn't work for API (may need different cookie)"
        fi
    done
else
    echo "   ❌ No user_session cookie found"
fi

# Example 2: Multiple cookies (semicolon separated)
echo -e "\n3️⃣ Getting multiple GitHub cookies..."
COOKIES=""
for cookie_name in "user_session" "dotcom_user" "__Host-user_session_same_site" "_gh_sess"; do
    COOKIE=$(get-cookie "$cookie_name" github.com --render 2>/dev/null | head -1)
    if [ -n "$COOKIE" ]; then
        [ -n "$COOKIES" ] && COOKIES="$COOKIES; "
        COOKIES="$COOKIES$COOKIE"
        echo "   ✅ Added: ${cookie_name}"
    fi
done

if [ -n "$COOKIES" ]; then
    echo -e "\n4️⃣ Testing authenticated page access..."
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Cookie: $COOKIES" \
        -H "User-Agent: Mozilla/5.0" \
        "https://github.com/settings/profile")
    
    echo "   HTTP Response: $HTTP_CODE"
    [ "$HTTP_CODE" = "200" ] && echo "   ✅ Successfully accessed protected page!"
fi

# Example 3: Direct one-liner for API calls
echo -e "\n5️⃣ One-liner examples:"
echo "────────────────────"
echo ""
echo "# Get user info with single command:"
echo 'curl -s -H "Cookie: $(get-cookie user_session github.com --render)" https://api.github.com/user | jq .login'
echo ""

echo "# Download file with authentication:"
echo 'curl -H "Cookie: $(get-cookie user_session github.com --render)" -o file.zip https://github.com/user/repo/archive/main.zip'
echo ""

echo "# Using with wget:"
echo 'wget --header="Cookie: $(get-cookie user_session github.com --render)" https://github.com/user/private-repo'
echo ""

echo "# Using with HTTPie:"
echo 'http https://api.github.com/user "Cookie:$(get-cookie user_session github.com --render)"'

# Example 4: Practical use case - checking star count
echo -e "\n6️⃣ Practical example: Check if you've starred a repo..."
COOKIE=$(get-cookie user_session github.com --render 2>/dev/null | head -1)
if [ -n "$COOKIE" ]; then
    STARRED=$(curl -s -H "Cookie: $COOKIE" \
        -H "User-Agent: get-cookie-demo" \
        "https://api.github.com/user/starred/mherod/get-cookie" \
        -w "%{http_code}" -o /dev/null)
    
    if [ "$STARRED" = "204" ]; then
        echo "   ⭐ You've starred mherod/get-cookie!"
    elif [ "$STARRED" = "404" ]; then
        echo "   ☆ You haven't starred mherod/get-cookie yet"
    else
        echo "   ⚠️ Couldn't check star status (HTTP $STARRED)"
    fi
fi

echo -e "\n✅ Demo complete!"
echo ""
echo "💡 TIP: The --render flag outputs cookies in 'name=value' format,"
echo "        perfect for direct use with curl's Cookie header!"
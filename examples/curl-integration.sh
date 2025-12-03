#!/bin/bash

# ============================================================================
# get-cookie + curl Integration Guide
# ============================================================================
# Comprehensive guide for using get-cookie with curl for authenticated
# HTTP requests. This covers all common patterns from basic to advanced.
# ============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🍪 get-cookie + curl Integration Guide${NC}"
echo "================================================"
echo ""

# ============================================================================
# Example 1: Basic Single Cookie with curl
# ============================================================================
echo -e "${YELLOW}1️⃣ Basic Single Cookie Extraction${NC}"
echo "─────────────────────────────────────"

echo -e "${GREEN}Extracting GitHub session cookie...${NC}"
USER_SESSION=$(get-cookie user_session github.com --render 2>/dev/null | head -1)

if [ -n "$USER_SESSION" ]; then
    echo -e "${GREEN}✓ Found GitHub session cookie${NC}"
    echo "  Value: ${USER_SESSION:0:30}... (truncated for security)"

    # Test with curl
    echo -e "\n${GREEN}Testing with GitHub API...${NC}"
    RESPONSE=$(curl -s \
        -H "Cookie: $USER_SESSION" \
        -H "User-Agent: get-cookie-demo" \
        "https://api.github.com/user")

    LOGIN=$(echo "$RESPONSE" | jq -r '.login // empty' 2>/dev/null)
    if [ -n "$LOGIN" ]; then
        echo -e "${GREEN}✓ Authenticated as: @$LOGIN${NC}"
    else
        echo -e "${YELLOW}⚠ API may not accept browser cookies (use tokens for API)${NC}"
    fi
else
    echo -e "${RED}✗ No GitHub session cookie found${NC}"
    echo "  Make sure you're logged into GitHub in your browser"
fi
echo ""

# ============================================================================
# Example 2: The Perfect Pattern - Using --url flag
# ============================================================================
echo -e "${YELLOW}2️⃣ The Perfect Pattern: --url flag${NC}"
echo "─────────────────────────────────────────────"

echo -e "${GREEN}The --url flag automatically gets all cookies for a URL:${NC}"
echo ""
echo -e "${BLUE}curl -H \"Cookie: \$(get-cookie --url <URL> --render)\" <URL>${NC}"
echo ""

# Reusable function for authenticated requests
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

echo -e "${GREEN}Reusable function for authenticated requests:${NC}"
cat << 'EOF'
authenticated_curl() {
    local url=$1
    shift
    curl -H "Cookie: $(get-cookie --url "$url" --render 2>/dev/null)" "$@" "$url"
}

# Usage:
#   authenticated_curl https://github.com/settings/profile -s | grep username
#   authenticated_curl https://example.com/file.pdf -o file.pdf
EOF
echo ""

# Test the function
echo -e "${GREEN}Testing authenticated_curl function:${NC}"
HTTP_CODE=$(authenticated_curl "https://github.com/settings/profile" -s -o /dev/null -w "%{http_code}" 2>/dev/null)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Successfully accessed protected page (HTTP 200)${NC}"
elif [ "$HTTP_CODE" = "302" ]; then
    echo -e "${YELLOW}⚠ Redirected to login (HTTP 302)${NC}"
else
    echo -e "${BLUE}ℹ HTTP $HTTP_CODE${NC}"
fi
echo ""

# ============================================================================
# Example 3: Multiple Cookies for Complex Authentication
# ============================================================================
echo -e "${YELLOW}3️⃣ Multiple Cookie Authentication${NC}"
echo "───────────────────────────────────────"

echo -e "${GREEN}Extracting all GitHub cookies...${NC}"
COOKIES_JSON=$(get-cookie % github.com --output json 2>/dev/null)

if [ -n "$COOKIES_JSON" ]; then
    COOKIE_COUNT=$(echo "$COOKIES_JSON" | jq 'length')
    echo -e "${GREEN}✓ Found $COOKIE_COUNT GitHub cookies${NC}"

    # Build cookie header with multiple cookies
    COOKIE_HEADER=$(echo "$COOKIES_JSON" | jq -r '.[] | "\(.name)=\(.value)"' | paste -sd '; ')

    if [ -n "$COOKIE_HEADER" ]; then
        echo -e "\n${GREEN}Testing with multiple cookies...${NC}"
        STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
                      -H "Cookie: $COOKIE_HEADER" \
                      -H "User-Agent: get-cookie-demo" \
                      "https://github.com/settings/profile")

        if [ "$STATUS" = "200" ]; then
            echo -e "${GREEN}✓ Successfully accessed protected page (HTTP $STATUS)${NC}"
        else
            echo -e "${RED}✗ Access denied (HTTP $STATUS)${NC}"
        fi
    fi
else
    echo -e "${RED}✗ Failed to extract cookies${NC}"
fi
echo ""

# ============================================================================
# Example 4: Download Protected Content
# ============================================================================
echo -e "${YELLOW}4️⃣ Download Protected Content${NC}"
echo "───────────────────────────────────"

echo -e "${GREEN}Example: Download a file that requires authentication${NC}"
echo ""
echo -e "${BLUE}curl -H \"Cookie: \$(get-cookie --url <URL> --render)\" \\"
echo "     -H \"User-Agent: YourApp\" \\"
echo "     -o file.pdf \\"
echo "     https://example.com/protected/file.pdf${NC}"
echo ""

# ============================================================================
# Example 5: POST Request with Authentication
# ============================================================================
echo -e "${YELLOW}5️⃣ POST Request with Authentication${NC}"
echo "─────────────────────────────────────────"

echo -e "${GREEN}Example: Creating a GitHub gist with authentication${NC}"
echo ""
cat << 'EOF'
curl -X POST \
  -H "Cookie: $(get-cookie --url https://api.github.com/gists --render)" \
  -H "Content-Type: application/json" \
  -H "User-Agent: get-cookie-demo" \
  -d '{
    "description": "Created via get-cookie + curl",
    "public": false,
    "files": {
      "test.md": {
        "content": "# Hello from get-cookie!"
      }
    }
  }' \
  https://api.github.com/gists
EOF
echo ""

# ============================================================================
# Example 6: Cookie Validation Function
# ============================================================================
echo -e "${YELLOW}6️⃣ Cookie Validation${NC}"
echo "───────────────────────"

validate_cookie() {
    local domain=$1
    local cookie_name=$2

    echo -e "${GREEN}Validating $cookie_name for $domain...${NC}"

    # Get cookie with metadata
    COOKIE_JSON=$(get-cookie "$cookie_name" "$domain" --output json 2>/dev/null)

    if [ -n "$COOKIE_JSON" ] && [ "$COOKIE_JSON" != "[]" ]; then
        # Parse cookie details
        EXPIRY=$(echo "$COOKIE_JSON" | jq -r '.[0].expiry' 2>/dev/null)
        BROWSER=$(echo "$COOKIE_JSON" | jq -r '.[0].meta.browser' 2>/dev/null)
        DECRYPTED=$(echo "$COOKIE_JSON" | jq -r '.[0].meta.decrypted' 2>/dev/null)

        echo "  ✓ Cookie found"
        echo "    Browser: $BROWSER"
        echo "    Decrypted: $DECRYPTED"

        # Check if expired
        if [ "$EXPIRY" != "null" ] && [ "$EXPIRY" != "Infinity" ]; then
            EXPIRY_TIMESTAMP=$(date -d "$EXPIRY" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%S" "${EXPIRY%%.*}" +%s 2>/dev/null)
            CURRENT_TIMESTAMP=$(date +%s)

            if [ -n "$EXPIRY_TIMESTAMP" ]; then
                if [ "$EXPIRY_TIMESTAMP" -gt "$CURRENT_TIMESTAMP" ]; then
                    DAYS_LEFT=$(( ($EXPIRY_TIMESTAMP - $CURRENT_TIMESTAMP) / 86400 ))
                    echo "    Valid for: $DAYS_LEFT days"
                else
                    echo -e "    ${RED}⚠ EXPIRED${NC}"
                fi
            else
                echo "    Expiry: $EXPIRY"
            fi
        else
            echo "    Type: Session cookie"
        fi
        return 0
    else
        echo -e "  ${RED}✗ Cookie not found${NC}"
        return 1
    fi
}

# Validate some common cookies
validate_cookie "github.com" "user_session"
echo ""

# ============================================================================
# Example 7: Reusable Shell Function for Multiple Cookies
# ============================================================================
echo -e "${YELLOW}7️⃣ Reusable Function for Multiple Cookies${NC}"
echo "───────────────────────────────────────────────"

cat << 'EOF'
get_cookie_for_curl() {
    local cookie_name=$1
    local domain=$2
    local cookie_value=$(get-cookie "$cookie_name" "$domain" --render 2>/dev/null | head -1)

    if [ -n "$cookie_value" ]; then
        echo "$cookie_value"
        return 0
    else
        echo ""
        return 1
    fi
}

# Build a cookie header with multiple specific cookies
COOKIE_HEADER=""
for cookie in "user_session" "dotcom_user" "_gh_sess"; do
    if cookie_value=$(get_cookie_for_curl "$cookie" "github.com"); then
        if [ -n "$COOKIE_HEADER" ]; then
            COOKIE_HEADER="$COOKIE_HEADER; $cookie_value"
        else
            COOKIE_HEADER="$cookie_value"
        fi
    fi
done

curl -H "Cookie: $COOKIE_HEADER" https://github.com/settings/profile
EOF
echo ""

# ============================================================================
# Example 8: Using with Other Tools
# ============================================================================
echo -e "${YELLOW}8️⃣ Using with Other HTTP Tools${NC}"
echo "─────────────────────────────────────"

echo -e "${GREEN}With wget:${NC}"
echo -e "${BLUE}wget --header=\"Cookie: \$(get-cookie --url <URL> --render)\" <URL>${NC}"
echo ""

echo -e "${GREEN}With HTTPie:${NC}"
echo -e "${BLUE}http GET <URL> Cookie:\"\$(get-cookie --url <URL> --render)\"${NC}"
echo ""

echo -e "${GREEN}With jq for JSON APIs:${NC}"
echo -e "${BLUE}curl -H \"Cookie: \$(get-cookie --url <URL> --render)\" <URL> | jq .${NC}"
echo ""

# ============================================================================
# Tips and Best Practices
# ============================================================================
echo -e "${BLUE}📚 Tips and Best Practices${NC}"
echo "================================================"
echo ""
echo "1. ${YELLOW}Security:${NC} Never log or save cookie values in scripts"
echo "2. ${YELLOW}Expiration:${NC} Check cookie expiry before using them"
echo "3. ${YELLOW}User-Agent:${NC} Always set a User-Agent header with curl"
echo "4. ${YELLOW}CSRF Tokens:${NC} Some APIs require CSRF tokens in addition to session cookies"
echo "5. ${YELLOW}Rate Limiting:${NC} Respect API rate limits when using automation"
echo ""
echo -e "${GREEN}Example one-liner to test authentication:${NC}"
echo -e "${BLUE}get-cookie --url <URL> --render | xargs -I {} curl -s -H \"Cookie: {}\" <URL> | jq .login${NC}"
echo ""
echo -e "${GREEN}Example to save cookies to a file:${NC}"
echo -e "${BLUE}get-cookie % domain.com --output json > cookies.json${NC}"
echo ""
echo -e "${GREEN}Example to use with wget instead of curl:${NC}"
echo -e "${BLUE}wget --header=\"Cookie: \$(get-cookie --url <URL> --render)\" <URL>${NC}"
echo ""

echo -e "${GREEN}✅ Integration guide complete!${NC}"

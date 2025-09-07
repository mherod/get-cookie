#!/bin/bash

# ============================================================================
# get-cookie + curl Integration Examples
# 
# This script demonstrates how to extract browser cookies and use them
# with curl for authenticated API requests. This is useful for:
# - Testing APIs with real authentication
# - Automating tasks that require browser sessions
# - Debugging authentication issues
# ============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Path to get-cookie CLI (adjust if using global installation)
GET_COOKIE="node $(pwd)/dist/cli.cjs"

echo -e "${BLUE}🍪 get-cookie + curl Integration Examples${NC}"
echo "================================================"

# ============================================================================
# Example 1: GitHub API with session cookie
# ============================================================================
echo -e "\n${YELLOW}Example 1: GitHub API Authentication${NC}"
echo "----------------------------------------"

# Extract GitHub session cookie
echo -e "${GREEN}Extracting GitHub session cookie...${NC}"
GITHUB_SESSION=$($GET_COOKIE user_session github.com 2>/dev/null | head -1)

if [ -n "$GITHUB_SESSION" ]; then
    echo "✓ Found GitHub session cookie"
    
    # Get current user info from GitHub API
    echo -e "\n${GREEN}Fetching user info from GitHub API...${NC}"
    RESPONSE=$(curl -s -H "Cookie: user_session=$GITHUB_SESSION" \
                     -H "User-Agent: get-cookie-demo" \
                     https://api.github.com/user)
    
    # Check if we got a valid response
    if echo "$RESPONSE" | grep -q '"login"'; then
        USERNAME=$(echo "$RESPONSE" | grep -o '"login":"[^"]*' | cut -d'"' -f4)
        NAME=$(echo "$RESPONSE" | grep -o '"name":"[^"]*' | cut -d'"' -f4)
        echo -e "${GREEN}✓ Successfully authenticated as: $NAME (@$USERNAME)${NC}"
    else
        echo -e "${RED}✗ Authentication failed - cookie might be expired${NC}"
    fi
else
    echo -e "${RED}✗ No GitHub session cookie found${NC}"
    echo "  Make sure you're logged into GitHub in Chrome/Firefox"
fi

# ============================================================================
# Example 2: Multiple cookies for complex authentication
# ============================================================================
echo -e "\n${YELLOW}Example 2: Multiple Cookie Authentication${NC}"
echo "----------------------------------------"

# Some sites require multiple cookies for authentication
# Extract all GitHub cookies and format for curl
echo -e "${GREEN}Extracting all GitHub cookies...${NC}"

# Get cookies in JSON format
COOKIES_JSON=$($GET_COOKIE % github.com --output json 2>/dev/null)

if [ -n "$COOKIES_JSON" ]; then
    # Count cookies
    COOKIE_COUNT=$(echo "$COOKIES_JSON" | jq 'length')
    echo "✓ Found $COOKIE_COUNT GitHub cookies"
    
    # Build cookie header with multiple cookies
    COOKIE_HEADER=$(echo "$COOKIES_JSON" | jq -r '.[] | "\(.name)=\(.value)"' | head -5 | paste -sd '; ')
    
    if [ -n "$COOKIE_HEADER" ]; then
        echo -e "\n${GREEN}Testing with multiple cookies...${NC}"
        # Make request with multiple cookies
        STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
                      -H "Cookie: $COOKIE_HEADER" \
                      -H "User-Agent: get-cookie-demo" \
                      https://github.com/settings/profile)
        
        if [ "$STATUS" = "200" ]; then
            echo -e "${GREEN}✓ Successfully accessed protected page (HTTP $STATUS)${NC}"
        else
            echo -e "${RED}✗ Access denied (HTTP $STATUS)${NC}"
        fi
    fi
else
    echo -e "${RED}✗ Failed to extract cookies${NC}"
fi

# ============================================================================
# Example 3: Download protected content
# ============================================================================
echo -e "\n${YELLOW}Example 3: Download Protected Content${NC}"
echo "----------------------------------------"

# Example: Download a file that requires authentication
echo -e "${GREEN}Preparing authenticated download...${NC}"

# Get session cookie for a specific domain
DOMAIN="github.com"
SESSION=$($GET_COOKIE user_session $DOMAIN 2>/dev/null | head -1)

if [ -n "$SESSION" ]; then
    echo "✓ Authentication cookie ready"
    
    # Example: Download user's avatar (requires authentication for private profiles)
    echo -e "\n${GREEN}Example curl command for authenticated download:${NC}"
    echo -e "${BLUE}curl -H \"Cookie: user_session=\$SESSION\" \\
     -H \"User-Agent: YourApp\" \\
     -o avatar.jpg \\
     https://github.com/username.png${NC}"
else
    echo -e "${RED}✗ No session cookie available${NC}"
fi

# ============================================================================
# Example 4: Function for easy cookie extraction
# ============================================================================
echo -e "\n${YELLOW}Example 4: Reusable Shell Function${NC}"
echo "----------------------------------------"

# Define a reusable function
get_cookie_for_curl() {
    local cookie_name=$1
    local domain=$2
    local cookie_value=$($GET_COOKIE "$cookie_name" "$domain" 2>/dev/null | head -1)
    
    if [ -n "$cookie_value" ]; then
        echo "$cookie_name=$cookie_value"
        return 0
    else
        echo ""
        return 1
    fi
}

# Demonstrate the function
echo -e "${GREEN}Using reusable function to build cookie header...${NC}"

# Build a cookie header with multiple specific cookies
COOKIE_HEADER=""
for cookie in "user_session" "dotcom_user" "_gh_sess"; do
    if cookie_value=$(get_cookie_for_curl "$cookie" "github.com"); then
        if [ -n "$COOKIE_HEADER" ]; then
            COOKIE_HEADER="$COOKIE_HEADER; $cookie_value"
        else
            COOKIE_HEADER="$cookie_value"
        fi
        echo "  ✓ Added $cookie"
    else
        echo "  ✗ Skipped $cookie (not found)"
    fi
done

if [ -n "$COOKIE_HEADER" ]; then
    echo -e "\n${GREEN}Complete Cookie header for curl:${NC}"
    echo -e "${BLUE}Cookie: $COOKIE_HEADER${NC}"
fi

# ============================================================================
# Example 5: POST request with cookies
# ============================================================================
echo -e "\n${YELLOW}Example 5: POST Request with Authentication${NC}"
echo "----------------------------------------"

echo -e "${GREEN}Example: Creating a GitHub gist with authentication${NC}"

# Get GitHub session
SESSION=$($GET_COOKIE user_session github.com 2>/dev/null | head -1)
CSRF=$($GET_COOKIE _gh_sess github.com 2>/dev/null | head -1)

if [ -n "$SESSION" ]; then
    echo -e "\n${BLUE}Example POST command:${NC}"
    cat << 'EOF'
curl -X POST \
  -H "Cookie: user_session=$SESSION; _gh_sess=$CSRF" \
  -H "Content-Type: application/json" \
  -H "User-Agent: get-cookie-demo" \
  -d '{
    "description": "Created via API",
    "public": false,
    "files": {
      "test.txt": {
        "content": "Hello from get-cookie + curl!"
      }
    }
  }' \
  https://api.github.com/gists
EOF
else
    echo -e "${RED}✗ Authentication cookies not available${NC}"
fi

# ============================================================================
# Example 6: Cookie validation
# ============================================================================
echo -e "\n${YELLOW}Example 6: Cookie Validation${NC}"
echo "----------------------------------------"

validate_cookie() {
    local domain=$1
    local cookie_name=$2
    
    echo -e "${GREEN}Validating $cookie_name for $domain...${NC}"
    
    # Get cookie with metadata
    COOKIE_JSON=$($GET_COOKIE "$cookie_name" "$domain" --output json 2>/dev/null)
    
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

# ============================================================================
# Tips and Best Practices
# ============================================================================
echo -e "\n${BLUE}📚 Tips and Best Practices${NC}"
echo "================================================"
echo "
1. ${YELLOW}Security:${NC} Never log or save cookie values in scripts
2. ${YELLOW}Expiration:${NC} Check cookie expiry before using them
3. ${YELLOW}User-Agent:${NC} Always set a User-Agent header with curl
4. ${YELLOW}CSRF Tokens:${NC} Some APIs require CSRF tokens in addition to session cookies
5. ${YELLOW}Rate Limiting:${NC} Respect API rate limits when using automation

${GREEN}Example one-liner to test authentication:${NC}
${BLUE}\$GET_COOKIE user_session github.com | xargs -I {} curl -s -H \"Cookie: user_session={}\" https://api.github.com/user | jq .login${NC}

${GREEN}Example to save cookies to a file:${NC}
${BLUE}\$GET_COOKIE % domain.com --output json > cookies.json${NC}

${GREEN}Example to use with wget instead of curl:${NC}
${BLUE}wget --header=\"Cookie: \$(\$GET_COOKIE session domain.com)\" https://domain.com/protected${NC}
"

echo -e "${GREEN}✅ Examples completed!${NC}"
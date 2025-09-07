#!/bin/bash

# Working example: Using get-cookie with curl for web scraping
echo "🌐 Web Scraping with get-cookie + curl"
echo "======================================="

# Example 1: Check if logged into GitHub (web, not API)
echo -e "\n1️⃣ Checking GitHub login status (web)..."
GITHUB_COOKIES=$(get-cookie % github.com --render 2>/dev/null | head -1)

if [ -n "$GITHUB_COOKIES" ]; then
    # Access the settings page which requires authentication
    RESPONSE=$(curl -s -L \
        -H "Cookie: $GITHUB_COOKIES" \
        -H "User-Agent: Mozilla/5.0" \
        "https://github.com/settings/profile" | grep -o '<input.*name="user\[profile_name\]".*value="[^"]*"' | sed 's/.*value="\([^"]*\)".*/\1/')
    
    if [ -n "$RESPONSE" ]; then
        echo "   ✅ Successfully accessed GitHub settings"
        echo "   Profile name field found: $RESPONSE"
    else
        echo "   ⚠️ Could not access settings (may need more cookies)"
    fi
else
    echo "   ❌ No GitHub cookies found"
fi

# Example 2: Download a file that requires login
echo -e "\n2️⃣ Example: Download private content..."
echo "   Command to download a private gist:"
echo "   curl -H \"Cookie: \$(get-cookie % github.com --render)\" -o gist.txt https://gist.github.com/username/gist_id/raw"

# Example 3: Check login status on various sites
echo -e "\n3️⃣ Checking login status on popular sites..."

check_site_login() {
    local domain=$1
    local check_url=$2
    local check_string=$3
    
    echo -n "   $domain: "
    
    COOKIES=$(get-cookie % "$domain" --render 2>/dev/null | head -1)
    if [ -z "$COOKIES" ]; then
        echo "No cookies found"
        return
    fi
    
    # Try to access a page that requires login
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Cookie: $COOKIES" \
        -H "User-Agent: Mozilla/5.0" \
        "$check_url")
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ Logged in (HTTP 200)"
    elif [ "$HTTP_CODE" = "302" ] || [ "$HTTP_CODE" = "301" ]; then
        echo "⚠️ Redirected (HTTP $HTTP_CODE) - possibly logged out"
    else
        echo "❌ Not accessible (HTTP $HTTP_CODE)"
    fi
}

check_site_login "github.com" "https://github.com/settings/profile" "Settings"
check_site_login "stackoverflow.com" "https://stackoverflow.com/users/edit/current" "Edit Profile"
check_site_login "linkedin.com" "https://www.linkedin.com/in/me/" "Profile"

# Example 4: Practical scraping example
echo -e "\n4️⃣ Practical example: Get your GitHub stats..."
if [ -n "$GITHUB_COOKIES" ]; then
    # Get the user's contribution graph data
    USERNAME=$(get-cookie dotcom_user github.com --render 2>/dev/null | cut -d'=' -f2)
    if [ -n "$USERNAME" ]; then
        echo "   Fetching contribution data for: $USERNAME"
        
        # This would normally require being logged in to see private contributions
        CONTRIBUTIONS=$(curl -s \
            -H "Cookie: $GITHUB_COOKIES" \
            -H "User-Agent: Mozilla/5.0" \
            "https://github.com/$USERNAME" | grep -o 'data-count="[0-9]*"' | head -7 | sed 's/data-count="\([0-9]*\)"/\1/')
        
        if [ -n "$CONTRIBUTIONS" ]; then
            echo "   Recent contribution counts:"
            echo "$CONTRIBUTIONS" | head -7 | while read count; do
                echo "   • $count contributions"
            done
        fi
    fi
fi

# Example 5: Advanced - Using with jq for JSON APIs that accept cookies
echo -e "\n5️⃣ One-liner examples for common tasks:"
echo "────────────────────────────────────────"
cat << 'EOF'
# Download all cookies as JSON for backup:
get-cookie % github.com --output json > github-cookies-backup.json

# Use with wget instead of curl:
wget --no-cookies --header "Cookie: $(get-cookie % example.com --render)" https://example.com/file

# Chain multiple domains:
(get-cookie % site1.com --render; get-cookie % site2.com --render) | curl -H "Cookie: $(cat)" https://api.example.com

# Use with httpie (more user-friendly than curl):
http GET https://example.com Cookie:"$(get-cookie % example.com --render)"

# Quick login check:
get-cookie logged_in github.com --render && echo "✅ Logged in" || echo "❌ Not logged in"
EOF

echo -e "\n📝 Notes:"
echo "• The --render flag outputs: name1=value1; name2=value2"
echo "• Perfect for curl's Cookie header"
echo "• Works with any site that uses cookie authentication"
echo "• Remember: GitHub's API uses tokens, not cookies"

echo -e "\n✅ Examples complete!"
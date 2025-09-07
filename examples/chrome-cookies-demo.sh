#!/bin/bash

# Chrome-specific cookie extraction demo
echo "🍪 Chrome Cookie Extraction with get-cookie"
echo "==========================================="
echo ""

# Basic Chrome cookie extraction
echo "1️⃣ Basic Chrome cookie extraction:"
echo "─────────────────────────────────"
echo "Command: get-cookie --url https://github.com --browser chrome --render"
echo ""
COOKIES=$(get-cookie --url https://github.com --browser chrome --render 2>/dev/null | head -c 100)
echo "Output (truncated): $COOKIES..."
echo ""

# JSON output for debugging
echo "2️⃣ Chrome cookies in JSON format:"
echo "────────────────────────────────"
echo "Command: get-cookie --url https://github.com --browser chrome --output json"
echo ""
get-cookie --url https://github.com --browser chrome --output json 2>/dev/null | jq '.[:2]'
echo ""

# Filtering duplicates
echo "3️⃣ Handling duplicate cookies:"
echo "─────────────────────────────"
echo "Chrome may have duplicate cookies from different profiles."
echo ""
echo "Session cookies found:"
get-cookie --url https://github.com --browser chrome --output json 2>/dev/null | \
    jq -r '.[] | select(.name == "user_session") | "  • \(.value[0:20])... (\(.value | length) chars)"'
echo ""

# Smart filtering
echo "4️⃣ Smart cookie filtering (recommended):"
echo "───────────────────────────────────────"
echo "Filter to get the longest (most likely valid) cookie value:"
echo ""
cat << 'EOF'
VALID_SESSION=$(get-cookie --url https://github.com --browser chrome --output json | \
    jq -r '.[] | select(.name == "user_session" and (.value | length) > 20) | .value' | \
    head -1)
EOF
echo ""

# Using with curl
echo "5️⃣ Using Chrome cookies with curl:"
echo "────────────────────────────────"
echo "Simple approach (may fail with duplicates):"
echo 'curl -H "Cookie: $(get-cookie --url <URL> --browser chrome --render)" <URL>'
echo ""
echo "Robust approach (with filtering):"
cat << 'EOF'
# Get deduplicated cookies (longest value wins)
COOKIES=$(get-cookie --url <URL> --browser chrome --output json | \
    jq -r 'group_by(.name) | map(max_by(.value | length)) | 
    .[] | "\(.name)=\(.value)"' | tr '\n' ';')

curl -H "Cookie: $COOKIES" <URL>
EOF
echo ""

# Testing authentication
echo "6️⃣ Testing GitHub authentication with Chrome cookies:"
echo "───────────────────────────────────────────────────"
COOKIES=$(get-cookie --url https://github.com --browser chrome --output json 2>/dev/null | \
    jq -r 'group_by(.name) | map(max_by(.value | length)) | .[] | "\(.name)=\(.value)"' | tr '\n' ';')

echo -n "Testing with deduplicated cookies: "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Cookie: $COOKIES" \
    -H "User-Agent: Mozilla/5.0" \
    "https://github.com/settings/profile")

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Success (HTTP 200)"
elif [ "$HTTP_CODE" = "302" ]; then
    echo "❌ Redirected to login (HTTP 302)"
else
    echo "⚠️  HTTP $HTTP_CODE"
fi
echo ""

# Check cookie counts
echo "7️⃣ Cookie statistics:"
echo "──────────────────"
TOTAL=$(get-cookie --url https://github.com --browser chrome --output json 2>/dev/null | jq 'length')
UNIQUE=$(get-cookie --url https://github.com --browser chrome --output json 2>/dev/null | jq '[.[] | .name] | unique | length')
echo "• Total cookies: $TOTAL"
echo "• Unique cookie names: $UNIQUE"
echo "• Duplicates: $((TOTAL - UNIQUE))"
echo ""

# Expired cookie filtering
echo "8️⃣ Expired cookie filtering:"
echo "──────────────────────────"
WITHOUT=$(get-cookie --url https://github.com --browser chrome --output json 2>/dev/null | jq 'length')
WITH=$(get-cookie --url https://github.com --browser chrome --output json --include-expired 2>/dev/null | jq 'length')
echo "• Without --include-expired: $WITHOUT cookies"
echo "• With --include-expired: $WITH cookies"
if [ "$WITH" -gt "$WITHOUT" ]; then
    echo "• ✅ Filtered out $((WITH - WITHOUT)) expired cookies"
else
    echo "• ℹ️  No expired cookies found"
fi
echo ""

echo "💡 Key Insights:"
echo "──────────────"
echo "• Chrome may store duplicate cookies from different profiles"
echo "• The --render flag outputs all cookies, including duplicates"
echo "• For authentication, deduplicate by taking the longest value"
echo "• Expired cookies are filtered by default (use --include-expired to see all)"
echo "• Use JSON output + jq for precise cookie control"
echo ""
echo "✅ Chrome cookie extraction complete!"
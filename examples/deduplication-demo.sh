#!/bin/bash

# Demonstration of the new cookie deduplication feature
echo "🍪 Cookie Deduplication Feature Demo"
echo "===================================="
echo ""
echo "This demo shows how get-cookie now handles duplicate cookies"
echo "from Chrome profiles by default, keeping the most valid one."
echo ""

# Show the problem
echo "1️⃣ The Problem: Chrome Duplicate Cookies"
echo "────────────────────────────────────────"
echo "Chrome can store duplicate cookies from different profiles."
echo "Let's see what happens with --include-all (old behavior):"
echo ""

echo "Command: get-cookie user_session github.com --browser chrome --output json --include-all"
echo ""
get-cookie user_session github.com --browser chrome --output json --include-all 2>/dev/null | \
    jq -r '.[] | "  • Value: \(.value[0:20])... (\(.value | length) chars)"'
echo ""

# Show the solution
echo "2️⃣ The Solution: Automatic Deduplication (Default)"
echo "──────────────────────────────────────────────────"
echo "By default, get-cookie now keeps only the most valid cookie:"
echo ""

echo "Command: get-cookie user_session github.com --browser chrome --output json"
echo ""
get-cookie user_session github.com --browser chrome --output json 2>/dev/null | \
    jq -r '.[] | "  • Value: \(.value[0:20])... (\(.value | length) chars)"'
echo ""

# Demonstrate the render difference
echo "3️⃣ Impact on --render Output"
echo "───────────────────────────"
echo ""

echo "With --include-all (all duplicates):"
RENDER_ALL=$(get-cookie user_session github.com --browser chrome --render --include-all 2>/dev/null)
echo "  ${RENDER_ALL:0:60}..."
echo "  Length: $(echo "$RENDER_ALL" | wc -c) chars"
echo ""

echo "Default (deduplicated):"
RENDER_DEDUP=$(get-cookie user_session github.com --browser chrome --render 2>/dev/null)
echo "  $RENDER_DEDUP"
echo "  Length: $(echo "$RENDER_DEDUP" | wc -c) chars"
echo ""

# Show how it works with curl
echo "4️⃣ Using with curl"
echo "────────────────"
echo "The deduplication ensures curl gets the valid cookie:"
echo ""

echo "Command: curl -H \"Cookie: \$(get-cookie --url <URL> --browser chrome --render)\" <URL>"
echo ""
echo "Example for GitHub:"
COOKIES=$(get-cookie --url https://github.com --browser chrome --render 2>/dev/null)
echo "  Cookie count: $(echo "$COOKIES" | grep -o ';' | wc -l | xargs expr 1 +)"
echo "  user_session value length: $(echo "$COOKIES" | grep -o 'user_session=[^;]*' | cut -d'=' -f2 | wc -c) chars"
echo ""

# Show all duplicates
echo "5️⃣ Viewing All Duplicates"
echo "───────────────────────"
echo "To see all duplicate cookies (for debugging), use --include-all:"
echo ""

echo "Command: get-cookie % github.com --browser chrome --output json --include-all"
echo ""
echo "Duplicate cookie names found:"
get-cookie % github.com --browser chrome --output json --include-all 2>/dev/null | \
    jq -r '[.[] | .name] | group_by(.) | map(select(length > 1)) | map(.[0]) | .[]' | \
    sort | uniq | while read name; do
        COUNT=$(get-cookie "$name" github.com --browser chrome --output json --include-all 2>/dev/null | jq 'length')
        if [ "$COUNT" -gt 1 ]; then
            echo "  • $name: $COUNT copies"
        fi
    done
echo ""

# Summary
echo "📊 Summary"
echo "────────"
echo ""

# Count cookies with and without deduplication
TOTAL_ALL=$(get-cookie % github.com --browser chrome --output json --include-all 2>/dev/null | jq 'length')
TOTAL_DEDUP=$(get-cookie % github.com --browser chrome --output json 2>/dev/null | jq 'length')
REMOVED=$((TOTAL_ALL - TOTAL_DEDUP))

echo "Chrome cookies for github.com:"
echo "  • With --include-all: $TOTAL_ALL cookies"
echo "  • Default (deduplicated): $TOTAL_DEDUP cookies"
echo "  • Duplicates removed: $REMOVED"
echo ""

echo "💡 Key Points:"
echo "────────────"
echo "• Deduplication is ON by default (keeps longest/newest cookie)"
echo "• Use --include-all to see all duplicates"
echo "• Combines with --include-expired for complete control"
echo "• Solves the Chrome \"truncated cookie\" problem"
echo ""

echo "✅ The deduplication feature ensures you get valid cookies for authentication!"
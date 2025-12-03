#!/bin/bash

# ============================================================================
# get-cookie CLI Features Demonstration
# ============================================================================
# Comprehensive guide to all advanced CLI features including profile
# selection, cookie deduplication, expired filtering, and browser-specific
# extraction.
# ============================================================================

echo "✨ get-cookie CLI Features Demonstration"
echo "========================================"
echo ""

# ============================================================================
# Feature 1: Profile Listing and Selection
# ============================================================================
echo "1️⃣ Profile Listing and Selection"
echo "─────────────────────────────────"
echo ""

echo "The --list-profiles option helps you discover available browser profiles:"
echo ""
echo "Command: get-cookie --browser chrome --list-profiles"
echo ""

if get-cookie --browser chrome --list-profiles 2>/dev/null | head -5 | grep -q "."; then
    echo "Available Chrome profiles:"
    get-cookie --browser chrome --list-profiles 2>/dev/null | head -5
    echo ""

    echo "Step 1: List available profiles"
    echo "  get-cookie --browser chrome --list-profiles"
    echo ""
    echo "Step 2: Use a specific profile name from the list"
    echo '  get-cookie --url https://github.com --browser chrome --profile "Profile Name" --render'
    echo ""

    # Test profile-specific extraction
    PROFILE_NAME=$(get-cookie --browser chrome --list-profiles 2>/dev/null | head -1 | cut -d':' -f1 | xargs)
    if [ -n "$PROFILE_NAME" ]; then
        echo "Example: Getting cookies from '$PROFILE_NAME' profile:"
        SESSION=$(get-cookie user_session github.com --browser chrome --profile "$PROFILE_NAME" --render 2>/dev/null)
        if [ -n "$SESSION" ]; then
            VALUE=$(echo "$SESSION" | cut -d'=' -f2)
            echo "  user_session=${VALUE:0:20}... (${#VALUE} chars)"
        else
            echo "  No user_session cookie found in this profile"
        fi
    fi
else
    echo "ℹ️  No Chrome profiles found (or Chrome not installed)"
    echo ""
    echo "Supported browsers with profile support:"
    echo "  • chrome    - Google Chrome"
    echo "  • edge      - Microsoft Edge"
    echo "  • arc       - Arc Browser"
    echo "  • opera     - Opera"
    echo "  • opera-gx  - Opera GX"
fi
echo ""

# ============================================================================
# Feature 2: Cookie Deduplication
# ============================================================================
echo "2️⃣ Cookie Deduplication"
echo "───────────────────────"
echo ""

echo "Chrome can store duplicate cookies from different profiles."
echo "get-cookie automatically deduplicates by default, keeping the most valid one."
echo ""

echo "The Problem: Chrome Duplicate Cookies"
echo "─────────────────────────────────────"
echo "Chrome may store duplicate cookies from different profiles."
echo "Let's see what happens with --include-all (old behavior):"
echo ""

echo "Command: get-cookie user_session github.com --browser chrome --output json --include-all"
DUPLICATE_COUNT=$(get-cookie user_session github.com --browser chrome --output json --include-all 2>/dev/null | jq 'length // 0')
echo "  Found $DUPLICATE_COUNT duplicate user_session cookies"
echo ""

echo "The Solution: Automatic Deduplication (Default)"
echo "───────────────────────────────────────────────"
echo "By default, get-cookie now keeps only the most valid cookie:"
echo ""

echo "Command: get-cookie user_session github.com --browser chrome --output json"
DEDUP_COUNT=$(get-cookie user_session github.com --browser chrome --output json 2>/dev/null | jq 'length // 0')
echo "  Found $DEDUP_COUNT deduplicated user_session cookies"
echo ""

if [ "$DUPLICATE_COUNT" -gt "$DEDUP_COUNT" ]; then
    REMOVED=$((DUPLICATE_COUNT - DEDUP_COUNT))
    echo "  ✅ Removed $REMOVED duplicate cookies"
else
    echo "  ℹ️  No duplicates found (or same count)"
fi
echo ""

echo "Impact on --render Output:"
echo "─────────────────────────"
RENDER_ALL=$(get-cookie user_session github.com --browser chrome --render --include-all 2>/dev/null)
RENDER_DEDUP=$(get-cookie user_session github.com --browser chrome --render 2>/dev/null)

echo "With --include-all (all duplicates):"
echo "  Length: $(echo "$RENDER_ALL" | wc -c) chars"
echo ""
echo "Default (deduplicated):"
echo "  Length: $(echo "$RENDER_DEDUP" | wc -c) chars"
echo ""

echo "💡 The deduplication ensures curl gets the valid cookie:"
echo '   curl -H "Cookie: $(get-cookie --url <URL> --browser chrome --render)" <URL>'
echo ""

# ============================================================================
# Feature 3: Expired Cookie Filtering
# ============================================================================
echo "3️⃣ Expired Cookie Filtering"
echo "───────────────────────────"
echo ""

echo "By default, get-cookie filters out expired cookies for better authentication success."
echo ""

echo "Default behavior (filters expired cookies):"
DEFAULT_COUNT=$(get-cookie --url https://github.com --output json 2>/dev/null | jq 'length // 0')
echo "  Cookies returned: $DEFAULT_COUNT"
echo ""

echo "With --include-expired flag:"
WITH_EXPIRED_COUNT=$(get-cookie --url https://github.com --output json --include-expired 2>/dev/null | jq 'length // 0')
echo "  Cookies returned: $WITH_EXPIRED_COUNT"
echo ""

if [ "$WITH_EXPIRED_COUNT" -gt "$DEFAULT_COUNT" ]; then
    DIFF=$((WITH_EXPIRED_COUNT - DEFAULT_COUNT))
    echo "  ✅ Filtering is working! Removed $DIFF expired cookies"
else
    echo "  ℹ️  No expired cookies found (or same count)"
fi
echo ""

echo "Sample cookies with expiry info:"
echo "───────────────────────────────"
echo "Default (non-expired only):"
get-cookie --url https://github.com --output json 2>/dev/null | \
    jq -r '.[:3] | .[] | "  • \(.name): expires \(if .expiry then (.expiry | todate) else "session" end)"' 2>/dev/null
echo ""

echo "With expired included:"
get-cookie --url https://github.com --output json --include-expired 2>/dev/null | \
    jq -r '.[:3] | .[] | "  • \(.name): expires \(if .expiry then (.expiry | todate) else "session" end)"' 2>/dev/null
echo ""

# ============================================================================
# Feature 4: Browser-Specific Extraction
# ============================================================================
echo "4️⃣ Browser-Specific Extraction"
echo "──────────────────────────────"
echo ""

echo "Target a specific browser with --browser flag:"
echo ""
echo "  get-cookie --url <URL> --browser chrome --render"
echo "  get-cookie --url <URL> --browser firefox --render"
echo "  get-cookie --url <URL> --browser safari --render"
echo ""

echo "Testing browser-specific extraction:"
for browser in chrome firefox safari; do
    COUNT=$(get-cookie --url https://github.com --browser "$browser" --output json 2>/dev/null | jq 'length // 0')
    if [ "$COUNT" -gt 0 ]; then
        echo "  • $browser: $COUNT cookies found"
    else
        echo "  • $browser: No cookies found (or browser not installed)"
    fi
done
echo ""

# ============================================================================
# Feature 5: Combining Features
# ============================================================================
echo "5️⃣ Combining Features"
echo "────────────────────"
echo ""

echo "You can combine multiple features for precise control:"
echo ""
echo "Example 1: Profile + Browser + Deduplication"
echo '  get-cookie --url <URL> --browser chrome --profile "Work" --render'
echo ""
echo "Example 2: Include Expired + All Duplicates (for debugging)"
echo '  get-cookie --url <URL> --output json --include-expired --include-all'
echo ""
echo "Example 3: Browser + JSON Output + Filtering"
echo '  get-cookie --url <URL> --browser chrome --output json | \'
echo '    jq '"'"'.[] | select(.name == "user_session" and (.value | length) > 20)'"'"
echo ""

# ============================================================================
# Feature 6: Practical Workflow
# ============================================================================
echo "6️⃣ Practical Workflow"
echo "────────────────────"
echo ""

cat << 'EOF'
# Complete workflow for authenticated requests:

# 1. Check which profiles are available
get-cookie --browser chrome --list-profiles

# 2. Choose the profile with the right session
#    (e.g., "Work" for company repos, "Personal" for personal)

# 3. Extract cookies from that specific profile
COOKIES=$(get-cookie --url https://github.com \
          --browser chrome \
          --profile "Work" \
          --render)

# 4. Use with curl for authenticated requests
curl -H "Cookie: $COOKIES" https://github.com/company/private-repo
EOF
echo ""

# ============================================================================
# Summary
# ============================================================================
echo "📊 Feature Summary"
echo "─────────────────"
echo ""

TOTAL_ALL=$(get-cookie % github.com --browser chrome --output json --include-all 2>/dev/null | jq 'length // 0')
TOTAL_DEDUP=$(get-cookie % github.com --browser chrome --output json 2>/dev/null | jq 'length // 0')
REMOVED=$((TOTAL_ALL - TOTAL_DEDUP))

echo "Chrome cookies for github.com:"
echo "  • With --include-all: $TOTAL_ALL cookies"
echo "  • Default (deduplicated): $TOTAL_DEDUP cookies"
if [ "$REMOVED" -gt 0 ]; then
    echo "  • Duplicates removed: $REMOVED"
fi
echo ""

echo "💡 Key Points:"
echo "────────────"
echo "• Deduplication is ON by default (keeps longest/newest cookie)"
echo "• Expired cookies are filtered by default (use --include-expired to see all)"
echo "• Use --include-all to see all duplicates (for debugging)"
echo "• Profile selection avoids conflicts between browser profiles"
echo "• Browser-specific extraction ensures you get cookies from the right source"
echo ""

echo "✅ Features demonstration complete!"


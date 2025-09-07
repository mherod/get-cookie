#!/bin/bash

# Demonstration of the --list-profiles feature
echo "🍪 Profile Listing Feature Demo"
echo "==============================="
echo ""

echo "The new --list-profiles option helps you discover available browser profiles"
echo "before using them with the --profile option."
echo ""

# Basic usage
echo "📋 Basic Usage:"
echo "─────────────"
echo "$ get-cookie --browser chrome --list-profiles"
echo ""
get-cookie --browser chrome --list-profiles
echo ""

# Show how it integrates with profile selection
echo "🔗 Integration with Profile Selection:"
echo "────────────────────────────────────"
echo ""
echo "Step 1: List available profiles"
echo "$ get-cookie --browser chrome --list-profiles"
echo ""
echo "Step 2: Use a specific profile name from the list"
echo "$ get-cookie --url https://github.com --browser chrome --profile \"plugg.in\" --render"
echo ""

# Demonstrate actual usage
echo "Example: Getting cookies from a specific profile"
echo ""
PROFILE_NAME="plugg.in"
if get-cookie --browser chrome --list-profiles 2>/dev/null | grep -q "$PROFILE_NAME"; then
    echo "✓ Profile '$PROFILE_NAME' found"
    echo ""
    echo "Getting GitHub session from '$PROFILE_NAME' profile:"
    SESSION=$(get-cookie user_session github.com --browser chrome --profile "$PROFILE_NAME" --render 2>/dev/null)
    if [ -n "$SESSION" ]; then
        VALUE=$(echo "$SESSION" | cut -d'=' -f2)
        echo "  user_session=${VALUE:0:20}... (${#VALUE} chars)"
    else
        echo "  No session cookie found"
    fi
else
    echo "Profile '$PROFILE_NAME' not found"
fi
echo ""

# Show error handling
echo "⚠️  Error Handling:"
echo "────────────────"
echo ""
echo "Without --browser flag:"
echo "$ get-cookie --list-profiles"
get-cookie --list-profiles 2>&1 | head -2
echo ""

echo "With unsupported browser:"
echo "$ get-cookie --browser safari --list-profiles"
get-cookie --browser safari --list-profiles 2>&1
echo ""

# Show all supported browsers
echo "🌐 Supported Browsers:"
echo "───────────────────"
echo ""
echo "Chromium-based browsers with profile support:"
echo "  • chrome    - Google Chrome"
echo "  • edge      - Microsoft Edge"
echo "  • arc       - Arc Browser"
echo "  • opera     - Opera"
echo "  • opera-gx  - Opera GX"
echo ""
echo "Other browsers:"
echo "  • firefox   - Profile listing coming soon"
echo "  • safari    - No profile support (uses system keychain)"
echo ""

# Practical workflow
echo "💼 Practical Workflow:"
echo "───────────────────"
echo ""
cat << 'EOF'
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

# Show JSON output option
echo "📊 JSON Output Option:"
echo "──────────────────"
echo ""
echo "For scripting, combine with JSON output:"
echo '$ get-cookie --url https://example.com --browser chrome --profile "Work" --output json | jq ...'
echo ""

# Summary
echo "✨ Summary:"
echo "─────────"
echo "• Use --list-profiles to discover available profiles"
echo "• Profile names are shown with their directory mappings"
echo "• User email is displayed when available"
echo "• Works with all Chromium-based browsers"
echo "• Essential for managing multiple logged-in sessions"
echo ""
echo "✅ The --list-profiles feature makes profile selection easy and discoverable!"
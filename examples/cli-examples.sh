#!/bin/bash

# Set up the get-cookie function to use the source directly
get-cookie() {
    pnpm tsx src/cli/cli.ts "$@"
}

# Note: Ensure all browser instances are closed before running these examples
# On macOS, grant "Full Disk Access" to your terminal

echo "GitHub Cookie Examples:"
echo "----------------------"

# Get GitHub authentication cookies (useful for API requests)
echo "\nGetting GitHub authentication cookies:"
echo "These cookies are needed for authenticated API requests"
get-cookie user_session github.com --render
get-cookie __Host-user_session_same_site github.com --render

# Get GitHub user preferences
echo "\nGetting GitHub user preferences:"
echo "These cookies store user-specific settings"
get-cookie color_mode github.com --render
echo "Color mode preferences (light/dark theme settings)"
get-cookie tz github.com --render
echo "Timezone setting"

# Get GitHub session state
echo "\nGetting GitHub session state:"
echo "These cookies indicate login status and user identity"
get-cookie logged_in github.com --render
echo "Login status"
get-cookie dotcom_user github.com --render
echo "GitHub username"

# Get all GitHub cookies in grouped format
echo "\nGetting all GitHub cookies (grouped by browser):"
echo "Useful for debugging authentication issues"
get-cookie % github.com --dump-grouped

# Different output formats for automation
echo "\nOutput format examples:"
echo "----------------------"

# JSON output (useful for scripting)
echo "\nJSON format (good for scripting):"
get-cookie user_session github.com --output json

# Rendered output (human-readable)
echo "\nRendered format (good for debugging):"
get-cookie user_session github.com --render

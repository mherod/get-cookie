#!/usr/bin/env bash

# Safe, local quick start for get-cookie.
# Override TARGET_DOMAIN and COOKIE_NAME for an authorized site.

set -u

TARGET_DOMAIN=${TARGET_DOMAIN:-example.com}
COOKIE_NAME=${COOKIE_NAME:-sessionid}

if ! command -v get-cookie >/dev/null 2>&1; then
  printf '%s\n' "get-cookie is not installed. Install @mherod/get-cookie first." >&2
  exit 1
fi

printf '%s\n' "get-cookie quick start"
printf '%s\n' "Target domain: $TARGET_DOMAIN"
printf '%s\n' "This demo never prints or saves cookie values."
printf '\n'

printf '%s\n' "1. Check for one named cookie"
cookie_value="$(get-cookie "$COOKIE_NAME" "$TARGET_DOMAIN" 2>/dev/null || true)"
if [ -n "$cookie_value" ]; then
  printf '%s\n' "   Found a matching cookie."
else
  printf '%s\n' "   No matching cookie found."
fi
unset cookie_value

printf '\n%s\n' "2. Discover profiles before selecting one"
printf '%s\n' "   get-cookie --browser chrome --list-profiles"

printf '\n%s\n' "3. Useful status-only commands to run manually"
printf '%s\n' "   get-cookie $COOKIE_NAME $TARGET_DOMAIN"
printf '%s\n' "   get-cookie $COOKIE_NAME $TARGET_DOMAIN --browser chrome --profile '<exact profile>' | grep -q ."

printf '\n%s\n' "4. Why no request is sent"
printf '%s\n' "   --render is a sensitive serializer, not a safe generic request helper."
printf '%s\n' "   Query matches do not prove exact destination applicability."

printf '\n%s\n' "Done. See features-demo.sh for more local inspection patterns."

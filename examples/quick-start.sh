#!/usr/bin/env bash

# Safe, local quick start for get-cookie.
# Override TARGET_DOMAIN, TARGET_URL, and COOKIE_NAME for an authorized site.

set -u

TARGET_DOMAIN=${TARGET_DOMAIN:-example.com}
TARGET_URL=${TARGET_URL:-https://$TARGET_DOMAIN/dashboard}
COOKIE_NAME=${COOKIE_NAME:-sessionid}

if ! command -v get-cookie >/dev/null 2>&1; then
  printf '%s\n' "get-cookie is not installed. Install @mherod/get-cookie first." >&2
  exit 1
fi

printf '%s\n' "get-cookie quick start"
printf '%s\n' "Target: $TARGET_URL"
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

printf '\n%s\n' "2. Build a Cookie header for one URL"
cookie_header="$(get-cookie --url "$TARGET_URL" --render 2>/dev/null || true)"
if [ -n "$cookie_header" ]; then
  printf '%s\n' "   Found a header for the target URL."
else
  printf '%s\n' "   No matching cookies found for the target URL."
fi

printf '\n%s\n' "3. Useful commands to run manually"
printf '%s\n' "   get-cookie $COOKIE_NAME $TARGET_DOMAIN"
printf '%s\n' "   get-cookie --url $TARGET_URL --render"
printf '%s\n' "   get-cookie --browser chrome --list-profiles"
printf '%s\n' "   get-cookie --url $TARGET_URL --browser chrome --profile 'Work' --render"

printf '\n%s\n' "4. Optional local request"
if [ "${RUN_REQUESTS:-0}" = "1" ] && [ -n "$cookie_header" ]; then
  http_code="$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' -H "Cookie: $cookie_header" "$TARGET_URL")"
  printf '%s\n' "   Request completed with HTTP $http_code."
  unset http_code
else
  printf '%s\n' "   Skipped. Set RUN_REQUESTS=1 to send a request to TARGET_URL."
fi

unset cookie_header
printf '\n%s\n' "Done. See curl-integration.sh and features-demo.sh for more local patterns."

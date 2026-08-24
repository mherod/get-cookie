#!/usr/bin/env bash

# Web-session authentication pattern for GitHub-style sites.
# Defaults use placeholders; override TARGET_DOMAIN, TARGET_PATH, and
# COOKIE_NAME only for an authorized site.

set -u

TARGET_DOMAIN=${TARGET_DOMAIN:-example.com}
TARGET_PATH=${TARGET_PATH:-/settings/profile}
WEB_URL="https://$TARGET_DOMAIN$TARGET_PATH"
COOKIE_NAME=${COOKIE_NAME:-sessionid}

if ! command -v get-cookie >/dev/null 2>&1; then
  printf '%s\n' "get-cookie is not installed. Install @mherod/get-cookie first." >&2
  exit 1
fi

printf '%s\n' "Web authentication pattern"
printf '%s\n' "Target: $WEB_URL"
printf '%s\n' "This script never prints or persists cookie values."
printf '\n'

printf '%s\n' "Browser cookies are for an existing local web session."
printf '%s\n' "Most service APIs require an official token instead."
printf '\n'

cookie_header="$(get-cookie "$COOKIE_NAME" "$TARGET_DOMAIN" --render 2>/dev/null || true)"
if [ -z "$cookie_header" ]; then
  printf '%s\n' "No matching named cookie found for the target web page."
  printf '%s\n' "Check that you are signed in locally, then try --list-profiles."
else
  printf '%s\n' "A matching web-session header is available."
fi

printf '\n%s\n' "Optional local web request:"
if [ "${RUN_REQUESTS:-0}" = "1" ] && [ -n "$cookie_header" ]; then
  http_code="$(curl --silent --show-error --location --output /dev/null --write-out '%{http_code}' -H "Cookie: $cookie_header" "$WEB_URL")"
  printf '%s\n' "Web request completed with HTTP $http_code."
  unset http_code
else
  printf '%s\n' "Skipped. Set RUN_REQUESTS=1 to call the fixed web path."
fi

unset cookie_header

printf '\n%s\n' "Useful local checks:"
printf '%s\n' "  get-cookie --list-profiles"
printf '%s\n' "  get-cookie $COOKIE_NAME $TARGET_DOMAIN --browser chrome --profile 'Work' --render"
printf '%s\n' "  get-cookie $COOKIE_NAME $TARGET_DOMAIN --browser firefox --container work --render"
printf '\n%s\n' "For API access, use the service's CLI, OAuth flow, or API token."

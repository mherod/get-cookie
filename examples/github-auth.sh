#!/usr/bin/env bash

# Web-session inspection pattern for GitHub-style sites.
# Defaults use placeholders; override TARGET_DOMAIN and COOKIE_NAME only for
# an authorized site.

set -u

TARGET_DOMAIN=${TARGET_DOMAIN:-example.com}
COOKIE_NAME=${COOKIE_NAME:-sessionid}

if ! command -v get-cookie >/dev/null 2>&1; then
  printf '%s\n' "get-cookie is not installed. Install @mherod/get-cookie first." >&2
  exit 1
fi

printf '%s\n' "Web-session inspection pattern"
printf '%s\n' "Target domain: $TARGET_DOMAIN"
printf '%s\n' "This script never prints or persists cookie values."
printf '\n'

printf '%s\n' "Browser cookies are for an existing local web session."
printf '%s\n' "Most service APIs require an official token instead."
printf '\n'

cookie_value="$(get-cookie "$COOKIE_NAME" "$TARGET_DOMAIN" 2>/dev/null || true)"
if [ -z "$cookie_value" ]; then
  printf '%s\n' "No matching named cookie found for the target web page."
  printf '%s\n' "Check that you are signed in locally, then try --list-profiles."
else
  printf '%s\n' "A matching web-session cookie is readable."
fi

unset cookie_value

printf '\n%s\n' "Useful local checks:"
printf '%s\n' "  get-cookie --list-profiles"
printf '%s\n' "  get-cookie $COOKIE_NAME $TARGET_DOMAIN --browser chrome --profile '<exact profile>' | grep -q ."
printf '%s\n' "  get-cookie $COOKIE_NAME $TARGET_DOMAIN --browser firefox --container work | grep -q ."
printf '\n%s\n' "--render is not a safe generic outgoing-request helper."
printf '%s\n' "For API access, use the service's CLI, OAuth flow, or API token."

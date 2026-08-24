#!/usr/bin/env bash

# Local request-readiness patterns.
# This legacy-named example never sends an HTTP request.

set -u

TARGET_DOMAIN=${TARGET_DOMAIN:-example.com}
COOKIE_NAME=${COOKIE_NAME:-sessionid}

if ! command -v get-cookie >/dev/null 2>&1; then
  printf '%s\n' "get-cookie is not installed. Install @mherod/get-cookie first." >&2
  exit 1
fi

session_is_readable() {
  local cookie_value

  cookie_value="$(
    get-cookie "$COOKIE_NAME" "$TARGET_DOMAIN" 2>/dev/null || true
  )"
  if [ -z "$cookie_value" ]; then
    unset cookie_value
    return 1
  fi

  unset cookie_value
  return 0
}

printf '%s\n' "get-cookie request-readiness check"
printf '%s\n' "Target domain: $TARGET_DOMAIN"
printf '%s\n' "Cookie values are kept in memory and never printed."
printf '\n'

if session_is_readable; then
  printf '%s\n' "A named local session cookie is readable."
else
  printf '%s\n' "No matching named cookie found for the target domain."
fi

printf '\n%s\n' "Verify a profile before selecting it:"
printf '%s\n' "  get-cookie --browser chrome --list-profiles"
printf '%s\n' "  get-cookie $COOKIE_NAME $TARGET_DOMAIN --browser chrome --profile '<exact profile>' | grep -q ."

printf '\n%s\n' "No HTTP request is sent here."
printf '%s\n' "--render is a serializer, not a safe generic request helper."
printf '%s\n' "Use official API tokens for requests, CI, or unattended work."

#!/usr/bin/env bash

# Safe local curl integration patterns.
# No request is sent unless RUN_REQUESTS=1 is set explicitly.

set -u

TARGET_DOMAIN=${TARGET_DOMAIN:-example.com}
TARGET_PATH=${TARGET_PATH:-/dashboard}
TARGET_URL="https://$TARGET_DOMAIN$TARGET_PATH"
COOKIE_NAME=${COOKIE_NAME:-sessionid}

if ! command -v get-cookie >/dev/null 2>&1; then
  printf '%s\n' "get-cookie is not installed. Install @mherod/get-cookie first." >&2
  exit 1
fi

authenticated_curl() {
  local cookie_header
  local status

  cookie_header="$(
    get-cookie "$COOKIE_NAME" "$TARGET_DOMAIN" --render 2>/dev/null || true
  )"
  if [ -z "$cookie_header" ]; then
    printf '%s\n' "No matching named cookie found for $TARGET_DOMAIN" >&2
    return 1
  fi

  if curl --silent --show-error --fail --output /dev/null "$@" -H "Cookie: $cookie_header" "$TARGET_URL"; then
    status=0
  else
    status=$?
  fi

  unset cookie_header
  return "$status"
}

printf '%s\n' "get-cookie + curl"
printf '%s\n' "Target: $TARGET_URL"
printf '%s\n' "Cookie values are kept in memory and never printed."
printf '\n'

printf '%s\n' "Recommended header command:"
printf '%s\n' "  get-cookie $COOKIE_NAME $TARGET_DOMAIN --render"
printf '\n'

cookie_header="$(get-cookie "$COOKIE_NAME" "$TARGET_DOMAIN" --render 2>/dev/null || true)"
if [ -n "$cookie_header" ]; then
  printf '%s\n' "A named Cookie header is available for the target domain."
else
  printf '%s\n' "No matching named cookie found for the target domain."
fi
unset cookie_header

printf '\n%s\n' "Reusable helper:"
printf '%s\n' "  authenticated_curl [curl options]"
printf '%s\n' "It fails closed when no cookies are available."

printf '\n%s\n' "Optional local request:"
if [ "${RUN_REQUESTS:-0}" = "1" ]; then
  if authenticated_curl; then
    printf '%s\n' "Request completed successfully."
  else
    printf '%s\n' "Request failed or no cookies were available." >&2
  fi
else
  printf '%s\n' "Skipped. Set RUN_REQUESTS=1 to call the fixed target path."
fi

printf '\n%s\n' "Useful variants:"
printf '%s\n' "  get-cookie $COOKIE_NAME $TARGET_DOMAIN --browser chrome --render"
printf '%s\n' "  get-cookie $COOKIE_NAME $TARGET_DOMAIN --browser chrome --profile 'Work' --render"
printf '%s\n' "  get-cookie $COOKIE_NAME $TARGET_DOMAIN --browser firefox --container work --render"
printf '\n%s\n' "Use official API tokens for CI or unattended requests."

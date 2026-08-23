#!/usr/bin/env bash

# Safe local curl integration patterns.
# No request is sent unless RUN_REQUESTS=1 is set explicitly.

set -u

TARGET_URL=${TARGET_URL:-https://example.com/dashboard}

if ! command -v get-cookie >/dev/null 2>&1; then
  printf '%s\n' "get-cookie is not installed. Install @mherod/get-cookie first." >&2
  exit 1
fi

authenticated_curl() {
  local url=$1
  shift

  local cookie_header
  local status

  cookie_header="$(get-cookie --url "$url" --render 2>/dev/null || true)"
  if [ -z "$cookie_header" ]; then
    printf '%s\n' "No matching cookies found for $url" >&2
    return 1
  fi

  if curl --silent --show-error --fail --output /dev/null "$@" -H "Cookie: $cookie_header" "$url"; then
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
printf '%s\n' "  get-cookie --url $TARGET_URL --render"
printf '\n'

cookie_header="$(get-cookie --url "$TARGET_URL" --render 2>/dev/null || true)"
if [ -n "$cookie_header" ]; then
  printf '%s\n' "A Cookie header is available for the target URL."
else
  printf '%s\n' "No matching cookies found for the target URL."
fi
unset cookie_header

printf '\n%s\n' "Reusable helper:"
printf '%s\n' "  authenticated_curl <URL> [curl options]"
printf '%s\n' "It fails closed when no cookies are available."

printf '\n%s\n' "Optional local request:"
if [ "${RUN_REQUESTS:-0}" = "1" ]; then
  if authenticated_curl "$TARGET_URL"; then
    printf '%s\n' "Request completed successfully."
  else
    printf '%s\n' "Request failed or no cookies were available." >&2
  fi
else
  printf '%s\n' "Skipped. Set RUN_REQUESTS=1 to call TARGET_URL."
fi

printf '\n%s\n' "Useful variants:"
printf '%s\n' "  get-cookie --url $TARGET_URL --browser chrome --render"
printf '%s\n' "  get-cookie --url $TARGET_URL --browser chrome --profile 'Work' --render"
printf '%s\n' "  get-cookie --url $TARGET_URL --browser firefox --container work --render"
printf '\n%s\n' "Use official API tokens for CI or unattended requests."

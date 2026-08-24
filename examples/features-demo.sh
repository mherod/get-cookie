#!/usr/bin/env bash

# Safe CLI feature tour.
# Counts are printed; cookie values are never printed or saved.

set -u

TARGET_DOMAIN=${TARGET_DOMAIN:-example.com}
COOKIE_NAME=${COOKIE_NAME:-sessionid}

if ! command -v get-cookie >/dev/null 2>&1; then
  printf '%s\n' "get-cookie is not installed. Install @mherod/get-cookie first." >&2
  exit 1
fi

count_json() {
  local json

  json="$(get-cookie "$@" --output json 2>/dev/null || true)"
  if [ -z "$json" ]; then
    json="[]"
  fi

  printf '%s' "$json" | jq -r 'if type == "array" then length else 0 end'
  unset json
}

printf '%s\n' "get-cookie CLI features"
printf '%s\n' "Target domain: $TARGET_DOMAIN"
printf '%s\n' "This demo prints only counts and commands, never cookie values."
printf '\n'

printf '%s\n' "1. Profile discovery"
printf '%s\n' "   get-cookie --browser chrome --list-profiles"
printf '%s\n' "   get-cookie $COOKIE_NAME $TARGET_DOMAIN --browser chrome --profile '<exact profile>' | grep -q ."
printf '%s\n' "   get-cookie $COOKIE_NAME $TARGET_DOMAIN --browser firefox --container work | grep -q ."

if ! command -v jq >/dev/null 2>&1; then
  printf '\n%s\n' "jq is unavailable, so count-based demonstrations are skipped."
  exit 0
fi

printf '\n%s\n' "2. Deduplication"
deduplicated_count="$(count_json "$COOKIE_NAME" "$TARGET_DOMAIN")"
all_count="$(count_json "$COOKIE_NAME" "$TARGET_DOMAIN" --include-all)"
printf '%s\n' "   Default count: $deduplicated_count"
printf '%s\n' "   With --include-all: $all_count"
unset deduplicated_count all_count

printf '\n%s\n' "3. Expired-cookie flag limitation"
printf '%s\n' "   --include-expired is accepted but currently does not change CLI query results."
printf '%s\n' "   Browser strategies keep their own expiry behavior."

printf '\n%s\n' "4. Browser-specific queries"
for browser in chrome firefox safari; do
  browser_count="$(count_json "$COOKIE_NAME" "$TARGET_DOMAIN" --browser "$browser")"
  printf '%s\n' "   $browser: $browser_count"
  unset browser_count
done

printf '\n%s\n' "5. Output modes"
printf '%s\n' "   Default output: raw values, one per line"
printf '%s\n' "   --render: one Cookie-header string"
printf '%s\n' "   --output json: structured results"
printf '%s\n' "   --dump-grouped: JSON grouped by source file"
printf '%s\n' "   --render-grouped: header strings grouped by source file"
printf '%s\n' "   Treat every output mode as sensitive."
printf '%s\n' "   --render is a serializer, not a safe generic request helper."

printf '\n%s\n' "6. JWT inspection flags"
printf '%s\n' "   get-cookie $COOKIE_NAME $TARGET_DOMAIN --detect-jwt --output json"
printf '%s\n' "   get-cookie $COOKIE_NAME $TARGET_DOMAIN --jwt-only --output json"
printf '%s\n' "   Run these only in a private local terminal."

printf '\n%s\n' "Feature tour complete."

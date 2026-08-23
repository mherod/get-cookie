#!/usr/bin/env bash

# Development-only examples that execute the CLI source through pnpm/tsx.
# Published-package users should run get-cookie directly instead.

set -u

TARGET_DOMAIN=${TARGET_DOMAIN:-example.com}
TARGET_URL=${TARGET_URL:-https://$TARGET_DOMAIN/dashboard}
COOKIE_NAME=${COOKIE_NAME:-sessionid}

if ! command -v pnpm >/dev/null 2>&1; then
  printf '%s\n' "pnpm is required to run the CLI from source." >&2
  exit 1
fi

run_get_cookie() {
  pnpm tsx src/cli/cli.ts "$@"
}

printf '%s\n' "Source CLI examples"
printf '%s\n' "Target: $TARGET_URL"
printf '%s\n' "Cookie values are never printed or saved."
printf '\n'

printf '%s\n' "1. CLI help"
run_get_cookie --help

printf '\n%s\n' "2. Check a named cookie without displaying it"
cookie_value="$(run_get_cookie "$COOKIE_NAME" "$TARGET_DOMAIN" 2>/dev/null || true)"
if [ -n "$cookie_value" ]; then
  printf '%s\n' "   Found a matching cookie."
else
  printf '%s\n' "   No matching cookie found."
fi
unset cookie_value

printf '\n%s\n' "3. Check URL-derived cookies without displaying them"
cookie_header="$(run_get_cookie --url "$TARGET_URL" --render 2>/dev/null || true)"
if [ -n "$cookie_header" ]; then
  printf '%s\n' "   Found a Cookie header for the target URL."
else
  printf '%s\n' "   No matching cookies found."
fi
unset cookie_header

printf '\n%s\n' "4. Commands to try manually"
printf '%s\n' "   pnpm tsx src/cli/cli.ts --browser chrome --list-profiles"
printf '%s\n' "   pnpm tsx src/cli/cli.ts --url $TARGET_URL --browser chrome --profile 'Work' --render"
printf '%s\n' "   pnpm tsx src/cli/cli.ts --url $TARGET_URL --browser firefox --container work --render"
printf '%s\n' "   pnpm tsx src/cli/cli.ts --url $TARGET_URL --output json"
printf '\n%s\n' "Treat all query output as sensitive."

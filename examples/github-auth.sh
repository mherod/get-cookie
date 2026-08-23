#!/usr/bin/env bash

# Web-session authentication pattern for GitHub-style sites.
# Defaults use placeholder domains; override WEB_URL only for an authorized site.

set -u

WEB_URL=${WEB_URL:-https://example.com/settings/profile}

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

cookie_header="$(get-cookie --url "$WEB_URL" --render 2>/dev/null || true)"
if [ -z "$cookie_header" ]; then
  printf '%s\n' "No matching cookies found for the target web page."
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
  printf '%s\n' "Skipped. Set RUN_REQUESTS=1 to call WEB_URL."
fi

unset cookie_header

printf '\n%s\n' "Useful local checks:"
printf '%s\n' "  get-cookie --list-profiles"
printf '%s\n' "  get-cookie --url $WEB_URL --browser chrome --profile 'Work' --render"
printf '%s\n' "  get-cookie --url $WEB_URL --browser firefox --container work --render"
printf '\n%s\n' "For API access, use the service's CLI, OAuth flow, or API token."

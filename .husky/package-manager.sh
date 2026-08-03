#!/bin/sh

run_pnpm() {
  if command -v pnpm >/dev/null 2>&1; then
    pnpm "$@"
    return
  fi

  if command -v corepack >/dev/null 2>&1; then
    corepack pnpm "$@"
    return
  fi

  printf '%s\n' \
    "pnpm is required to run this Git hook. Install pnpm or enable Corepack." \
    >&2
  return 127
}

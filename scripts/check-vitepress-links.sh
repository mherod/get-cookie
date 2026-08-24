#!/bin/bash

set -euo pipefail

critical_files=(
  "docs/index.md"
  "docs/guide/index.md"
  "docs/guide/getting-started.md"
  "docs/guide/cli-usage.md"
  "docs/guide/api-usage.md"
  "docs/guide/browser-support.md"
  "docs/automation/index.md"
  "docs/reference/index.md"
)

for file in "${critical_files[@]}"; do
  if [ ! -f "$file" ]; then
    echo "Missing critical documentation file: $file" >&2
    exit 1
  fi
done

echo "Generating API reference..."
pnpm exec typedoc
./scripts/fix-typedoc.sh

echo "Building VitePress and checking links..."
pnpm exec vitepress build docs

echo "Documentation links are valid."

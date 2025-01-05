#!/bin/bash

# Run VitePress build in a way that only checks for dead links
pnpm vitepress build docs 2>&1 | grep -i "dead link" > /dev/null

if [ $? -eq 0 ]; then
  echo "❌ Dead links found in VitePress documentation"
  # Show the actual dead links
  pnpm vitepress build docs 2>&1 | grep -i "dead link"
  exit 1
else
  echo "✅ No dead links found in VitePress documentation"
  exit 0
fi

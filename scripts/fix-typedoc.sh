#!/bin/bash

# Rename all README.md files to index.md
find docs/reference -name "README.md" -exec sh -c 'mv "$1" "$(dirname "$1")/index.md"' _ {} \;

# Update all .md files to use the correct links
find docs/reference -name "*.md" -exec sed -i '' 's/README.md/index.html/g' {} \;

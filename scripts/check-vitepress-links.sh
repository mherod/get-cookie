#!/bin/bash

# VitePress link integrity checker
# Validates documentation links and structure using VitePress build

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 VitePress Link Integrity Check${NC}"
echo "================================================"

# Track overall status
HAS_ERRORS=0
HAS_WARNINGS=0

# Step 1: Check critical files exist
echo -e "\n${YELLOW}Checking critical documentation files...${NC}"

CRITICAL_FILES=(
    "docs/index.md"
    "docs/guide/index.md"
    "docs/guide/browser-support.md"
    "docs/automation/index.md"
    "docs/reference/index.md"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "${RED}✗ Missing critical file: $file${NC}"
        HAS_ERRORS=1
    fi
done

if [ $HAS_ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ All critical files present${NC}"
fi

# Step 2: Check browser-support.md location
echo -e "\n${YELLOW}Verifying browser support documentation location...${NC}"

if [ -f "docs/guide/browser-support.md" ]; then
    echo -e "${GREEN}✓ Browser support matrix in correct location (docs/guide/)${NC}"
else
    echo -e "${RED}✗ Browser support matrix missing from docs/guide/${NC}"
    HAS_ERRORS=1
fi

if [ -f "docs/reference/browser-support.md" ]; then
    echo -e "${YELLOW}⚠ Old browser-support.md still exists in docs/reference/${NC}"
    echo "  This file will be overwritten by TypeDoc and should be removed"
    HAS_WARNINGS=1
fi

# Step 3: Run VitePress build to check for dead links
echo -e "\n${YELLOW}Running VitePress build to check for dead links...${NC}"

# Run VitePress build and capture output
BUILD_OUTPUT=$(pnpm vitepress build docs 2>&1 || true)

# Check for dead link errors
if echo "$BUILD_OUTPUT" | grep -i "dead link" > /dev/null; then
    echo -e "${RED}❌ VitePress detected dead links:${NC}"
    echo "$BUILD_OUTPUT" | grep -i "dead link"
    HAS_ERRORS=1
else
    echo -e "${GREEN}✓ VitePress build successful - no dead links detected${NC}"
fi

# Check for other build errors
if echo "$BUILD_OUTPUT" | grep -E "Error:|error:" | grep -v "0 errors" > /dev/null; then
    echo -e "${YELLOW}⚠ Build warnings detected${NC}"
    HAS_WARNINGS=1
fi

# Final report
echo -e "\n${BLUE}================================================${NC}"

if [ $HAS_ERRORS -eq 1 ]; then
    echo -e "${RED}❌ Link integrity check failed - errors must be fixed${NC}"
    exit 1
elif [ $HAS_WARNINGS -eq 1 ]; then
    echo -e "${YELLOW}⚠ Link integrity check passed with warnings${NC}"
    exit 0
else
    echo -e "${GREEN}✅ All link integrity checks passed!${NC}"
    exit 0
fi
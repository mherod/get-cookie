# Contributing to get-cookie

Thank you for your interest in contributing to get-cookie! This document provides guidelines and instructions to help you get started.

## Development Environment Setup

### Node.js Version Management

This project requires Node.js v20.0.0 or v22.0.0. We strongly recommend using [nvm (Node Version Manager)](https://github.com/nvm-sh/nvm) to manage your Node.js versions.

```bash
# Install nvm if you haven't already
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Install the required Node.js version
nvm install 22.0.0

# Use the required Node.js version
nvm use 22.0.0
```

The project includes an `.nvmrc` file that specifies the required Node.js version, so you can simply run `nvm use` in the project directory to switch to the correct version.

### Ensuring nvm Node.js is Prioritized

To ensure that the nvm-managed version of Node.js is always used (instead of any system-installed versions), add the following to your shell configuration file (`.bashrc`, `.zshrc`, etc.):

```bash
# Load nvm and ensure it's in the PATH
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

# Optional: Automatically use the Node.js version specified in .nvmrc if present
autoload -U add-zsh-hook
load-nvmrc() {
  local node_version="$(nvm version)"
  local nvmrc_path="$(nvm_find_nvmrc)"

  if [ -n "$nvmrc_path" ]; then
    local nvmrc_node_version=$(nvm version "$(cat "${nvmrc_path}")")

    if [ "$nvmrc_node_version" = "N/A" ]; then
      nvm install
    elif [ "$nvmrc_node_version" != "$node_version" ]; then
      nvm use
    fi
  elif [ "$node_version" != "$(nvm version default)" ]; then
    nvm use default
  fi
}
add-zsh-hook chpwd load-nvmrc
load-nvmrc
```

This configuration ensures that:
1. nvm is loaded and available in your PATH
2. The correct Node.js version is automatically used when you navigate to the project directory
3. The nvm-managed Node.js version takes precedence over any system-installed versions

## Package Manager

We use [pnpm](https://pnpm.io/) as our package manager. After setting up Node.js with nvm, install pnpm:

```bash
npm install -g pnpm@9.15.2
```

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/get-cookie.git`
3. Navigate to the project directory: `cd get-cookie`
4. Switch to the correct Node.js version: `nvm use`
5. Install dependencies: `pnpm install`
6. Run tests to verify your setup: `pnpm test`

## Git Flow Workflow

This project uses [git-flow](https://github.com/nvie/gitflow) for branch management and releases. Git-flow provides a structured approach to managing features, releases, and hotfixes.

### Branch Structure

- **main** - Production-ready code. Only release and hotfix branches merge here.
- **develop** - Integration branch for the next release. Feature branches merge here.
- **feature/*** - New features and enhancements
- **release/*** - Prepare new releases, bug fixes, and version bumps
- **hotfix/*** - Critical fixes for production issues

### Installing Git-Flow

```bash
# macOS
brew install git-flow-avh

# Ubuntu/Debian
sudo apt-get install git-flow

# Windows
# Download from: https://github.com/petervanderdoes/gitflow-avh/wiki/Installing-on-Windows
```

### Git-Flow Configuration

The repository is already configured with these settings:
- Production branch: `main`
- Development branch: `develop`
- Feature prefix: `feature/`
- Release prefix: `release/`
- Hotfix prefix: `hotfix/`
- Version tag prefix: `v`

### Development Workflow

#### Working on a New Feature

```bash
# Start a new feature
git flow feature start my-new-feature

# Work on your feature...
# Make commits as usual
git add .
git commit -m "feat: add new feature"

# Run validation before finishing
pnpm run validate

# Finish the feature (merges to develop)
git flow feature finish my-new-feature
```

#### Creating a Release

```bash
# Start a new release
git flow release start 4.4.0

# Update version in package.json
npm version 4.4.0 --no-git-tag-version

# Run final validation
pnpm run validate

# Commit release changes
git add .
git commit -m "chore: prepare release 4.4.0"

# Finish the release (merges to main and develop, creates tag)
git flow release finish 4.4.0

# Push everything
git push origin main develop --tags
```

#### Emergency Hotfixes

```bash
# Start a hotfix from main
git flow hotfix start 4.4.1

# Fix the critical issue
git add .
git commit -m "fix: critical security issue"

# Update version
npm version 4.4.1 --no-git-tag-version
git add package.json
git commit -m "chore: bump version to 4.4.1"

# Finish hotfix (merges to main and develop, creates tag)
git flow hotfix finish 4.4.1

# Push everything
git push origin main develop --tags
```

### Code Quality Requirements

All branches must pass these checks:

```bash
pnpm run validate  # Runs all of the following:
pnpm run type-check    # TypeScript compilation
pnpm run lint          # ESLint + Biome formatting  
pnpm run test          # Jest test suite
pnpm run build         # Library and CLI builds
pnpm run check-links   # Documentation validation
```

### Commit Message Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` - New features
- `fix:` - Bug fixes  
- `chore:` - Maintenance tasks
- `docs:` - Documentation updates
- `test:` - Test additions/updates
- `refactor:` - Code refactoring
- `perf:` - Performance improvements

## Git Hooks

This project uses [husky](https://github.com/typicode/husky) and [lint-staged](https://github.com/okonet/lint-staged) to run checks before commits. The hooks are configured to use the nvm-managed Node.js version, ensuring compatibility with the project requirements.

## Need Help?

If you have any questions or need help with your contribution, please open an issue or reach out to the maintainers.

Thank you for contributing to get-cookie!

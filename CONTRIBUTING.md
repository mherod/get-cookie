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

## Development Workflow

1. Create a new branch for your feature or bugfix: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Run tests to ensure everything works: `pnpm test`
4. Run the type checker: `pnpm type-check`
5. Run the linter: `pnpm lint`
6. Format your code: `pnpm format`
7. Commit your changes using conventional commit format: `git commit -m "feat: add new feature"`
8. Push your branch: `git push origin feature/your-feature-name`
9. Open a pull request

## Git Hooks

This project uses [husky](https://github.com/typicode/husky) and [lint-staged](https://github.com/okonet/lint-staged) to run checks before commits. The hooks are configured to use the nvm-managed Node.js version, ensuring compatibility with the project requirements.

## Need Help?

If you have any questions or need help with your contribution, please open an issue or reach out to the maintainers.

Thank you for contributing to get-cookie!

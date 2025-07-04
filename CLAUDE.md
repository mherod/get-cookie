# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Development

- `pnpm install` - Install dependencies (uses pnpm as package manager)
- `pnpm run dev` - Development mode with TypeScript watch compilation
- `pnpm run build` - Build both library and CLI distributions
- `pnpm run build:lib` - Build library only
- `pnpm run build:cli` - Build CLI only

### Testing & Quality

- `pnpm test` - Run Jest tests
- `pnpm run type-check` - TypeScript type checking without emit
- `pnpm run lint` - ESLint with codeframe formatter
- `pnpm run lint:fix` - ESLint with auto-fix
- `pnpm run validate` - Full validation (type-check + lint + test + docs links + format check)

### Single Test Execution

Use Jest patterns for running specific tests:

- `pnpm test -- --testNamePattern="specific test name"`
- `pnpm test -- src/path/to/test.test.ts`
- `pnpm test -- --testPathPattern="CookieStrategyFactory"`

### Documentation

- `pnpm run docs:dev` - VitePress dev server for documentation
- `pnpm run docs` - Build documentation (TypeDoc + VitePress)
- `pnpm run check-links` - Validate documentation links

## Architecture Overview

### Core Architecture Pattern

The codebase follows a **Strategy Pattern** for browser-specific cookie extraction:

- **BaseCookieQueryStrategy**: Abstract base class providing standardized error handling and logging
- **Browser-specific strategies**: ChromeCookieQueryStrategy, FirefoxCookieQueryStrategy, SafariCookieQueryStrategy
- **CompositeCookieQueryStrategy**: Combines multiple strategies for querying across all browsers
- **CookieStrategyFactory**: Factory for creating browser-specific or composite strategies

### Key Directories

- `src/core/browsers/`: Browser-specific cookie query implementations
- `src/cli/`: Command-line interface and output handlers
- `src/utils/`: Shared utilities (logging, date handling, JWT validation)
- `src/types/`: TypeScript schemas and type definitions

### Browser-Specific Handling

- **Chrome**: Handles keychain password decryption and SQLite database queries
- **Safari**: Parses binary cookie files with custom decoder
- **Firefox**: Queries SQLite databases with profile discovery

### Path Aliases

The project uses TypeScript path mapping:

- `@core/*` → `src/core/*`
- `@utils/*` → `src/utils/*`
- `@cli/*` → `src/cli/*`
- `@types/*` → `src/types/*`

### Testing Strategy

- Jest with ts-jest for TypeScript compilation
- Tests are co-located in `__tests__` directories
- Mock implementations in `__mocks__` directories
- Single worker mode (`maxWorkers: 1`) for SQLite database safety
- Comprehensive test coverage with browser-specific fixtures

### Output Handling

The CLI uses a factory pattern for different output formats:

- JsonOutputHandler, RenderOutputHandler, DumpOutputHandler
- GroupedDumpOutputHandler, GroupedRenderOutputHandler
- Configurable via CLI flags (`--render`, `--dump`, `--grouped`)

### Key Technical Considerations

- Handles browser encryption (Chrome keychain, Safari binary formats)
- Cross-platform SQLite database querying
- Extensive error handling and graceful degradation
- TypeScript-first with comprehensive type safety
- Zod schemas for runtime validation

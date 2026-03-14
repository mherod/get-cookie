# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

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
- `pnpm test -- src/core/browsers/firefox/` (run by directory path — preferred)

### Documentation

- `pnpm run docs:dev` - VitePress dev server for documentation
- `pnpm run docs` - Build documentation (TypeDoc + VitePress)
- `pnpm run check-links` - Validate documentation links

## Architecture Overview

### Core Architecture Pattern

The codebase follows a **Strategy Pattern** for browser-specific cookie extraction:

- **BaseCookieQueryStrategy**: Abstract base class providing standardized error handling and logging
- **Browser-specific strategies**: ChromiumCookieQueryStrategy (base for Chrome, Edge, Brave, Arc, Opera, OperaGX), FirefoxCookieQueryStrategy, SafariCookieQueryStrategy
- **CompositeCookieQueryStrategy**: Combines multiple strategies for querying across all browsers
- **CookieStrategyFactory**: Factory for creating browser-specific or composite strategies

### SQL Infrastructure

Modern SQL utilities for efficient database operations:

- **DatabaseConnectionManager**: Connection pooling with lifecycle management and retry logic
- **QueryMonitor**: Performance tracking, slow query detection, and metrics collection
- **CookieQueryBuilder**: Type-safe SQL query construction with security validation
- **BrowserLockHandler**: Graceful handling of locked databases with automatic retry

### Key Directories

- `src/core/browsers/`: Browser-specific cookie query implementations
- `src/core/browsers/sql/`: SQL utilities (DatabaseConnectionManager, QueryMonitor, CookieQueryBuilder)
- `src/cli/`: Command-line interface and output handlers
- `src/utils/`: Shared utilities (logging, date handling, JWT validation, platform detection)
- `src/types/`: TypeScript schemas and type definitions

### Browser-Specific Handling

- **Chrome/Chromium-based**: Handles keychain password decryption (macOS), DPAPI (Windows), keyring (Linux). All Chromium browsers (Chrome, Edge, Brave, Arc, Opera, OperaGX) extend `ChromiumCookieQueryStrategy` and share profile filtering via `Local State` → `info_cache`
- **Safari**: Parses binary cookie files with custom decoder (macOS only). Does not support profile filtering — warns at query time when `--profile` is supplied
- **Firefox**: SQLite database queries with multi-variant support (regular, Developer Edition, ESR). Profile filtering via `profiles.ini` parsing (`parseFirefoxProfilesIni()` exported for CLI reuse)
- **Cross-platform**: Full Windows, macOS, and Linux support for Chrome and Firefox
- **Profile discovery**: `CHROMIUM_DATA_DIRS` and `FIREFOX_DATA_DIRS` in `BrowserAvailability.ts` provide platform-specific paths. CLI `--list-profiles` enumerates all installed browser profiles

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
- Mock the SQLite adapter factory, not better-sqlite3 directly: `jest.mock("../adapters/DatabaseAdapter")` then `(adapterModule.createSqliteDatabase as jest.Mock).mockReturnValue(mockDb)`

**Fixing throw-to-return bugs:** When a method is changed from throwing to returning an error result, update all `.rejects.toThrow()` test assertions to `.resolves` assertions checking `result.data === []`. The old assertions validate the broken behaviour and will fail once the fix lands.

**Biome line-length formatting:** `.toMatch(/pattern/)` calls with long regex literals get reformatted to multi-line by Biome. Always run `pnpm run lint` before committing test files to catch this.

### Output Handling

The CLI uses a factory pattern for different output formats:

- JsonOutputHandler, RenderOutputHandler, DumpOutputHandler
- GroupedDumpOutputHandler, GroupedRenderOutputHandler
- Configurable via CLI flags (`--render`, `--dump`, `--grouped`)

### Key Technical Considerations

- Handles browser encryption (Chrome keychain/DPAPI/keyring, Safari binary formats)
- Cross-platform SQLite database querying with optimized indexed queries
- Extensive error handling and graceful degradation with retry mechanisms
- TypeScript-first with comprehensive type safety
- Zod schemas for runtime validation
- Platform-aware process detection and browser conflict resolution
- Debug-level logging for clean stderr output in normal operation

**`exactOptionalPropertyTypes` is enabled.** `property?: T` means the key may be absent but NOT set to `undefined`. DON'T use a ternary with `undefined` as the falsy branch — TypeScript will reject it. DO use conditional spread to omit the key entirely:

```typescript
// WRONG — sets metrics to undefined, rejected by exactOptionalPropertyTypes
return { data: [], metrics: condition ? { ... } : undefined };

// CORRECT — omits the metrics key entirely when condition is false
return { data: [], ...(condition && { metrics: { ... } }) };
```

## Release & Publishing

### Branch protection — `main` is fully protected

DO NOT run `git push origin main` directly. Branch protection requires all changes to
arrive via a PR with passing CI checks. Always push to a feature branch and open a PR:

```bash
git checkout -b chore/release-<version>
git push -u origin chore/release-<version>
gh pr create --title "chore: release <version>" ...
```

### Version bumping — avoid `pnpm version` / `npm version` in nvm environments

`pnpm version patch` delegates to npm internally. When `npm_config_prefix` is set by
nvm, npm conflicts with the husky pre-commit hook (exit code 11) and the command fails
after already staging the `package.json` change.

DO instead:
1. Edit the `version` field in `package.json` manually.
2. Commit: `git commit -m "<version>"`
3. Tag: `git tag v<version>`
4. Push the tag separately **after** the release PR merges: `git push origin v<version>`

DO NOT attempt `npm version patch` or `pnpm version patch` in this repo.

### Publishing to npm

Use `pnpm publish --access public`. If 2FA is enabled, retrieve the OTP first:

```bash
op item get npmjs.com --otp
pnpm publish --access public --otp=<code>
```

The `Release to npm` CI check uses GitHub Actions OIDC trusted publishing and may fail
with an expired token even when the package published successfully. This is a
pre-existing infrastructure issue — the functional checks (`Validate`, `CodeQL JS`,
`Codex-review`) are the authoritative signal for whether the release is healthy.

### Global linking — pnpm link --global

Run `pnpm run build` before `pnpm link --global`. If you see:

```
WARN  Installing a dependency from a non-existent directory: /path/to/missing
```

a stale global link exists. Remove it with `pnpm remove --global <package-name>`. Check
`$(pnpm root -g)/../package.json` to identify which entries are stale.

### CI checks — what to watch vs. what to ignore

- **Required / authoritative**: Validate (all matrix entries), CI Status, Advanced Tests,
  Build Documentation, CodeQL JS, `Codex-review`
- **Pre-existing infrastructure noise**: `Release to npm` OIDC failures when publishing
  was already completed manually.

### Session start — prior incomplete tasks

**DO** recreate prior-session incomplete tasks with `TaskCreate` at the start of each new
session and mark the current one `in_progress` before the first `Bash`/`Edit`/`Write`
call. The `UserPromptSubmit` hook reports prior incomplete tasks in the system reminder;
the `pretooluse-require-tasks.ts` hook only scans the *current* session's transcript, so
prior-session tasks are invisible to it and will trigger a block on the first Bash call.

**DON'T** assume prior-session tasks are done just because the working tree is clean.
Recreate and mark them completed (or in_progress) explicitly before any tool calls.

# Improvement Tasks for get-cookie

This document contains a comprehensive list of actionable improvement tasks for the get-cookie project. Each task is designed to enhance the codebase, improve maintainability, or add new features.

## 🎯 Next Priority Tasks (Ready for Implementation)

Based on testing results and user impact, these are the next tasks to tackle:

1. **Firefox Database Locking** (HIGH) - Most critical user-facing issue

   - Add WAL mode support and retry logic in `QuerySqliteThenTransform.ts`
   - Create process detection utility to warn users about Firefox conflicts

2. **Output Format Validation** (MEDIUM) - Improve CLI user experience

   - Add validation in `OutputHandlerFactory.ts` for invalid format arguments

3. **Custom Error Types** (MEDIUM) - Better debugging and error handling

   - Create error hierarchy in `src/types/errors.ts` for specific error contexts

4. **Force Flag Support** (LOW) - Advanced user option for locked databases
   - Add `--force` flag to attempt operations despite warnings

## 🔥 Critical Issues (High Priority)

Based on comprehensive codebase analysis and CLI testing, these issues need immediate attention:

### Firefox Database Locking

[x] Fix Firefox database locking in `src/core/browsers/firefox/FirefoxCookieQueryStrategy.ts:executeQuery()`

- [x] Add WAL mode support in `src/core/browsers/QuerySqliteThenTransform.ts:querySqliteThenTransform()` (set `PRAGMA journal_mode = WAL`)
- [x] Add retry logic with exponential backoff in `QuerySqliteThenTransform.ts` (3 attempts, 100ms, 500ms, 1000ms delays)
- [x] Create `src/utils/ProcessDetector.ts` to check if Firefox is running using `ps` command
- [x] Add warning in `FirefoxCookieQueryStrategy.ts` when Firefox process detected and database locked
- [ ] Create `src/utils/SafeFileOperations.ts` with temp file copy fallback for locked files
- [x] Update CLI help text to mention closing Firefox for reliable cookie access
- [x] Add `--force` flag support: update `src/utils/argv.ts` alias mapping and `src/cli/cli.ts:parseArgv()`
- [x] Pass force flag through strategy chain: `CookieQueryService` → `executeQuery()` → browser strategies
- [ ] Create integration test in `src/core/browsers/firefox/__tests__/` for database lock handling

### Safari Timestamp Issues

[x] Fix Safari timestamp conversion in `src/core/browsers/safari/decodeBinaryCookies.ts:decodeBinaryCookies()`

- [x] Fix Mac epoch conversion logic in `decodeBinaryCookies.ts` lines ~200-220
- [x] Add timestamp bounds validation before conversion (1970-2100 range)
- [x] Add fallback null handling for invalid timestamps in `BinaryCodableCookie.ts`
- [x] Create test cases in `src/core/browsers/safari/__tests__/SafariCookieQueryStrategy.dates.test.ts`

## ⚡ Medium Priority Issues

### CLI Output & Interface

[x] Fix CLI output format issues in `src/cli/cli.ts` and output handlers

- [x] Fix `--output json` not working in `src/cli/handlers/OutputHandlerFactory.ts:createHandler()`
- [x] Fix duplicate `-d` flag in `src/cli/cli.ts:parseArgv()` (conflicts --dump and --domain)
- [x] Update help text in `src/cli/cli.ts:showHelp()` to use `-D` for domain
- [ ] Add output format validation in `src/cli/handlers/OutputHandlerFactory.ts`
- [x] Update `src/cli/handlers/JsonOutputHandler.ts` to ensure proper JSON-only output

### Error Handling Improvements

[ ] Create custom error types in `src/types/errors.ts` (new file)

- [ ] Create `CookieExtractionError` base class extending Error with `browser` and `context` properties
- [ ] Add `BrowserLockError` extends `CookieExtractionError` with `filePath` and `browser` properties
- [ ] Add `DecryptionError` extends `CookieExtractionError` with `encryptionType` property
- [ ] Add `InvalidTimestampError` extends `CookieExtractionError` with `timestamp` and `expectedRange` properties
- [ ] Add `BinaryParsingError` extends `CookieExtractionError` for Safari cookie parsing failures
- [ ] Update `src/core/browsers/chrome/decrypt.ts` to throw `DecryptionError` instead of generic Error
- [ ] Update `src/core/browsers/firefox/FirefoxCookieQueryStrategy.ts` to throw `BrowserLockError` for locked databases
- [ ] Update `src/core/browsers/safari/BinaryCodableCookie.ts` to throw `InvalidTimestampError` and `BinaryParsingError`
- [ ] Replace all `throw new Error()` calls in `src/core/browsers/*/` with appropriate custom error types
- [ ] Create error handler tests in `src/types/__tests__/errors.test.ts` to verify error properties and inheritance

### Cross-Platform Support

[ ] Add Windows/Linux Chrome support in `src/core/browsers/chrome/`

- [ ] Research Windows DPAPI: create `src/core/browsers/chrome/windows/getChromePassword.ts` using `node-dpapi` package
- [ ] Research Linux keyring: create `src/core/browsers/chrome/linux/getChromePassword.ts` using `keytar` or `secret-service`
- [ ] Add Windows Chrome cookie paths: `%LOCALAPPDATA%\Google\Chrome\User Data\{Profile}\Cookies`
- [ ] Add Linux Chrome cookie paths: `~/.config/google-chrome/{Profile}/Cookies`
- [ ] Update `src/core/browsers/chrome/getChromePassword.ts` to detect `process.platform` and delegate to platform-specific modules
- [ ] Add platform validation in `src/core/browsers/chrome/ChromeCookieQueryStrategy.ts:executeQuery()` with informative error messages
- [ ] Create `src/core/browsers/chrome/__tests__/windows.test.ts` for Windows-specific functionality
- [ ] Create `src/core/browsers/chrome/__tests__/linux.test.ts` for Linux-specific functionality
- [ ] Update package.json with optional dependencies: `"node-dpapi": "^1.0.0"`, `"keytar": "^7.9.0"`
- [ ] Add platform-specific installation instructions to README.md

## 🎯 Architecture Enhancements

### Performance Optimizations

[ ] Add performance improvements to existing strategies

- [ ] Create `src/utils/DecryptionCache.ts` with LRU cache (using `lru-cache` package) for Chrome decryption keys
- [ ] Update `src/core/browsers/chrome/decrypt.ts` to cache decryption results by encrypted value hash
- [ ] Profile current `flatMapAsync` performance in `CompositeCookieQueryStrategy.ts` and replace with `Promise.all` for parallel execution
- [ ] Add SQLite connection pooling in `QuerySqliteThenTransform.ts` to reuse database connections
- [ ] Optimize Safari binary parsing: pre-calculate buffer slices in `BinaryCodablePage.ts` instead of repeated `subarray()` calls
- [ ] Add lazy loading for browser strategies: only import/instantiate when needed
- [ ] Create `src/__tests__/performance/` directory with benchmark tests using `benchmark.js`
- [ ] Add memory usage profiling for large cookie stores (1000+ cookies)
- [ ] Implement streaming cookie processing for very large datasets
- [ ] Add performance metrics to CI pipeline to catch regressions

### Type Safety Improvements

[ ] Eliminate 'any' types and improve type safety

- [ ] Replace 'any' in `src/types/schemas.ts` with proper union types
- [ ] Add type guards in `src/core/browsers/BaseCookieQueryStrategy.ts`
- [ ] Update `src/core/browsers/safari/interfaces/` with stricter types
- [ ] Add discriminated unions for cookie metadata in `src/types/schemas.ts`
- [ ] Improve Zod schemas in `src/types/schemas.ts` for better validation

### Configuration System

[ ] Create user configuration system

- [ ] Create `src/config/ConfigManager.ts` for persistent settings
- [ ] Add config validation with Zod in `src/config/ConfigSchema.ts`
- [ ] Update `src/cli/cli.ts` to load and use config defaults
- [ ] Add config commands to `src/cli/cli.ts` (--config-set, --config-get)
- [ ] Create `~/.get-cookie/config.json` handling in ConfigManager

### Plugin Architecture

[ ] Design extensible plugin system

- [ ] Create `src/plugins/CookiePlugin.ts` interface
- [ ] Create `src/plugins/PluginRegistry.ts` for plugin management
- [ ] Update `src/cli/services/CookieStrategyFactory.ts` to use plugins
- [ ] Create `src/plugins/examples/EdgeCookiePlugin.ts` example
- [ ] Add plugin loading in `src/index.ts` exports

## 🔧 Developer Experience

### Enhanced Error Messages

[ ] Improve error context in existing logger calls

- [ ] Update error logging in `src/core/browsers/BaseCookieQueryStrategy.ts:queryCookies()`
- [ ] Add browser/profile context to `src/core/browsers/chrome/ChromeCookieQueryStrategy.ts` errors
- [ ] Add suggestions to errors in `src/core/browsers/firefox/FirefoxCookieQueryStrategy.ts`
- [ ] Create error code enum in `src/types/errors.ts`
- [ ] Update CLI error handling in `src/cli/cli.ts:main()` with user-friendly messages

### Testing Enhancements

[ ] Add E2E testing infrastructure

- [ ] Create `src/__tests__/e2e/cli.test.ts` for CLI integration tests
- [ ] Add fixture cookies in `src/__tests__/fixtures/` for each browser
- [ ] Create `src/__tests__/snapshots/` for output format testing
- [ ] Add performance tests in `src/__tests__/performance/` directory
- [ ] Create mock browser setup in `jest.setup.js` for CI environment

### Documentation Improvements

[ ] Enhance existing documentation

- [ ] Add `--tutorial` flag handling in `src/cli/cli.ts:parseArgv()`
- [ ] Create `docs/troubleshooting.md` with common error solutions
- [ ] Update `README.md` with browser compatibility table
- [ ] Create `docs/performance.md` optimization guide
- [ ] Add architecture diagrams to `docs/architecture/` directory

## 📊 Quick Wins (1-2 hours each)

These can be implemented quickly for immediate impact:

[x] Fix CLI flag conflict in `src/cli/cli.ts:parseArgv()` - change domain to `-D`
[x] Add timestamp bounds validation in `src/core/browsers/safari/decodeBinaryCookies.ts:decodeBinaryCookies()`
[x] Fix JSON output in `src/cli/handlers/OutputHandlerFactory.ts:createHandler()` method
[x] Add browser context to error messages in `src/core/browsers/BaseCookieQueryStrategy.ts:queryCookies()`
[x] Update package description in `package.json` line 4 to mention all browsers
[x] Fix help text formatting in `src/cli/cli.ts:showHelp()` function

## 🏆 Strategic Improvements (Multi-day efforts)

[ ] Cross-platform Chrome decryption - create `src/core/browsers/chrome/{windows,linux}/` directories
[ ] Plugin architecture - design `src/plugins/` module system
[ ] Performance profiling - add benchmarking in `src/__tests__/performance/`
[ ] E2E testing framework - create `src/__tests__/e2e/` test suites
[ ] Interactive CLI mode - add prompt handling in `src/cli/cli.ts`
[ ] Cookie monitoring - implement file watchers in new `src/monitoring/` module

## Code Quality and Structure

[x] Improve incomplete JSDoc comments throughout the codebase (e.g., empty comments in FirefoxCookieQueryStrategy.ts)
[x] Add missing examples to JSDoc comments (e.g., FirefoxCookieQueryStrategy class)
[x] Standardize error handling across all browser implementations
[x] Refactor duplicate code in browser-specific implementations
[ ] Implement more specific error types instead of using generic Error class
[ ] Add input validation for all public API functions
[ ] Improve type safety by reducing use of 'any' type
[ ] Update package description in package.json to reflect support for all browsers (currently only mentions Chrome)

## Testing

[ ] Increase unit test coverage for edge cases
[ ] Add integration tests for real browser environments
[ ] Implement snapshot testing for rendered cookie outputs
[ ] Add performance benchmarks for cookie extraction operations
[ ] Create more mock fixtures for consistent testing
[ ] Add tests for error conditions and recovery
[ ] Implement end-to-end tests for CLI functionality

## Documentation

[ ] Create a troubleshooting guide for common issues
[ ] Add more code examples for complex use cases
[ ] Document browser compatibility limitations
[ ] Create diagrams explaining the architecture
[ ] Add changelog automation for better release notes
[ ] Improve CLI documentation with more examples
[ ] Document security considerations when handling cookies

## Features

[ ] Add support for additional browsers (e.g., Edge, Brave)
[ ] Implement cookie modification capabilities
[ ] Add support for cookie filtering by additional criteria (e.g., secure flag, httpOnly)
[ ] Create a web interface for cookie management
[ ] Add export functionality to various formats (CSV, JSON, etc.)
[ ] Implement cookie monitoring for changes
[ ] Add support for container/profile-specific cookie extraction in Firefox

## Performance

[ ] Optimize SQLite queries for large cookie stores
[ ] Implement caching for frequently accessed cookies
[ ] Add batch processing for multiple cookie operations
[ ] Optimize binary parsing algorithms
[ ] Reduce memory usage for large cookie datasets
[ ] Implement lazy loading for browser-specific modules

## Security

[ ] Conduct a security audit of encryption/decryption methods
[ ] Implement secure storage for sensitive cookie data
[ ] Add option to redact sensitive cookie values in logs
[ ] Implement cookie value sanitization
[ ] Add warnings for insecure cookie handling practices
[ ] Create a security policy document

## Build and CI/CD

[ ] Upgrade dependencies to latest versions
[ ] Optimize build process for faster compilation
[ ] Add code coverage reporting to CI pipeline
[ ] Implement automated performance regression testing
[ ] Add cross-platform testing (Windows, Linux, macOS)
[ ] Improve release automation
[ ] Add containerization support for consistent environments

## Architecture

[ ] Refactor to support plugin architecture for custom browser implementations
[ ] Implement dependency injection for better testability
[ ] Create a more modular structure for browser-specific code
[ ] Separate CLI and library concerns more clearly
[ ] Implement a proper logging strategy with configurable levels
[ ] Add configuration system for persistent settings
[ ] Refactor to support async iterator pattern for streaming large cookie sets

## User Experience

[ ] Improve error messages with actionable information
[ ] Add progress indicators for long-running operations
[ ] Implement interactive mode for CLI
[ ] Add color coding for different cookie types in CLI output
[ ] Create a configuration wizard for first-time users
[ ] Improve help text and command suggestions
[ ] Add autocomplete support for CLI commands

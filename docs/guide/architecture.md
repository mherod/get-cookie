---
title: Architecture Overview
description: Understanding the technical architecture of get-cookie
---

# Architecture Overview

The get-cookie library follows a well-structured, modular architecture designed for maintainability, extensibility, and performance.

## Core Design Patterns

### Strategy Pattern

The codebase implements the **Strategy Pattern** for browser-specific cookie extraction:

```
BaseCookieQueryStrategy (Abstract)
├── BaseChromiumCookieQueryStrategy
│   ├── ChromeCookieQueryStrategy
│   ├── EdgeCookieQueryStrategy
│   ├── ArcCookieQueryStrategy
│   ├── OperaCookieQueryStrategy
│   └── OperaGXCookieQueryStrategy
├── FirefoxCookieQueryStrategy
├── SafariCookieQueryStrategy
└── CompositeCookieQueryStrategy
```

Each strategy encapsulates browser-specific logic while maintaining a consistent interface.

### Factory Pattern

**CookieStrategyFactory** creates appropriate strategies based on:
- Browser type detection
- Cookie store file analysis
- Automatic fallback to composite strategy

### Composite Pattern

**CompositeCookieQueryStrategy** aggregates multiple strategies to query across all browsers simultaneously.

## SQL Infrastructure

The library includes a sophisticated SQL layer for database operations:

### DatabaseConnectionManager

- **Connection Pooling**: Maintains reusable database connections
- **Lifecycle Management**: Handles connection creation, reuse, and cleanup
- **Retry Logic**: Automatic retry on database lock conditions
- **Thread Safety**: Ensures safe concurrent access

### QueryMonitor

- **Performance Tracking**: Monitors query execution times
- **Slow Query Detection**: Identifies performance bottlenecks
- **Metrics Collection**: Gathers statistics for optimization
- **Debug Logging**: Detailed query logging for troubleshooting

### CookieQueryBuilder

- **Type-Safe Construction**: Strongly typed query building
- **SQL Injection Prevention**: Parameterized queries and validation
- **Index Optimization**: Leverages database indexes for performance
- **Cross-Platform SQL**: Handles platform-specific SQL variations

### BrowserLockHandler

- **Lock Detection**: Identifies when browsers have locked databases
- **Graceful Retry**: Exponential backoff for locked resources
- **Process Detection**: Checks if browsers are running
- **Error Recovery**: Intelligent error handling and recovery

## Platform-Specific Implementations

### macOS

- **Keychain Integration**: Secure password retrieval from macOS Keychain
- **Container Access**: Safari container permission handling
- **Binary Cookie Decoder**: Custom parser for Safari's binary format

### Windows

- **DPAPI Integration**: Windows Data Protection API for Chrome/Edge
- **Registry Access**: Browser installation detection
- **Multi-Variant Support**: Firefox Developer Edition, ESR variants

### Linux

- **Keyring Support**: libsecret integration for Chrome passwords
- **XDG Compliance**: Follows XDG base directory specification
- **Fallback Mechanisms**: Hardcoded keys when keyring unavailable

## Key Components

### Core Browser Module (`src/core/browsers/`)

- **Strategy Implementations**: Browser-specific query strategies
- **SQL Utilities**: Database connection and query management
- **Platform Controls**: OS-specific browser management
- **Lock Handling**: Database lock detection and retry

### CLI Module (`src/cli/`)

- **Command Interface**: Argument parsing and validation
- **Output Handlers**: JSON, rendered, and dump formats
- **Service Layer**: Cookie query orchestration
- **Error Reporting**: User-friendly error messages

### Utilities (`src/utils/`)

- **Process Detection**: Check running browser processes
- **Platform Utils**: OS detection and path resolution
- **Date Handling**: Chrome timestamp conversion
- **Encryption**: Cookie decryption utilities
- **Error Utils**: Standardized error handling
- **JWT Validation**: Token parsing and validation

### Type Definitions (`src/types/`)

- **Zod Schemas**: Runtime validation schemas
- **TypeScript Types**: Compile-time type safety
- **Browser Types**: Browser-specific type definitions
- **API Contracts**: Public API type definitions

## Data Flow

1. **Request Initiation**
   - CLI command or API call with cookie query parameters

2. **Strategy Selection**
   - Factory creates appropriate strategy based on browser parameter
   - Falls back to composite strategy for multi-browser queries

3. **Cookie Extraction**
   - Strategy locates browser cookie database
   - Handles platform-specific encryption/decryption
   - Manages database locking and retries

4. **Query Execution**
   - SQL query built with CookieQueryBuilder
   - Connection obtained from DatabaseConnectionManager
   - Query monitored by QueryMonitor

5. **Result Processing**
   - Raw cookies transformed to ExportedCookie format
   - Metadata attached (browser, file, decryption status)
   - Results filtered and formatted

6. **Output Rendering**
   - Output handler formats results based on CLI flags
   - Results returned to user or written to stdout

## Performance Optimizations

### Database Access

- **Connection Pooling**: Reuses database connections
- **Indexed Queries**: Uses database indexes for fast lookups
- **Batch Processing**: Processes multiple profiles efficiently
- **Lazy Loading**: Only loads necessary data

### Memory Management

- **Streaming**: Processes large result sets without loading all into memory
- **Resource Cleanup**: Ensures connections and files are properly closed
- **Garbage Collection**: Efficient memory usage patterns

### Error Handling

- **Graceful Degradation**: Continues operation when individual browsers fail
- **Retry Mechanisms**: Automatic retry for transient failures
- **Detailed Logging**: Debug-level logging for troubleshooting
- **User-Friendly Errors**: Clear error messages for common issues

## Security Considerations

### Encryption Handling

- **Platform-Native**: Uses OS-provided encryption mechanisms
- **No Key Storage**: Never stores or logs encryption keys
- **Secure Memory**: Clears sensitive data after use

### Permission Model

- **Least Privilege**: Only requests necessary permissions
- **Sandboxing**: Respects browser sandbox boundaries
- **Read-Only**: Never modifies browser data

### Data Protection

- **No Network Access**: Purely local operations
- **No Data Collection**: No telemetry or analytics
- **Secure Defaults**: Safe default configurations

## Extensibility

### Adding New Browsers

1. Extend `BaseCookieQueryStrategy` or `BaseChromiumCookieQueryStrategy`
2. Implement browser-specific logic
3. Register in `CookieStrategyFactory`
4. Add tests and documentation

### Custom Output Formats

1. Implement `OutputHandler` interface
2. Register in output handler factory
3. Add CLI flag support

### Platform Extensions

1. Add platform detection in `platformUtils`
2. Implement platform-specific paths
3. Add encryption/decryption support
4. Update browser strategies

## Testing Architecture

### Unit Tests

- **Strategy Tests**: Individual browser strategy testing
- **Utility Tests**: Platform and encryption utility testing
- **Mock Implementations**: MockCookieQueryStrategy for testing

### Integration Tests

- **Database Tests**: SQLite operation testing
- **Encryption Tests**: Platform-specific encryption testing
- **CLI Tests**: Command-line interface testing

### Test Infrastructure

- **Jest Configuration**: TypeScript support via ts-jest
- **Single Worker Mode**: Prevents SQLite concurrency issues
- **Fixture Data**: Real-world cookie database samples
- **Mock Factories**: Consistent test data generation
export class SqliteError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'SqliteError';
  }

  static readonly ErrorCodes = {
    READONLY_VIOLATION: 'READONLY_VIOLATION',
    INITIALIZATION_FAILED: 'INITIALIZATION_FAILED',
    QUERY_FAILED: 'QUERY_FAILED',
    NO_ADAPTER_AVAILABLE: 'NO_ADAPTER_AVAILABLE',
  } as const;
}
/**
 * Utility functions for consistent error handling across the codebase
 * Following DRY principle to eliminate repetitive error handling patterns
 */

/**
 * Safely extract error message from unknown error types
 * @param error - Any thrown value (Error, string, unknown)
 * @returns A string representation of the error
 * @example
 * try {
 *   // some operation
 * } catch (error) {
 *   const message = getErrorMessage(error);
 *   logger.error('Operation failed', { error: message });
 * }
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (
    error !== null &&
    error !== undefined &&
    typeof error === "object" &&
    "message" in error
  ) {
    return String(error.message);
  }
  return String(error);
}

/**
 * Get detailed error information including stack trace
 * @param error - Any thrown value
 * @returns Object with error details
 */
export function getErrorDetails(error: unknown): {
  message: string;
  stack?: string;
  name?: string;
  code?: string;
} {
  const message = getErrorMessage(error);

  if (error instanceof Error) {
    const result: ReturnType<typeof getErrorDetails> = { message };
    if (error.stack !== undefined) {
      result.stack = error.stack;
    }
    if (error.name !== undefined) {
      result.name = error.name;
    }
    if ("code" in error && error.code !== undefined) {
      result.code = String(error.code);
    }
    return result;
  }

  return { message };
}

/**
 * Check if error message contains specific text (case-insensitive)
 * @param error - Any thrown value
 * @param searchText - Text to search for
 * @returns True if error message contains the text
 */
export function errorMessageContains(
  error: unknown,
  searchText: string,
): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return message.includes(searchText.toLowerCase());
}

/**
 * Error pattern constants for database error classification
 */
const DATABASE_ERROR_PATTERNS = {
  locked: ["database is locked", "database locked", "sqlite_busy"],
  busy: ["busy"],
  permission: [
    "eperm",
    "permission denied",
    "operation not permitted",
    "eacces",
  ],
  not_found: ["enoent", "no such file", "not found"],
} as const;

/**
 * Checks if a message contains any of the given patterns
 * @param message - The error message to check
 * @param patterns - Array of patterns to match against
 * @returns True if any pattern is found
 */
function containsAnyPattern(
  message: string,
  patterns: readonly string[],
): boolean {
  return patterns.some((pattern) => message.includes(pattern));
}

/**
 * Check if error is a specific type of database error
 * @param error - Any thrown value
 * @returns Type of database error or null
 */
export function getDatabaseErrorType(
  error: unknown,
): "locked" | "busy" | "permission" | "not_found" | null {
  const message = getErrorMessage(error).toLowerCase();

  if (containsAnyPattern(message, DATABASE_ERROR_PATTERNS.locked)) {
    return "locked";
  }

  if (containsAnyPattern(message, DATABASE_ERROR_PATTERNS.busy)) {
    return "busy";
  }

  if (containsAnyPattern(message, DATABASE_ERROR_PATTERNS.permission)) {
    return "permission";
  }

  if (containsAnyPattern(message, DATABASE_ERROR_PATTERNS.not_found)) {
    return "not_found";
  }

  return null;
}

/**
 * Format error for logging with consistent structure
 * @param error - Any thrown value
 * @param context - Additional context for the error
 * @returns Formatted error object for logging
 */
export function formatErrorForLogging(
  error: unknown,
  context?: Record<string, unknown>,
): Record<string, unknown> {
  const details = getErrorDetails(error);

  return {
    ...context,
    error: details.message,
    errorName: details.name,
    errorCode: details.code,
    // Only include stack in development/debug mode
    ...(process.env.NODE_ENV !== "production" &&
    details.stack !== undefined &&
    details.stack !== ""
      ? { errorStack: details.stack }
      : {}),
  };
}

/**
 * Type guard to check if value is an Error instance
 * @param error - Any value to check
 * @returns True if error is an Error instance
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Type guard to check if error has a message property
 * @param error - Any value to check
 * @returns True if error has a message property
 */
export function hasErrorMessage(error: unknown): error is { message: unknown } {
  return (
    error !== null &&
    error !== undefined &&
    typeof error === "object" &&
    "message" in error
  );
}

/**
 * Create a standardized error from unknown input
 * @param error - Any thrown value
 * @param fallbackMessage - Message to use if error can't be converted
 * @returns Error instance
 */
export function ensureError(
  error: unknown,
  fallbackMessage = "An unknown error occurred",
): Error {
  if (error instanceof Error) {
    return error;
  }

  const message = getErrorMessage(error) || fallbackMessage;
  const standardError = new Error(message);

  // Preserve original error as cause if supported
  if ("cause" in standardError) {
    standardError.cause = error;
  }

  return standardError;
}

/**
 * Wrap an async operation with consistent error handling
 * @param operation - Async function to execute
 * @param errorHandler - Function to handle errors
 * @returns Result of operation or undefined if error
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  errorHandler: (error: unknown) => void,
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    errorHandler(error);
    return undefined;
  }
}

/**
 * Retry an operation with exponential backoff
 * @param operation - Async function to execute
 * @param options - Retry options
 * @param options.maxAttempts - Maximum number of retry attempts
 * @param options.initialDelay - Initial delay in milliseconds
 * @param options.maxDelay - Maximum delay in milliseconds
 * @param options.shouldRetry - Function to determine if retry should be attempted
 * @returns Result of successful operation
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    shouldRetry?: (error: unknown) => boolean;
  } = {},
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 100,
    maxDelay = 5000,
    shouldRetry = () => true,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts || !shouldRetry(error)) {
        throw error;
      }

      const delay = Math.min(initialDelay * 2 ** (attempt - 1), maxDelay);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

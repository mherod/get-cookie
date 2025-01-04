import { type ConsolaInstance } from "consola";

import logger from "./logger";

/**
 * Helper functions for common logging patterns.
 * @module
 * @example
 * ```typescript
 * import { logOperationResult, logError } from './logHelpers';
 *
 * try {
 *   const result = await someOperation();
 *   logOperationResult('Operation', true, { data: result });
 * } catch (error) {
 *   logError('Operation failed', error);
 * }
 * ```
 */

interface OperationContext {
  [key: string]: unknown;
}

/**
 * Log the result of an operation with consistent formatting
 * @param operation - The name of the operation
 * @param success - Whether the operation was successful
 * @param context - Additional context to log
 */
export function logOperationResult(
  operation: string,
  success: boolean,
  context?: OperationContext,
): void {
  if (success) {
    logger.success(`${operation} succeeded`, context);
  } else {
    logger.error(`${operation} failed`, context);
  }
}

/**
 * Log an error with consistent formatting
 * @param message - The error message
 * @param error - The error object
 * @param context - Additional context to log
 */
export function logError(
  message: string,
  error: unknown,
  context?: OperationContext,
): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  logger.error(message, { ...context, error: errorMessage });
}

/**
 * Log a warning with consistent formatting
 * @param component - The component generating the warning
 * @param message - The warning message
 * @param context - Additional context to log
 */
export function logWarn(
  component: string,
  message: string,
  context?: OperationContext,
): void {
  logger.warn(`[${component}] ${message}`, context);
}

/**
 * Create a logger instance with a component tag
 * @param component - The component name to tag logs with
 * @returns A logger instance that prefixes all messages with the component tag
 * @example
 * ```typescript
 * const dbLogger = createTaggedLogger('Database');
 * dbLogger.info('Connection established');
 * ```
 */
export function createTaggedLogger(component: string): ConsolaInstance {
  return logger.withTag(component);
}

// Re-export the base logger for direct usage
/**
 * Re-export of the base logger for direct usage.
 */
export { default as logger } from "./logger";

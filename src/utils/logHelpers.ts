import logger from "./logger";

/**
 * Helper functions for common logging patterns
 *
 * @example
 * import { logOperationResult, logError } from './logHelpers';
 *
 * try {
 *   const result = await someOperation();
 *   logOperationResult('Operation', true, { data: result });
 * } catch (error) {
 *   logError('Operation failed', error);
 * }
 */

interface OperationContext {
  [key: string]: unknown;
}

/**
 * Logs the result of an operation with consistent formatting
 *
 * @param operation - Name of the operation
 * @param success - Whether the operation succeeded
 * @param context - Additional context about the operation
 */
export function logOperationResult(
  operation: string,
  success: boolean,
  context?: OperationContext,
): void {
  const icon = success ? "✅" : "❌";
  const message = `${icon} ${operation} ${success ? "succeeded" : "failed"}`;

  if (success) {
    logger.success(message, context);
  } else {
    logger.error(message, context);
  }
}

/**
 * Logs an error with consistent formatting and context
 *
 * @param message - Error message
 * @param error - Error object
 * @param context - Additional context
 */
export function logError(
  message: string,
  error: unknown,
  context?: OperationContext,
): void {
  const errorContext = {
    ...(context ?? {}),
    error:
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : error,
  };

  logger.error(message, errorContext);
}

/**
 * Logs debug information with consistent formatting
 *
 * @param component - Component or module name
 * @param message - Debug message
 * @param data - Debug data
 */
export function logDebug(
  component: string,
  message: string,
  data?: unknown,
): void {
  const componentLogger = logger.withTag(component);
  componentLogger.debug(message, data);
}

/**
 * Creates a tagged logger with consistent naming
 *
 * @param component - Component or module name
 * @returns Tagged logger instance
 */
export function createTaggedLogger(
  component: string,
): ReturnType<typeof logger.withTag> {
  return logger.withTag(component);
}

/**
 * Logs a warning with consistent formatting
 *
 * @param component - Component or module name
 * @param message - Warning message
 * @param context - Additional context
 */
export function logWarn(
  component: string,
  message: string,
  context?: OperationContext,
): void {
  const componentLogger = logger.withTag(component);
  componentLogger.warn(message, context);
}

// Re-export the base logger for direct usage
/**
 *
 */
export { default as logger } from "./logger";

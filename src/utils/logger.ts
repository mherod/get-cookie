import { createConsola } from "consola";

/**
 * Standard log levels and their usage:
 * - debug: Detailed information for debugging
 * - info: General operational information
 * - success: Successful operations
 * - warn: Warning conditions
 * - error: Error conditions that might still allow the app to continue
 * - fatal: Critical errors that prevent the app from continuing
 */
const consola = createConsola({
  fancy: true,
  formatOptions: {
    showLogLevel: true,
    colors: true,
    date: true,
    compact: false,
    columns: process.stdout.columns || 80,
  },
  level: process.env.LOG_LEVEL === "debug" ? 5 : 3,
});

/**
 * Configured consola logger instance with standardized formatting and colored output.
 * Used for consistent logging throughout the application.
 *
 * @example
 * // Basic usage
 * logger.info('Operation started');
 * logger.success('Task completed');
 * logger.error('Failed to process', error);
 *
 * // Tagged logging for module context
 * const moduleLogger = logger.withTag('ModuleName');
 * moduleLogger.info('Module specific log');
 *
 * // Structured logging
 * logger.info('User action', {
 *   userId: '123',
 *   action: 'login',
 *   timestamp: new Date()
 * });
 *
 * // Error logging with full context
 * logger.error('Operation failed', {
 *   error: error,
 *   context: 'operation name',
 *   input: data
 * });
 */
export default consola;

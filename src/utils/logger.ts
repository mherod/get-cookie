import { createConsola } from "consola";

const consola = createConsola({
  fancy: true,
  formatOptions: {
    showLogLevel: true,
    colors: true,
    date: false,
  },
});

/**
 * Configured consola logger instance with fancy formatting and colored output
 * Used for consistent logging throughout the application
 *
 * @example
 * // Import the logger
 * import logger from './logger';
 *
 * // Log different levels of messages
 * logger.info('Starting application...');
 * logger.success('Operation completed successfully');
 * logger.warn('Something might be wrong');
 * logger.error('An error occurred', new Error('Failed to process'));
 *
 * // Log with additional context
 * logger.info('User action:', { userId: '123', action: 'login' });
 */
export default consola;

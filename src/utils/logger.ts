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
 */
export default consola;

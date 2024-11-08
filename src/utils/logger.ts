type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private static instance: Logger;
  private verbose = false;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setVerbose(verbose: boolean): void {
    this.verbose = verbose;
  }

  debug(...args: unknown[]): void {
    if (this.verbose) {
      console.debug('DEBUG:', ...args);
    }
  }

  info(...args: unknown[]): void {
    console.log('INFO:', ...args);
  }

  warn(...args: unknown[]): void {
    console.warn('WARN:', ...args);
  }

  error(...args: unknown[]): void {
    console.error('ERROR:', ...args);
  }

  start(...args: unknown[]): void {
    this.info('→', ...args);
  }

  success(...args: unknown[]): void {
    this.info('✓', ...args);
  }

  log(...args: unknown[]): void {
    console.log(...args);
  }

  withTag(tag: string): Logger {
    return this;
  }
}

export const logger = Logger.getInstance();
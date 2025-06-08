/**
 * Custom error types for the get-cookie library
 * @module errors
 * @example
 * ```typescript
 * import { CookieExtractionError, BrowserLockError } from './errors';
 *
 * try {
 *   await queryCookies('session', 'example.com');
 * } catch (error) {
 *   if (error instanceof BrowserLockError) {
 *     console.log(`Database locked: ${error.filePath}`);
 *   } else if (error instanceof CookieExtractionError) {
 *     console.log(`Error in ${error.browser}: ${error.message}`);
 *   }
 * }
 * ```
 */

/**
 * Base error class for all cookie extraction related errors
 * @example
 * ```typescript
 * throw new CookieExtractionError(
 *   'Failed to extract cookies',
 *   'Chrome',
 *   { profilePath: '/path/to/profile' }
 * );
 * ```
 */
export class CookieExtractionError extends Error {
  /**
   *
   */
  public readonly browser: string;
  /**
   *
   */
  public readonly context: Record<string, unknown>;

  /**
   * Creates a new CookieExtractionError
   * @param message - The error message
   * @param browser - The browser where the error occurred
   * @param context - Additional context information
   */
  public constructor(
    message: string,
    browser: string,
    context: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "CookieExtractionError";
    this.browser = browser;
    this.context = context;
  }
}

/**
 * Error thrown when a browser database is locked
 * @example
 * ```typescript
 * throw new BrowserLockError(
 *   'Database is currently locked by Firefox',
 *   '/path/to/cookies.sqlite',
 *   'Firefox',
 *   { processCount: 2, suggestion: 'Close Firefox and try again' }
 * );
 * ```
 */
export class BrowserLockError extends CookieExtractionError {
  /**
   *
   */
  public readonly filePath: string;

  /**
   * Creates a new BrowserLockError
   * @param message - The error message
   * @param filePath - The path to the locked database file
   * @param browser - The browser that has the database locked
   * @param context - Additional context information
   */
  public constructor(
    message: string,
    filePath: string,
    browser: string,
    context: Record<string, unknown> = {},
  ) {
    super(message, browser, { ...context, filePath });
    this.name = "BrowserLockError";
    this.filePath = filePath;
  }
}

/**
 * Error thrown when cookie decryption fails
 * @example
 * ```typescript
 * throw new DecryptionError(
 *   'Failed to decrypt cookie value',
 *   'Chrome',
 *   'AES-128-CBC',
 *   { keySource: 'keychain', encryptedLength: 64 }
 * );
 * ```
 */
export class DecryptionError extends CookieExtractionError {
  /**
   *
   */
  public readonly encryptionType: string;

  /**
   * Creates a new DecryptionError
   * @param message - The error message
   * @param browser - The browser where decryption failed
   * @param encryptionType - The type of encryption that failed
   * @param context - Additional context information
   */
  public constructor(
    message: string,
    browser: string,
    encryptionType: string,
    context: Record<string, unknown> = {},
  ) {
    super(message, browser, { ...context, encryptionType });
    this.name = "DecryptionError";
    this.encryptionType = encryptionType;
  }
}

/**
 * Error thrown when timestamp parsing fails
 * @example
 * ```typescript
 * throw new InvalidTimestampError(
 *   'Timestamp is outside valid range',
 *   'Safari',
 *   -123456789,
 *   { min: 0, max: 1000000000 },
 *   { cookieName: 'session', domain: 'example.com' }
 * );
 * ```
 */
export class InvalidTimestampError extends CookieExtractionError {
  /**
   *
   */
  public readonly timestamp: number;
  /**
   *
   */
  public readonly expectedRange: { min: number; max: number };

  /**
   * Creates a new InvalidTimestampError
   * @param message - The error message
   * @param browser - The browser where timestamp parsing failed
   * @param timestamp - The invalid timestamp value
   * @param expectedRange - The expected range for valid timestamps
   * @param expectedRange.min - Minimum valid timestamp value
   * @param expectedRange.max - Maximum valid timestamp value
   * @param context - Additional context information
   */
  public constructor(
    message: string,
    browser: string,
    timestamp: number,
    expectedRange: { min: number; max: number },
    context: Record<string, unknown> = {},
  ) {
    super(message, browser, { ...context, timestamp, expectedRange });
    this.name = "InvalidTimestampError";
    this.timestamp = timestamp;
    this.expectedRange = expectedRange;
  }
}

/**
 * Error thrown when binary cookie parsing fails in Safari
 * @example
 * ```typescript
 * throw new BinaryParsingError(
 *   'Failed to parse binary cookie header',
 *   'Safari',
 *   0x42,
 *   { bufferLength: 1024, position: 8, expectedMagic: 0x636F6F6B }
 * );
 * ```
 */
export class BinaryParsingError extends CookieExtractionError {
  /**
   *
   */
  public readonly offset: number;

  /**
   * Creates a new BinaryParsingError
   * @param message - The error message
   * @param browser - The browser where binary parsing failed
   * @param offset - The byte offset where parsing failed
   * @param context - Additional context information
   */
  public constructor(
    message: string,
    browser: string,
    offset: number,
    context: Record<string, unknown> = {},
  ) {
    super(message, browser, { ...context, offset });
    this.name = "BinaryParsingError";
    this.offset = offset;
  }
}

/**
 * Type guard to check if an error is a CookieExtractionError
 * @param error - The error to check
 * @returns True if the error is a CookieExtractionError
 * @example
 * ```typescript
 * try {
 *   await extractCookies();
 * } catch (error) {
 *   if (isCookieExtractionError(error)) {
 *     console.log(`Browser: ${error.browser}`);
 *     console.log(`Context:`, error.context);
 *   }
 * }
 * ```
 */
export function isCookieExtractionError(
  error: unknown,
): error is CookieExtractionError {
  return error instanceof CookieExtractionError;
}

/**
 * Type guard to check if an error is a BrowserLockError
 * @param error - The error to check
 * @returns True if the error is a BrowserLockError
 * @example
 * ```typescript
 * try {
 *   await extractFirefoxCookies();
 * } catch (error) {
 *   if (isBrowserLockError(error)) {
 *     console.log(`Database locked: ${error.filePath}`);
 *     console.log(`Suggestion: Close ${error.browser} and try again`);
 *   }
 * }
 * ```
 */
export function isBrowserLockError(error: unknown): error is BrowserLockError {
  return error instanceof BrowserLockError;
}

/**
 * Type guard to check if an error is a DecryptionError
 * @param error - The error to check
 * @returns True if the error is a DecryptionError
 * @example
 * ```typescript
 * try {
 *   const decryptedValue = await decryptCookieValue(encryptedData);
 * } catch (error) {
 *   if (isDecryptionError(error)) {
 *     console.log(`Decryption failed: ${error.encryptionType}`);
 *   }
 * }
 * ```
 */
export function isDecryptionError(error: unknown): error is DecryptionError {
  return error instanceof DecryptionError;
}

/**
 * Type guard to check if an error is an InvalidTimestampError
 * @param error - The error to check
 * @returns True if the error is an InvalidTimestampError
 * @example
 * ```typescript
 * try {
 *   const expiry = parseTimestamp(rawTimestamp);
 * } catch (error) {
 *   if (isInvalidTimestampError(error)) {
 *     console.log(`Invalid timestamp: ${error.timestamp}`);
 *     console.log(`Expected range: ${error.expectedRange.min}-${error.expectedRange.max}`);
 *   }
 * }
 * ```
 */
export function isInvalidTimestampError(
  error: unknown,
): error is InvalidTimestampError {
  return error instanceof InvalidTimestampError;
}

/**
 * Type guard to check if an error is a BinaryParsingError
 * @param error - The error to check
 * @returns True if the error is a BinaryParsingError
 * @example
 * ```typescript
 * try {
 *   const cookies = parseBinaryCookies(buffer);
 * } catch (error) {
 *   if (isBinaryParsingError(error)) {
 *     console.log(`Parsing failed at offset: ${error.offset}`);
 *   }
 * }
 * ```
 */
export function isBinaryParsingError(
  error: unknown,
): error is BinaryParsingError {
  return error instanceof BinaryParsingError;
}

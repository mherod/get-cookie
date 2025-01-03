import jsonwebtoken from "jsonwebtoken";

import { parseArgv } from "./argv";
import logger from "./logger";

/**
 * Represents a JWT payload with optional standard claims
 */
export interface JwtPayload {
  exp?: number;
  iat?: number;
  sub?: string;
  [key: string]: unknown;
}

/**
 * Represents a JWT header
 */
export interface JwtHeader {
  alg: string;
  typ?: string;
  [key: string]: unknown;
}

/**
 * Result of JWT validation operations
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  decodedPayload?: JwtPayload;
  header?: JwtHeader;
}

/** @internal */
const JWT_FORMAT_REGEX = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;

/**
 * Validates if a string matches the basic JWT format
 * @param value - The value to check for JWT format
 * @returns True if the value is a valid JWT format string, false otherwise
 */
export function isJWT(value: unknown): boolean {
  if (value === null || value === undefined || typeof value !== "string") {
    return false;
  }
  return JWT_FORMAT_REGEX.test(value);
}

/**
 * Validates the basic format of a JWT token using regex pattern matching.
 * @param token - The JWT token string to validate
 * @returns The validation result indicating if the token format is valid
 */
function validateTokenFormat(token: string): ValidationResult {
  if (!JWT_FORMAT_REGEX.test(token)) {
    return {
      isValid: false,
      error:
        "Invalid JWT format - must be three dot-separated base64url-encoded strings",
    };
  }
  return { isValid: true };
}

/**
 * Verifies JWT signature using the provided secret or public key.
 * @param token - The JWT token to verify
 * @param secretOrPublicKey - The secret or public key to use for verification
 * @returns The validation result if verification fails, null if successful
 */
function verifySignature(
  token: string,
  secretOrPublicKey: string | Buffer,
): ValidationResult | null {
  try {
    jsonwebtoken.verify(token, secretOrPublicKey);
    return null;
  } catch (verifyError) {
    const error =
      verifyError instanceof Error
        ? verifyError.message
        : "Unknown verification error";
    const args = parseArgv(process.argv);
    if (args.values.verbose === true) {
      logger.debug(`JWT verification failed: ${error}`);
    }
    return { isValid: false, error };
  }
}

/**
 * Checks if a JWT token has expired based on its exp claim.
 * @param payload - The decoded JWT payload to check for expiration
 * @returns The validation result indicating if the token is expired
 */
function checkExpiration(payload: JwtPayload): ValidationResult {
  const exp = payload.exp;
  if (exp === undefined) {
    return {
      isValid: true,
      decodedPayload: payload,
    };
  }

  const now = Math.floor(Date.now() / 1000);
  return {
    isValid: now <= exp,
    error: now > exp ? "Token has expired" : undefined,
    decodedPayload: payload,
  };
}

/**
 * Internal utility for debug logging.
 * @internal
 * @param message - The debug message to log
 * @param data - Optional data to log with the message
 */
function debugLog(message: string, data?: unknown): void {
  try {
    const args = parseArgv(process.argv);
    if (args.values.verbose === true) {
      logger.debug(message, data);
    }
  } catch (_error) {
    // Ignore parsing errors in debug logging
  }
}

/**
 * Validates input token string format.
 * @internal
 * @param token - The token string to validate
 * @returns ValidationResult for invalid tokens, null for valid ones
 */
function validateTokenInput(
  token: string | null | undefined,
): ValidationResult | null {
  if (token === null || token === undefined) {
    return { isValid: false, error: "Token is null or undefined" };
  }
  if (typeof token !== "string") {
    return { isValid: false, error: "Token is not a string" };
  }
  if (token.trim().length === 0) {
    return { isValid: false, error: "Token is empty or whitespace" };
  }
  return null;
}

/**
 * Decodes and validates JWT payload.
 * @internal
 * @param token - The token to decode and validate
 * @returns ValidationResult containing decoded information or error
 */
function decodeAndValidatePayload(token: string): ValidationResult {
  const result = jsonwebtoken.decode(token, { complete: true });
  debugLog("Decoded JWT token:", result ?? "Failed to decode");

  if (!result) {
    return { isValid: false, error: "Failed to decode token" };
  }

  const validationResult = checkExpiration(result.payload as JwtPayload);
  return {
    ...validationResult,
    header: result.header as JwtHeader,
  };
}

/**
 * Validates a JWT token by checking its format, signature (if key provided), and expiration.
 * This is the main function that should be used for JWT validation.
 * @param token - The JWT token to validate
 * @param secretOrPublicKey - Optional secret or public key for signature verification
 * @returns Validation result containing success status, error message, and decoded information
 * @example
 * ```typescript
 * // Basic validation without signature verification
 * const result = validateToken('your.jwt.token');
 *
 * // Validation with signature verification
 * const result = validateToken('your.jwt.token', 'your-secret-key');
 * ```
 */
export function validateToken(
  token: string | undefined,
  secretOrPublicKey?: string | Buffer,
): ValidationResult {
  try {
    if (token === undefined) {
      const errorMessage = "Token is undefined";
      logger.debug("JWT validation error: " + errorMessage);
      return {
        isValid: false,
        error: errorMessage,
      };
    }

    const inputError = validateTokenInput(token);
    if (inputError !== null) {
      return inputError;
    }

    const formatResult = validateTokenFormat(token);
    if (!formatResult.isValid) {
      return formatResult;
    }

    if (secretOrPublicKey !== undefined) {
      const signatureResult = verifySignature(token, secretOrPublicKey);
      if (signatureResult !== null) {
        return signatureResult;
      }
    }

    return decodeAndValidatePayload(token);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Unknown error during JWT validation";
    logger.debug("JWT validation error: " + errorMessage);
    return {
      isValid: false,
      error: errorMessage,
    };
  }
}

/**
 * Decodes a JWT token without verifying its signature.
 * Use this only when you don't need to verify the token's authenticity.
 * @param token - The JWT token to decode
 * @returns The decoded payload and header, or null if decoding fails
 * @example
 * ```typescript
 * const decoded = decodeToken('your.jwt.token');
 * if (decoded) {
 *   console.log(decoded.payload.sub); // Access payload claims
 * }
 * ```
 */
export function decodeToken(
  token: string,
): { payload: JwtPayload; header: JwtHeader } | null {
  try {
    const result = jsonwebtoken.decode(token, { complete: true });
    if (!result) {
      return null;
    }
    return {
      payload: result.payload as JwtPayload,
      header: result.header as JwtHeader,
    };
  } catch {
    return null;
  }
}

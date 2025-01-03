import jsonwebtoken from "jsonwebtoken";

import { parseArgv } from "./argv";
import logger from "./logger";

interface JwtPayload {
  exp?: number;
  [key: string]: unknown;
}

interface JwtHeader {
  alg: string;
  typ?: string;
  [key: string]: unknown;
}

interface ValidationResult {
  isValid: boolean;
  error?: string;
  decodedPayload?: JwtPayload;
  header?: JwtHeader;
}

/** @internal */
const JWT_FORMAT_REGEX = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;

/**
 * Validates the basic format of a JWT token using regex pattern matching.
 * @param token - The JWT token to validate.
 * @returns The validation result indicating if the token format is valid.
 * @example
 * ```typescript
 * const result = validateTokenFormat('abc.def.ghi');
 * if (!result.isValid) {
 *   console.error(result.error);
 * }
 * ```
 */
export function validateTokenFormat(token: string): ValidationResult {
  if (!JWT_FORMAT_REGEX.test(token)) {
    return {
      isValid: false,
      error: "Invalid JWT format - must be three dot-separated base64url-encoded strings",
    };
  }
  return { isValid: true };
}

/**
 * Verifies JWT signature using the provided secret or public key.
 * @param token - The JWT token to verify.
 * @param secretOrPublicKey - The secret or public key to use for verification.
 * @returns The validation result if verification fails, null if successful.
 * @example
 * ```typescript
 * const result = verifySignature(token, 'secret-key');
 * if (result) {
 *   console.error('Signature verification failed:', result.error);
 * }
 * ```
 */
export function verifySignature(
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
 * @param payload - The decoded JWT payload to check for expiration.
 * @returns The validation result indicating if the token is expired.
 * @example
 * ```typescript
 * const payload = { exp: Math.floor(Date.now() / 1000) + 3600 };
 * const result = checkExpiration(payload);
 * if (!result.isValid) {
 *   console.error('Token expired:', result.error);
 * }
 * ```
 */
export function checkExpiration(payload: JwtPayload): ValidationResult {
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
 * @param message - Debug message to log.
 * @param [data] - Optional data to log.
 * @private
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
 * @param token - The token to validate.
 * @returns ValidationResult for invalid tokens, null for valid ones.
 */
function validateTokenInput(token: string | null | undefined): ValidationResult | null {
  if (token === null || token === undefined) {
    return { isValid: false, error: "Token is null or undefined" };
  }
  if (typeof token !== 'string') {
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
 * @param token - The token to decode.
 * @returns ValidationResult containing decoded information or error.
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
 * @param token - The JWT token to validate.
 * @param [secretOrPublicKey] - Optional secret or public key for signature verification.
 * @returns The validation result containing success status, error message, and decoded information.
 * @example
 * ```typescript
 * // Validate token without signature verification
 * const result = validateToken('your.jwt.token');
 *
 * // Validate token with signature verification
 * const result = validateToken('your.jwt.token', 'your-secret-key');
 * ```
 */
export function validateToken(
  token: string,
  secretOrPublicKey?: string | Buffer,
): ValidationResult {
  try {
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
    const errorMessage = error instanceof Error ? error.message : "Unknown error during JWT validation";
    logger.debug("JWT validation error: " + errorMessage);
    return {
      isValid: false,
      error: errorMessage,
    };
  }
}

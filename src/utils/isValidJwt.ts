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
 * Validates the basic format of a JWT token using regex pattern matching
 *
 * @param token - The JWT token to validate
 * @returns ValidationResult indicating if the token format is valid
 *
 * @example
 * ```ts
 * const result = validateTokenFormat('abc.def.ghi');
 * // Returns null (valid format)
 *
 * const invalid = validateTokenFormat('abc.def');
 * // Returns { isValid: false, error: "Invalid JWT format..." }
 * ```
 * @internal
 */
function validateTokenFormat(token: string): ValidationResult | null {
  if (!JWT_FORMAT_REGEX.test(token)) {
    return {
      isValid: false,
      error:
        "Invalid JWT format - must be three dot-separated base64url-encoded strings",
    };
  }
  return null;
}

/**
 * Verifies JWT signature using the provided secret or public key
 *
 * @param token - The JWT token to verify
 * @param secretOrPublicKey - The secret or public key to use for verification
 * @returns ValidationResult if verification fails, null if successful or no verification needed
 *
 * @example
 * ```ts
 * const result = verifySignature(token, 'secret-key');
 * // Returns null if signature is valid
 * // Returns { isValid: false, error: "invalid signature" } if invalid
 * ```
 * @internal
 */
function verifySignature(
  token: string,
  secretOrPublicKey: string | Buffer | undefined,
): ValidationResult | null {
  if (typeof secretOrPublicKey === "undefined") {
    return null;
  }

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
 * Checks if a JWT token has expired based on its exp claim
 *
 * @param payload - The decoded JWT payload to check for expiration
 * @returns ValidationResult indicating if the token is expired
 *
 * @example
 * ```ts
 * const payload = { exp: Math.floor(Date.now() / 1000) + 3600 };
 * const result = checkExpiration(payload);
 * // Returns { isValid: true, decodedPayload: payload }
 * ```
 * @internal
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
 * Internal utility for debug logging
 *
 * @param message - Debug message to log
 * @param data - Optional data to log
 * @internal
 * @private
 */
function logDebug(message: string, data?: unknown): void {
  try {
    const args = parseArgv(process.argv);
    if (args.values.verbose === true) {
      logger.debug(message, data);
    }
  } catch (_error) {
    // Ignore argv parsing errors in tests
  }
}

/**
 * Validates a JWT token by checking its format, signature (if key provided), and expiration
 *
 * @param token The JWT token to validate
 * @param secretOrPublicKey Optional secret or public key for signature verification
 * @returns An object containing validation result, any error message, and decoded information
 *
 * @example
 * ```ts
 * // Validate token without signature verification
 * const result1 = isValidJwt('eyJhbGci...token');
 * if (!result1.isValid) {
 *   console.error(result1.error);
 * }
 *
 * // Validate token with signature verification
 * const result2 = isValidJwt('eyJhbGci...token', 'secret-key');
 * if (result2.isValid) {
 *   console.log(result2.decodedPayload);
 * }
 * ```
 */
export function isValidJwt(
  token: string,
  secretOrPublicKey?: string | Buffer,
): ValidationResult {
  try {
    if (!token.trim()) {
      return { isValid: false, error: "Token is empty or whitespace" };
    }

    const formatResult = validateTokenFormat(token);
    if (formatResult) {
      return formatResult;
    }

    const signatureResult = verifySignature(token, secretOrPublicKey);
    if (signatureResult) {
      return signatureResult;
    }

    const result = jsonwebtoken.decode(token, { complete: true });
    logDebug("Decoded JWT token:", result ?? "Failed to decode");

    if (!result) {
      return { isValid: false, error: "Failed to decode token" };
    }

    const validationResult = checkExpiration(result.payload as JwtPayload);
    return {
      ...validationResult,
      header: result.header as JwtHeader,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Unknown error during JWT validation";
    logDebug(`JWT validation error: ${errorMessage}`);
    return { isValid: false, error: errorMessage };
  }
}

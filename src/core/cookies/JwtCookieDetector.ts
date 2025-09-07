import type { ExportedCookie, CookieMeta } from "../../types/schemas";
import {
  isJWT,
  decodeToken,
  validateToken,
  type JwtPayload,
  type ValidationResult,
} from "../../utils/jwt";
import { createTaggedLogger } from "../../utils/logHelpers";

const logger = createTaggedLogger("JwtCookieDetector");

/**
 * Extended metadata for cookies that contain JWT tokens
 */
export interface JwtCookieMeta extends CookieMeta {
  /** Indicates if the cookie value is a JWT */
  isJwt?: boolean;
  /** JWT validation result if the cookie contains a JWT */
  jwtValidation?: ValidationResult;
  /** Decoded JWT payload if valid */
  jwtPayload?: JwtPayload;
  /** JWT expiration date if present */
  jwtExpiry?: Date;
  /** JWT subject (sub claim) if present */
  jwtSubject?: string;
  /** JWT issuer (iss claim) if present */
  jwtIssuer?: string;
}

/**
 * Cookie with enhanced JWT metadata
 */
export interface JwtEnhancedCookie extends Omit<ExportedCookie, "meta"> {
  meta?: JwtCookieMeta;
}

/**
 * Options for JWT detection in cookies
 */
export interface JwtDetectionOptions {
  /** Whether to validate JWT signatures (requires secret key) */
  validateSignature?: boolean;
  /** Secret key for JWT signature validation */
  secretKey?: string | Buffer;
  /** Whether to check JWT expiration */
  checkExpiration?: boolean;
  /** Whether to decode JWT claims */
  decodeClaims?: boolean;
  /** Whether to log JWT detection details */
  verbose?: boolean;
}

/**
 * Detects and enhances cookies that contain JWT tokens
 * @param cookies - Array of cookies to check for JWTs
 * @param options - JWT detection options
 * @returns Array of cookies with enhanced JWT metadata
 * @example
 * ```typescript
 * const cookies = await getCookie({ name: 'auth', domain: 'example.com' });
 * const enhancedCookies = detectJwtCookies(cookies, {
 *   decodeClaims: true,
 *   checkExpiration: true
 * });
 *
 * for (const cookie of enhancedCookies) {
 *   if (cookie.meta?.isJwt) {
 *     console.log(`JWT Cookie: ${cookie.name}`);
 *     console.log(`  Subject: ${cookie.meta.jwtSubject}`);
 *     console.log(`  Expires: ${cookie.meta.jwtExpiry}`);
 *   }
 * }
 * ```
 */
export function detectJwtCookies(
  cookies: ExportedCookie[],
  options: JwtDetectionOptions = {},
): JwtEnhancedCookie[] {
  const {
    validateSignature = false,
    secretKey,
    checkExpiration = true,
    decodeClaims = true,
    verbose = false,
  } = options;

  return cookies.map((cookie) => {
    // Skip if value is not a string or doesn't look like a JWT
    if (typeof cookie.value !== "string" || !isJWT(cookie.value)) {
      return cookie as JwtEnhancedCookie;
    }

    if (verbose) {
      logger.info(`Detected JWT in cookie: ${cookie.name}`);
    }

    // Create enhanced metadata
    const jwtMeta: JwtCookieMeta = {
      ...cookie.meta,
      isJwt: true,
    };

    // Validate or decode the JWT
    if (validateSignature && secretKey) {
      const validation = validateToken(cookie.value, secretKey);
      jwtMeta.jwtValidation = validation;

      if (validation.isValid && validation.decodedPayload) {
        enrichJwtMetadata(
          jwtMeta,
          validation.decodedPayload,
          checkExpiration,
          verbose,
        );
      } else if (verbose) {
        logger.warn(
          `JWT validation failed for cookie ${cookie.name}: ${validation.error}`,
        );
      }
    } else if (decodeClaims) {
      // Just decode without validation
      const decoded = decodeToken(cookie.value);
      if (decoded) {
        jwtMeta.jwtValidation = {
          isValid: true,
          decodedPayload: decoded.payload,
          header: decoded.header,
        };
        enrichJwtMetadata(jwtMeta, decoded.payload, checkExpiration, verbose);
      }
    }

    return {
      ...cookie,
      meta: jwtMeta,
    };
  });
}

/**
 * Enriches JWT metadata with decoded claims
 * @internal
 */
function enrichJwtMetadata(
  meta: JwtCookieMeta,
  payload: JwtPayload,
  checkExpiration: boolean,
  verbose: boolean,
): void {
  meta.jwtPayload = payload;

  // Extract common JWT claims
  if (payload.sub) {
    meta.jwtSubject = payload.sub;
  }

  if (payload.iss && typeof payload.iss === "string") {
    meta.jwtIssuer = payload.iss;
  }

  // Handle expiration
  if (payload.exp) {
    meta.jwtExpiry = new Date(payload.exp * 1000);

    if (checkExpiration) {
      const now = new Date();
      if (meta.jwtExpiry < now) {
        meta.jwtValidation = {
          ...meta.jwtValidation,
          isValid: false,
          error: "JWT has expired",
        };

        if (verbose) {
          logger.warn(
            `JWT in cookie has expired (exp: ${meta.jwtExpiry.toISOString()})`,
          );
        }
      }
    }
  }
}

/**
 * Filters cookies to only include those containing valid JWTs
 * @param cookies - Array of cookies to filter
 * @param options - JWT detection options
 * @returns Array of cookies that contain valid JWTs
 * @example
 * ```typescript
 * const allCookies = await getCookie({ domain: 'example.com' });
 * const jwtCookies = filterJwtCookies(allCookies);
 * console.log(`Found ${jwtCookies.length} JWT cookies`);
 * ```
 */
export function filterJwtCookies(
  cookies: ExportedCookie[],
  options: JwtDetectionOptions = {},
): JwtEnhancedCookie[] {
  const enhanced = detectJwtCookies(cookies, options);
  return enhanced.filter(
    (cookie) =>
      cookie.meta?.isJwt &&
      (!cookie.meta.jwtValidation || cookie.meta.jwtValidation.isValid),
  );
}

/**
 * Groups cookies by JWT validity status
 * @param cookies - Array of cookies to group
 * @param options - JWT detection options
 * @returns Object with grouped cookies
 * @example
 * ```typescript
 * const cookies = await getCookie({ domain: 'api.example.com' });
 * const grouped = groupCookiesByJwtStatus(cookies);
 *
 * console.log(`Valid JWTs: ${grouped.validJwts.length}`);
 * console.log(`Invalid JWTs: ${grouped.invalidJwts.length}`);
 * console.log(`Non-JWT cookies: ${grouped.nonJwts.length}`);
 * ```
 */
export function groupCookiesByJwtStatus(
  cookies: ExportedCookie[],
  options: JwtDetectionOptions = {},
): {
  validJwts: JwtEnhancedCookie[];
  invalidJwts: JwtEnhancedCookie[];
  nonJwts: JwtEnhancedCookie[];
} {
  const enhanced = detectJwtCookies(cookies, options);

  const validJwts: JwtEnhancedCookie[] = [];
  const invalidJwts: JwtEnhancedCookie[] = [];
  const nonJwts: JwtEnhancedCookie[] = [];

  for (const cookie of enhanced) {
    if (!cookie.meta?.isJwt) {
      nonJwts.push(cookie);
    } else if (cookie.meta.jwtValidation?.isValid) {
      validJwts.push(cookie);
    } else {
      invalidJwts.push(cookie);
    }
  }

  return { validJwts, invalidJwts, nonJwts };
}

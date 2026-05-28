import type { z } from "zod";

/**
 * Represents a successful parse result from Zod
 * @example
 */
export type SafeParseSuccess<T> = { success: true; data: T };

/**
 * Represents a failed parse result from Zod
 * @example
 */
export type SafeParseError = { success: false; error: z.ZodError };

/**
 * Represents either a successful or failed parse result from Zod
 * @example
 */
export type SafeParseResult<T> = SafeParseSuccess<T> | SafeParseError;

import { z } from "zod";

/**
 * Represents a successful parse result from Zod
 */
export type SafeParseSuccess<T> = { success: true; data: T };

/**
 * Represents a failed parse result from Zod
 */
export type SafeParseError = { success: false; error: z.ZodError };

/**
 * Represents either a successful or failed parse result from Zod
 */
export type SafeParseResult<T> = SafeParseSuccess<T> | SafeParseError;

/**
 * Type guard to check if a parse result is successful
 * @param result - The parse result to check
 * @returns True if the result is a successful parse, false otherwise
 */
export function isParseSuccess<T>(result: SafeParseResult<T>): result is SafeParseSuccess<T> {
  return result.success;
}

/**
 * Type guard to check if a parse result is an error
 * @param result - The parse result to check
 * @returns True if the result is a parse error, false otherwise
 */
export function isParseError<T>(result: SafeParseResult<T>): result is SafeParseError {
  return !result.success;
}

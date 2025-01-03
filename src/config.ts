import { config } from "dotenv";
import { z } from "zod";

// Load environment variables from .env file
config();

const EnvironmentSchema = z.object({
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  HOME: z
    .string()
    .optional()
    .transform((val) => val ?? process.env.USERPROFILE ?? "")
    .pipe(z.string().min(1)),
});

/**
 * Validated environment variables with type safety and fallbacks
 * @example
 * // Using the environment variables
 * if (env.LOG_LEVEL === "debug") {
 *   console.log("Debug mode enabled");
 * }
 *
 * // Accessing home directory
 * const cookiePath = join(env.HOME, "Library/Cookies");
 */
export const env = EnvironmentSchema.parse({
  LOG_LEVEL: process.env.LOG_LEVEL,
  HOME: process.env.HOME,
});

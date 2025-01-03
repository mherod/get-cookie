import { config } from "dotenv";
import { z } from "zod";

// Load environment variables from .env file
config();

const envSchema = z.object({
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  HOME: z.string().min(1),
});

/**
 * Validated environment variables with type safety
 * @example
 * // Using the environment variables
 * if (env.LOG_LEVEL === "debug") {
 *   console.log("Debug mode enabled");
 * }
 *
 * // Accessing home directory
 * const cookiePath = join(env.HOME, "Library/Cookies");
 */
export const env = envSchema.parse({
  LOG_LEVEL: process.env.LOG_LEVEL,
  HOME: process.env.HOME,
});

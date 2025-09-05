import { platform as osPlatform } from "node:os";

/**
 * Supported platform types
 */
export type Platform = "darwin" | "win32" | "linux" | "unknown";

/**
 * Get the current platform in a normalized format
 * @returns The current platform
 */
export function getPlatform(): Platform {
  const p = osPlatform();
  switch (p) {
    case "darwin":
    case "win32":
    case "linux":
      return p;
    default:
      return "unknown";
  }
}

/**
 * Check if the current platform is macOS
 * @returns True if running on macOS
 */
export function isMacOS(): boolean {
  return getPlatform() === "darwin";
}

/**
 * Check if the current platform is Windows
 * @returns True if running on Windows
 */
export function isWindows(): boolean {
  return getPlatform() === "win32";
}

/**
 * Check if the current platform is Linux
 * @returns True if running on Linux
 */
export function isLinux(): boolean {
  return getPlatform() === "linux";
}

/**
 * Check if the current platform is Unix-like (macOS or Linux)
 * @returns True if running on a Unix-like system
 */
export function isUnixLike(): boolean {
  const p = getPlatform();
  return p === "darwin" || p === "linux";
}

/**
 * Check if the current platform is supported
 * @returns True if the platform is supported
 */
export function isPlatformSupported(): boolean {
  return getPlatform() !== "unknown";
}

/**
 * Get a human-readable platform name
 * @returns A human-readable platform name
 */
export function getPlatformDisplayName(): string {
  switch (getPlatform()) {
    case "darwin":
      return "macOS";
    case "win32":
      return "Windows";
    case "linux":
      return "Linux";
    default:
      return "Unknown Platform";
  }
}

/**
 * Throw an error if the current platform is not supported
 * @throws Error if platform is not supported
 */
export function assertPlatformSupported(): void {
  if (!isPlatformSupported()) {
    throw new Error(
      `Platform ${osPlatform()} is not supported. Supported platforms: macOS, Windows, Linux`,
    );
  }
}

/**
 * Get platform-specific path separator
 * @returns The path separator for the current platform
 */
export function getPathSeparator(): string {
  return isWindows() ? "\\" : "/";
}

/**
 * Get platform-specific executable extension
 * @returns The executable extension for the current platform
 */
export function getExecutableExtension(): string {
  return isWindows() ? ".exe" : "";
}

/**
 * Check if a given platform string matches the current platform
 * @param platformToCheck - The platform to check against
 * @returns True if the platform matches
 */
export function isPlatform(platformToCheck: string): boolean {
  return osPlatform() === platformToCheck;
}

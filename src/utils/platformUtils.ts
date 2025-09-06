import { platform as osPlatform } from "node:os";

/**
 * Cache for platform value
 */
let platformCache: string | undefined;

/**
 * Clear the platform cache (for testing)
 * @internal
 */
export function clearPlatformCache(): void {
  platformCache = undefined;
}

/**
 * Supported platform types
 */
export type Platform = "darwin" | "win32" | "linux";

/**
 * Get the current platform (with caching)
 * @returns The current platform from os.platform()
 */
export function getPlatform(): string {
  platformCache ??= osPlatform();
  return platformCache;
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
 * Check if the current platform is Unix-like (macOS, Linux, FreeBSD, etc.)
 * @returns True if running on a Unix-like system
 */
export function isUnixLike(): boolean {
  const p = getPlatform();
  return p !== "win32";
}

/**
 * Check if the current platform is supported
 * @returns True if the platform is supported
 */
export function isPlatformSupported(): boolean {
  const p = getPlatform();
  return p === "darwin" || p === "win32" || p === "linux";
}

/**
 * Get a human-readable platform name
 * @returns A human-readable platform name
 */
export function getPlatformDisplayName(): string {
  const platform = getPlatform();
  switch (platform) {
    case "darwin":
      return "macOS";
    case "win32":
      return "Windows";
    case "linux":
      return "Linux";
    default:
      return platform;
  }
}

/**
 * Throw an error if the current platform is not supported
 * @throws Error if platform is not supported
 */
export function assertPlatformSupported(): void {
  if (!isPlatformSupported()) {
    throw new Error(
      `Unsupported platform: ${getPlatform()}. Supported platforms are: darwin, win32, linux`,
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
 * Check if the current platform matches any of the specified platforms
 * @param platforms - Platform or platforms to check against current platform
 * @returns True if the current platform matches any of the specified platforms
 */
export function isPlatform(...platforms: string[]): boolean {
  const current = osPlatform();
  return platforms.includes(current);
}

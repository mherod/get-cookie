import { dirname, join } from "node:path";

import { fileExists, readTextFile } from "../runtime/FileSystemAdapter";

/**
 * Represents a Firefox Multi-Account Container definition.
 */
export interface FirefoxContainer {
  userContextId: number;
  name: string;
  icon?: string;
  color?: string;
}

/**
 * Schema for Firefox containers.json configuration file.
 */
export interface FirefoxContainersConfig {
  identities?: FirefoxContainer[];
  /** Legacy input supported for compatibility. */
  containers?: FirefoxContainer[];
  [key: string]: unknown;
}

/**
 * Extracts the userContextId number from a Firefox originAttributes string.
 * Format is typically "^userContextId=2" or "^userContextId=2&geckoView.appId=1"
 * @param originAttributes - The originAttributes string from moz_cookies
 * @returns The extracted userContextId number or undefined if not present
 */
export function extractUserContextId(
  originAttributes?: string | null,
): number | undefined {
  if (!originAttributes) {
    return undefined;
  }
  const match = originAttributes.match(/userContextId=(\d+)/);
  if (match?.[1]) {
    return Number.parseInt(match[1], 10);
  }
  return undefined;
}

/**
 * Parses a Firefox containers.json file and returns a map of container names (lowercased) to userContextIds.
 * @param filePath - Path to containers.json file
 * @returns Map of lowercased container names to userContextIds
 */
export function parseFirefoxContainersJson(
  filePath: string,
): Map<string, number> {
  const containerMap = new Map<string, number>();

  if (!fileExists(filePath)) {
    return containerMap;
  }

  try {
    const content = readTextFile(filePath);
    const parsed = JSON.parse(content) as FirefoxContainersConfig;
    const definitions = parsed.identities ?? parsed.containers;
    if (Array.isArray(definitions)) {
      for (const container of definitions) {
        if (
          typeof container.name === "string" &&
          typeof container.userContextId === "number"
        ) {
          containerMap.set(
            container.name.toLowerCase(),
            container.userContextId,
          );
        }
      }
    }
  } catch (_error) {
    // Return empty map on invalid JSON or read errors
  }

  return containerMap;
}

/**
 * Resolves a container selector (name, ID string, or "none") to a numeric userContextId or "none".
 * @param selector - Container selector (name, id string, or "none")
 * @param cookieFilePath - Path to cookies.sqlite file (used to find containers.json)
 * @returns Resolved userContextId number or "none"
 * @throws Error if container name cannot be resolved
 */
export function resolveFirefoxContainer(
  selector: string | number,
  cookieFilePath?: string,
): number | "none" {
  if (typeof selector === "number") {
    return selector;
  }

  const strSelector = String(selector).trim();
  if (strSelector.toLowerCase() === "none") {
    return "none";
  }

  if (/^\d+$/.test(strSelector)) {
    return Number.parseInt(strSelector, 10);
  }

  if (cookieFilePath) {
    const containersJsonPath = join(dirname(cookieFilePath), "containers.json");
    const containerMap = parseFirefoxContainersJson(containersJsonPath);
    const resolvedId = containerMap.get(strSelector.toLowerCase());

    if (resolvedId !== undefined) {
      return resolvedId;
    }
  }

  throw new Error(`Unknown Firefox container: '${selector}'`);
}

import { existsSync } from "fs";

import consola from "consola";
import { sync } from "fast-glob";

import { parseArgv } from "./argv";

type FindFilesOptions = {
  path: string;
  name: string;
  maxDepth?: number;
};

/**
 * Finds all files matching the specified name within a given path and depth.
 * @param options - The options for finding files.
 * @param options.path - The path to search within.
 * @param options.name - The name of the files to search for.
 * @param [options.maxDepth] - The maximum depth to search within.
 * @returns An array of file paths that match the search criteria.
 * @throws Will throw an error if the specified path does not exist.
 */
export function findAllFiles({
  path,
  name,
  maxDepth = 2,
}: FindFilesOptions): string[] {
  if (!existsSync(path)) {
    throw new Error(`Path ${path} does not exist`);
  }

  const args = parseArgv(process.argv);
  if (args.values.verbose === true) {
    consola.start(`Searching for ${name} files in ${path}`);
  }

  const files: string[] = sync(`${path}/**/${name}`, {
    onlyFiles: true,
    deep: maxDepth,
  });

  if (args.values.verbose === true) {
    if (files.length > 0) {
      consola.success(`Found ${files.length} ${name} files`);
      consola.info(files);
    }
  }

  return files;
}

import { existsSync } from "fs";
import { parsedArgs } from "./argv";
import consola from "consola";
import { sync } from "fast-glob";

type FindFilesOptions = {
  path: string;
  name: string;
  maxDepth?: number;
};

export function findAllFiles({
  path,
  name,
  maxDepth = 2,
}: FindFilesOptions): string[] {
  if (!existsSync(path)) {
    throw new Error(`Path ${path} does not exist`);
  }

  if (parsedArgs.verbose) {
    consola.start(`Searching for ${name} files in ${path}`);
  }

  const files: string[] = sync(`${path}/**/${name}`, {
    onlyFiles: true,
    deep: maxDepth,
  });

  if (parsedArgs.verbose) {
    if (files.length > 0) {
      consola.success(`Found ${files.length} ${name} files`);
      consola.info(files);
    }
  }

  return files;
}

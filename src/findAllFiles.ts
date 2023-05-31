import * as fs from "fs";
import { readdir } from "fs/promises";
import { parsedArgs } from "./argv";
import consola from "consola";

export async function findAllFiles({
  path,
  name,
  maxDepth = 2,
}: //
{
  path: string;
  name: string;
  maxDepth?: number;
}): //
Promise<string[]> {
  const rootSegments = path.split("/").length;
  const files: string[] = [];
  let readdirSync;
  try {
    readdirSync = await readdir(path);
  } catch (e) {
    if (parsedArgs.verbose) {
      consola.error(`Error reading ${path}`, e);
    }
    return [];
  }
  for (const file of readdirSync) {
    const filePath = path + "/" + file;
    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch (e) {
      if (parsedArgs.verbose) {
        consola.error(`Error getting stat for ${filePath}`, e);
      }
      continue;
    }
    if (stat.isDirectory()) {
      if (filePath.split("/").length < rootSegments + maxDepth) {
        try {
          const subFiles = await findAllFiles({
            path: filePath,
            name: name,
            maxDepth: 2,
          });
          files.push(...subFiles);
        } catch (e) {
          if (parsedArgs.verbose) {
            consola.error(e);
          }
        }
      }
    } else if (file === name) {
      files.push(filePath);
    }
  }
  if (parsedArgs.verbose) {
    if (files.length > 0) {
      consola.log(`Found ${files.length} ${name} files`);
      consola.log(files);
    }
  }
  return files;
}

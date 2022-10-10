import { env } from "./global";
import * as fs from "fs";

export async function findAllFiles({
  path,
  name,
  maxDepth = 2,
}: //
{
  path: string;
  name: string;
  maxDepth?: number;
}): Promise<string[]> {
  const rootSegments = path.split("/").length;

  if (env.VERBOSE) {
    console.log(`Searching for ${name} in ${path}`);
  }
  const files: string[] = [];
  let readdirSync;
  try {
    readdirSync = fs.readdirSync(path);
  } catch (e) {
    if (env.VERBOSE) {
      console.log(`Error reading ${path}`, e);
    }
    return [];
  }
  for (const file of readdirSync) {
    const filePath = path + "/" + file;
    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch (e) {
      if (env.VERBOSE) {
        console.error(`Error getting stat for ${filePath}`, e);
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
          if (env.VERBOSE) {
            console.error(e);
          }
        }
      }
    } else if (file === name) {
      files.push(filePath);
    }
  }
  if (env.VERBOSE) {
    if (files.length > 0) {
      console.log(`Found ${files.length} ${name} files`);
      console.log(files);
    }
  }
  return files;
}

//#!/usr/bin/env bun run

import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import consola from "consola";
import { sync } from "fast-glob";
import { groupBy, orderBy } from "lodash";
import prettier from "prettier";

async function main() {
  // find all ts files in src and build indexes

  const files = sync("src/**/*.ts", {
    dot: true,
    onlyFiles: true,
    ignore: [
      "**/index.ts",
      "**/*.d.ts",
      "**/*.test.{ts,tsx}",
      "**/*.spec.{ts,tsx}",
      "**/*.stories.tsx",
    ],
    //
  });

  // group files by directory
  const groups = groupBy(files, (file: string) => {
    const parts = file.split("/");
    parts.pop();
    return parts.join("/");
  });
  // order by depth, so that we build indexes for subdirectories first
  const dirs = orderBy(
    Object.keys(groups),
    (dir) => dir.split("/").length,
    //
  );

  // build index for each directory
  for (const dir of dirs) {
    consola.info(`building index for ${dir}`);
    const files = groups[dir].filter((file: string) => file.match(/\.ts$/));
    const indexes = files
      .map((file: string) => {
        const content = readFileSync(file, "utf-8").split("\n");
        if (!content.some((line) => line.trim().startsWith("export"))) {
          // if none of the lines in the file start with an export, then we should not include it in the index
          return "";
        }
        const name = path
          .relative(dir, file) //
          .replace(/\.ts$/, ""); //
        return `export * from './${name}';`;
      })
      .filter(Boolean)
      .sort();

    // then find subdirectories and build index for them

    const subIndex = sync(`${dir}/*/index.ts`, {
      dot: true,
      onlyFiles: true,
      //
    });

    if (subIndex.length > 0) {
      indexes.push(
        ...subIndex.map((file: string) => {
          const name = path
            .relative(dir, file) //
            .replace(/\/index\.ts$/, ""); //
          return `export * from './${name}';`;
        }),
      );
    }

    const index = indexes.join("\n");

    // const indexFile = `${dir}/index.ts`
    const indexFile = path.join(dir, "index.ts");

    const output = await prettier.format(index, { parser: "babel" });

    if (existsSync(indexFile)) {
      const existingContent = readFileSync(indexFile, "utf8");
      if (existingContent === output) {
        continue;
      }
      const lines = existingContent.split("\n");
      if (lines.every((line) => line.startsWith("export * from")) == false) {
        // if the existing index file is not an export index, then we should not overwrite it
        continue;
      }
    }

    if (output.length > 0) {
      console.log(`writing ${dir}/index.ts`, output.length);

      writeFileSync(
        indexFile,
        output,
        //
      );
    }
  }
}

main().catch(consola.error);

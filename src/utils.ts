// noinspection JSUnusedGlobalSymbols

import {exec, ExecException} from "child_process";

export async function execSimple(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(
      command,
      { encoding: "binary", maxBuffer: 5 * 1024 },
      (error: ExecException | null, stdout: string, stderr: string) => {
        if (error) {
          reject(error);
          return;
        }
        if (stderr) {
          reject(error);
          return;
        }
        if (stdout) {
          resolve(stdout.trim());
        }
      }
    );
  });
}

/**
 *
 * @param result
 * @returns {string|null}
 */
export function toStringOrNull(result: any) {
  if (result == null) {
    return null;
  }
  if (process.env.VERBOSE) {
    console.log("result", result);
  }
  if (typeof result === "string" && result.length > 0) {
    return result;
  }
  if (result.slice && result.toString) {
    // noinspection JSCheckFunctionSignatures
    return result.toString("utf8");
  }
  return null;
}

export function invalidString(input: any): boolean {
  return typeof input !== "string" || input.length === 0;
}


export function validString(input: any): input is string {
  return typeof input == "string" && input.length > 0;
}

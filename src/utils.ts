// noinspection JSUnusedGlobalSymbols

import {exec, ExecException} from "child_process";

export async function execSimple(command: string): Promise<string> {
  if (process.env.VERBOSE) {
    console.log(command);
  }
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

// export async function execAsBuffer(command: string) {
//   if (process.env.VERBOSE) {
//     console.log(command);
//   }
//   return await new Promise((resolve, reject) => {
//     exec(
//       command,
//       { encoding: "binary", maxBuffer: 5 * 1024 },
//       (error: ExecException | null, stdout: string, stderr: string) => {
//         if (error) {
//           reject(error);
//           return;
//         }
//         if (stderr) {
//           reject(error);
//           return;
//         }
//         let stdoutAsBuffer: string = stdout;
//         if (typeof stdoutAsBuffer === "string" && stdoutAsBuffer.length > 0) {
//           // noinspection JSCheckFunctionSignatures
//           stdoutAsBuffer = Buffer.from(stdoutAsBuffer, "binary").slice(0, -1);
//         }
//         if (stdoutAsBuffer && stdoutAsBuffer.length > 0) {
//           resolve(stdoutAsBuffer);
//         }
//       }
//     );
//   });
// }

// @ts-ignore
export function toStringValue(r: any): string {
  if (process.env.VERBOSE) {
    console.log("Printing value", r);
  }
  if (r) {
    if (typeof r === "string") {
      return r;
    } else if (r.toString) {
      // noinspection JSCheckFunctionSignatures
      return r.toString("utf8");
    }
  }
}

export function printStringValue(r: any) {
  if (process.env.VERBOSE) {
    console.log("Printing value", r);
  }
  if (r) {
    if (typeof r === "string") {
      console.log(r);
    } else if (r.toString) {
      // noinspection JSCheckFunctionSignatures
      console.log(r.toString("utf8"));
    }
  }
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

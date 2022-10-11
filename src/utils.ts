// noinspection JSUnusedGlobalSymbols

import { exec, ExecException } from "child_process";

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

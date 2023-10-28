import { execSync } from "child_process";

export async function execSimple(command: string): Promise<string> {
  try {
    const stdout = execSync(command, {
      encoding: "binary",
      maxBuffer: 5 * 1024,
    });
    return stdout.trim();
  } catch (error) {
    throw error;
  }
}

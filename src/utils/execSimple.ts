// External imports
import { exec, ExecOptions } from "child_process";
import { promisify } from "util";

// Internal imports
import { logError } from "./logHelpers";

const execPromise = promisify(exec);

/**
 * Custom error class for command execution failures.
 * @property {string} command - The command that failed to execute
 * @property {Error} [originalError] - The underlying error that caused the failure
 * @throws CommandExecutionError Always throws with appropriate error context
 * @example
 * ```typescript
 * throw new CommandExecutionError(
 *   'Command timed out',
 *   'git status',
 *   originalError
 * );
 * ```
 */
class CommandExecutionError extends Error {
  public constructor(
    message: string,
    public readonly command: string,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = "CommandExecutionError";
  }
}

/**
 * Executes a shell command and returns its output.
 * @param command - The command to execute
 * @param options - Optional execution options
 * @returns Promise resolving to command output
 * @throws CommandExecutionError if execution fails
 * @example
 * ```typescript
 * try {
 *   const { stdout } = await execSimple('git status');
 *   logger.info('Git status:', stdout);
 * } catch (error) {
 *   if (error instanceof CommandExecutionError) {
 *     logger.error('Git command failed:', error.message);
 *   }
 * }
 * ```
 */
export async function execSimple(
  command: string,
  options?: ExecOptions,
): Promise<{ stdout: string; stderr: string }> {
  try {
    const result = await execPromise(command, {
      ...options,
      encoding: "utf8",
    });
    return {
      stdout: result.stdout.toString(),
      stderr: result.stderr.toString(),
    };
  } catch (error) {
    logError("Command execution failed", error, { command });
    throw new CommandExecutionError(
      error instanceof Error ? error.message : String(error),
      command,
      error instanceof Error ? error : undefined,
    );
  }
}

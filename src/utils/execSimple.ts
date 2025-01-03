// External imports
import { exec, ExecOptions } from "child_process";
import { promisify } from "util";

// Internal imports
import logger from "@utils/logger";

const consola = logger.withTag("execSimple");
const execPromise = promisify(exec);

/**
 * Custom error class for command execution failures
 */
class CommandExecutionError extends Error {
  public constructor(
    message: string,
    public readonly command: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'CommandExecutionError';
  }
}

/**
 * Handles execution errors and throws appropriate CommandExecutionError
 * @param error The error that occurred during command execution
 * @param command The command that was being executed when the error occurred
 * @throws CommandExecutionError Always throws with appropriate error context
 */
function handleExecutionError(error: unknown, command: string): never {
  if (error instanceof CommandExecutionError) {
    consola.error(`Command execution failed: ${error.message}`, {
      command: error.command,
      originalError: error.originalError
    });
    throw error;
  }

  if (error instanceof Error) {
    const commandError = new CommandExecutionError(
      error.message,
      command,
      error
    );
    consola.error(`Failed to execute command`, {
      error: error.message,
      command,
      stack: error.stack,
    });
    throw commandError;
  }

  // Handle unknown error types
  const commandError = new CommandExecutionError(
    'Unknown error occurred during command execution',
    command
  );
  consola.error(`Failed to execute command`, {
    error,
    command
  });
  throw commandError;
}

/**
 * Executes a shell command asynchronously and returns its output as a string
 * @param command The shell command to execute
 * @param options Optional execution options that override the defaults
 * @returns A promise that resolves to the trimmed command output
 * @throws CommandExecutionError if the command returns an empty result, times out, or fails to execute
 */
export async function execSimple(
  command: string,
  options: Partial<ExecOptions> = {}
): Promise<string> {
  if (!command || typeof command !== 'string') {
    throw new CommandExecutionError('Command must be a non-empty string', command);
  }

  const defaultOptions = {
    encoding: "utf8" as BufferEncoding,
    maxBuffer: 5 * 1024 * 1024, // 5MB buffer
    timeout: 30000, // 30 second timeout
  };

  try {
    const { stdout, stderr } = await execPromise(command, {
      ...defaultOptions,
      ...options,
    });
    const result = stdout.trim();

    if (!result) {
      if (stderr) {
        throw new CommandExecutionError(
          `Command failed with stderr: ${stderr}`,
          command
        );
      }
      throw new CommandExecutionError('Command returned empty result', command);
    }

    return result;
  } catch (error) {
    handleExecutionError(error, command);
  }
}

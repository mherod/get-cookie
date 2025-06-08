import { DefaultOutputHandler } from "./DefaultOutputHandler";
import { DumpOutputHandler } from "./DumpOutputHandler";
import { GroupedDumpOutputHandler } from "./GroupedDumpOutputHandler";
import { GroupedRenderOutputHandler } from "./GroupedRenderOutputHandler";
import { JsonOutputHandler } from "./JsonOutputHandler";
import { RenderOutputHandler } from "./RenderOutputHandler";
import type { OutputHandler, ParsedArgs } from "./types";

/**
 * Factory for creating appropriate output handlers based on command-line arguments
 * @example
 * ```typescript
 * const factory = new OutputHandlerFactory();
 *
 * // Get JSON output handler
 * const jsonHandler = factory.getHandler({ output: 'json' });
 *
 * // Get dump output handler
 * const dumpHandler = factory.getHandler({ dump: true });
 *
 * // Get default handler when no matching handler found
 * const defaultHandler = factory.getHandler({});
 * ```
 */
export class OutputHandlerFactory {
  private handlers: OutputHandler[];
  private readonly validOutputFormats = ["json"] as const;

  /**
   * Initializes the factory with all available output handlers
   * @example
   * ```typescript
   * const factory = new OutputHandlerFactory();
   * // Factory is initialized with:
   * // - DumpOutputHandler
   * // - GroupedDumpOutputHandler
   * // - RenderOutputHandler
   * // - GroupedRenderOutputHandler
   * // - JsonOutputHandler
   * // - DefaultOutputHandler
   * ```
   */
  public constructor() {
    this.handlers = [
      new DumpOutputHandler(),
      new GroupedDumpOutputHandler(),
      new RenderOutputHandler(),
      new GroupedRenderOutputHandler(),
      new JsonOutputHandler(),
      new DefaultOutputHandler(),
    ];
  }

  /**
   * Validates the output format specified in arguments
   * @param args - The parsed command line arguments
   * @throws Error if an invalid output format is specified
   * @example
   * ```typescript
   * const factory = new OutputHandlerFactory();
   *
   * // Valid format - no error
   * factory.validateOutputFormat({ output: 'json' });
   *
   * // Invalid format - throws error
   * try {
   *   factory.validateOutputFormat({ output: 'invalid' });
   * } catch (error) {
   *   console.error('Invalid output format'); // Error thrown
   * }
   * ```
   */
  private validateOutputFormat(args: ParsedArgs): void {
    if (
      args.output !== undefined &&
      !this.validOutputFormats.includes(
        args.output as (typeof this.validOutputFormats)[number],
      )
    ) {
      const validFormats = this.validOutputFormats.join(", ");
      throw new Error(
        `Invalid output format: '${args.output}'. Valid formats are: ${validFormats}`,
      );
    }
  }

  /**
   * Returns the first handler that can handle the given arguments
   * @param args - The parsed command line arguments
   * @returns The first handler that can handle the arguments, or DefaultOutputHandler if none found
   * @throws Error if an invalid output format is specified
   * @example
   * ```typescript
   * const factory = new OutputHandlerFactory();
   *
   * // Get JSON handler
   * const jsonHandler = factory.getHandler({ output: 'json' });
   *
   * // Get grouped render handler
   * const groupedHandler = factory.getHandler({ 'render-grouped': true });
   *
   * // Get dump handler
   * const dumpHandler = factory.getHandler({ dump: true });
   *
   * // Get default handler when no specific format requested
   * const defaultHandler = factory.getHandler({});
   * ```
   */
  public getHandler(args: ParsedArgs): OutputHandler {
    this.validateOutputFormat(args);

    return (
      this.handlers.find((handler) => handler.canHandle(args)) ??
      new DefaultOutputHandler()
    );
  }
}

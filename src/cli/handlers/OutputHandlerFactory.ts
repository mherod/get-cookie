import { DefaultOutputHandler } from "./DefaultOutputHandler";
import { DumpOutputHandler } from "./DumpOutputHandler";
import { GroupedDumpOutputHandler } from "./GroupedDumpOutputHandler";
import { GroupedRenderOutputHandler } from "./GroupedRenderOutputHandler";
import { JsonOutputHandler } from "./JsonOutputHandler";
import { RenderOutputHandler } from "./RenderOutputHandler";
import { OutputHandler, ParsedArgs } from "./types";

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
   * Returns the first handler that can handle the given arguments
   * @param args - The parsed command line arguments
   * @returns The first handler that can handle the arguments, or DefaultOutputHandler if none found
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
    return (
      this.handlers.find((handler) => handler.canHandle(args)) ??
      new DefaultOutputHandler()
    );
  }
}

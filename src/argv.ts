import minimist from "minimist";
import { merge } from "lodash";

export interface MyParsedArgs extends minimist.ParsedArgs {
  verbose: boolean;
  render?: string;
  fetch?: string;
  cs?: string;
  dump?: string;
  "dump-request-headers"?: string;
  "dump-response-headers"?: string;
  "dump-response-body"?: string;
}

/*
Usage: get-cookie [name] [domain] [options]
Options:
  -h, --help: Show this help
  -v, --verbose: Show verbose output
  -d, --dump: Dump all results
  -D, --dump-grouped: Dump all results, grouped by profile
  -r, --render: Render all results
 */

export const argv: string[] = process.argv ?? [];
const minimistArgs: minimist.ParsedArgs = minimist(argv.slice(2));
const defaultOptions = {
  verbose: false,
};
export const parsedArgs: MyParsedArgs = merge(defaultOptions, minimistArgs);

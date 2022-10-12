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

export const argv: string[] = process.argv ?? [];
const minimistArgs: minimist.ParsedArgs = minimist(argv.slice(2));
const defaultOptions = {
  verbose: false,
};
export const parsedArgs: MyParsedArgs = merge(defaultOptions, minimistArgs);

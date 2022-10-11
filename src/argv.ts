import minimist from "minimist";

export const argv: string[] = process.argv ?? [];

export const parsedArgs: minimist.ParsedArgs = minimist(argv.slice(2));

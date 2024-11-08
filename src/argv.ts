import { merge } from 'lodash';
import { createGetCookieCommand, GetCookieOptions } from './commands/getCookieCommand';

const program = createGetCookieCommand();
program.parse();

const defaultOptions: GetCookieOptions = {
  verbose: false
};

export const parsedArgs = merge(defaultOptions, program.opts<GetCookieOptions>());
export const argv = program.args;

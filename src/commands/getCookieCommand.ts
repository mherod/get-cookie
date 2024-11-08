import { Command } from 'commander';

export interface GetCookieOptions {
  verbose: boolean;
  render?: boolean;
  fetch?: string;
  cs?: string;
  dump?: boolean;
  dumpGrouped?: boolean;
  dumpResponseHeaders?: boolean;
  dumpResponseBody?: boolean;
  renderMerged?: boolean;
  renderGrouped?: boolean;
  requireJwt?: boolean;
  single?: boolean;
  browser?: string;
  output?: string;
  H?: string[];
  name?: string;
  domain?: string;
  url?: string;
}

export function createGetCookieCommand(): Command {
  const program = new Command();

  program
    .name('get-cookie')
    .description('CLI utility for retrieving browser cookie values')
    .argument('[name]', 'Cookie name pattern')
    .argument('[domain]', 'Domain pattern')
    .option('-v, --verbose', 'Enable verbose output')
    .option('-d, --dump', 'Dump all results')
    .option('-D, --dump-grouped', 'Dump all results, grouped by profile')
    .option('-r, --render', 'Render all results')
    .option('--render-merged', 'Render merged results')
    .option('--render-grouped', 'Render grouped results')
    .option('-F, --fetch <url>', 'Fetch data from the specified URL')
    .option('-H <header>', 'Specify headers for the fetch request', (value, prev: string[] = []) => {
      return [...prev, value];
    })
    .option('--dump-response-headers', 'Dump response headers')
    .option('--dump-response-body', 'Dump response body')
    .option('-u, --url <url>', 'URL to extract cookie specs from')
    .option('--browser <name>', 'Specify browser (chrome, firefox)')
    .option('--require-jwt', 'Only return JWT tokens')
    .option('--single', 'Return only first matching cookie')
    .option('--output <format>', 'Output format (json)')
    .version(process.env.npm_package_version || '0.0.0');

  return program;
}
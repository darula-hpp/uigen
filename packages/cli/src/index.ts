#!/usr/bin/env node

import { Command } from 'commander';
import { serve } from './commands/serve.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8')
);

const program = new Command();

program
  .name('uigen')
  .description('Auto-generate admin UIs from OpenAPI specs')
  .version(packageJson.version)
  .addHelpText('after', `
Examples:
  $ uigen serve petstore.yaml
  $ uigen serve petstore.yaml --port 3000
  $ uigen serve petstore.yaml --proxy-base https://api.example.com
  $ uigen serve petstore.yaml --verbose
`);

program
  .command('serve')
  .description('Start a development server with the generated UI')
  .argument('<spec>', 'Path to OpenAPI spec file (YAML or JSON)')
  .option('-p, --port <port>', 'Port to run the server on', '4400')
  .option('--proxy-base <url>', 'Base URL for API proxy')
  .option('--renderer <renderer>', 'UI renderer to use (react, vue, svelte)', 'react')
  .option('--verbose', 'Log detailed request and response information')
  .addHelpText('after', `
Examples:
  $ uigen serve petstore.yaml
  $ uigen serve petstore.yaml --port 3000
  $ uigen serve petstore.yaml --proxy-base https://api.example.com
  $ uigen serve petstore.yaml --renderer react
  $ uigen serve petstore.yaml --verbose
`)
  .action(async (spec, options) => {
    await serve(spec, {
      port: options.port ? parseInt(options.port, 10) : undefined,
      proxyBase: options.proxyBase,
      verbose: options.verbose,
      renderer: options.renderer,
    });
  });

program.parse();

#!/usr/bin/env node

import { Command } from 'commander';
import { serve } from './commands/serve.js';
import { config } from './commands/config.js';
import { init } from './commands/init.js';
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
  $ uigen init
  $ uigen init my-project
  $ uigen init --spec openapi.yaml
  $ uigen serve petstore.yaml
  $ uigen serve petstore.yaml --port 3000
  $ uigen serve petstore.yaml --proxy-base https://api.example.com
  $ uigen serve petstore.yaml --verbose
  $ uigen config petstore.yaml
  $ uigen config petstore.yaml --port 4401
`);

program
  .command('init')
  .description('Initialize a new UIGen project')
  .argument('[project-name]', 'Name of the project directory')
  .option('--spec <path>', 'Path to existing OpenAPI spec file')
  .option('--no-git', 'Skip git repository initialization')
  .option('--dir <path>', 'Custom directory path (overrides project-name)')
  .option('-y, --yes', 'Skip prompts and use defaults')
  .option('--verbose', 'Show detailed output')
  .addHelpText('after', `
Examples:
  $ uigen init
  $ uigen init my-project
  $ uigen init --spec openapi.yaml
  $ uigen init my-project --spec api.yaml --yes
  $ uigen init --dir ./custom-path --no-git

The init command scaffolds a complete UIGen project with:
  - Project structure (.uigen/, .agents/skills/)
  - Configuration files (config.yaml, theme.css)
  - AI agent skills for automation
  - Git repository (optional)
  - Example OpenAPI spec (if not provided)

After initialization, use 'uigen serve' to start the development server.
`)
  .action(async (projectName, options) => {
    await init(projectName, {
      spec: options.spec,
      git: options.git,
      dir: options.dir,
      yes: options.yes,
      verbose: options.verbose,
    });
  });

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

program
  .command('config')
  .description('Open visual GUI for managing annotation configurations')
  .argument('<spec>', 'Path to OpenAPI spec file (YAML or JSON)')
  .option('-p, --port <port>', 'Port to run the config GUI on', '4401')
  .option('--verbose', 'Log detailed server information')
  .addHelpText('after', `
Examples:
  $ uigen config petstore.yaml
  $ uigen config petstore.yaml --port 4500
  $ uigen config petstore.yaml --verbose

The config command starts a visual interface for managing UIGen annotation
configurations. It opens a web-based GUI where you can:
  - Enable/disable annotations
  - Set default values for annotation parameters
  - Configure annotations visually with drag-and-drop, inline editing, etc.
  - Preview how annotations affect the generated UI

Configuration is saved to .uigen/config.yaml and automatically applied
when running 'uigen serve'.
`)
  .action(async (spec, options) => {
    await config(spec, {
      port: options.port ? parseInt(options.port, 10) : undefined,
      verbose: options.verbose,
    });
  });

program.parse();

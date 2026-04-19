import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import pc from 'picocolors';
import { exec } from 'child_process';
import { platform } from 'os';
import { createApiMiddleware } from '../middleware/config-api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Resolve the config-gui package root from node_modules */
function resolveConfigGuiRoot(): string {
  const pkgName = '@uigen-dev/config-gui';
  const candidates = [
    resolve(__dirname, '../../..', pkgName),               // npm/npx sibling
    resolve(__dirname, '../../../../node_modules', pkgName), // monorepo hoisted
    resolve(__dirname, '../node_modules', pkgName),          // cli-local
  ];
  for (const candidate of candidates) {
    if (existsSync(resolve(candidate, 'package.json'))) return candidate;
  }
  return resolve(__dirname, '../../../config-gui'); // last resort
}

/** Resolve the React package root from node_modules */
function resolveReactPackageRoot(): string {
  const pkgName = '@uigen-dev/react';
  const candidates = [
    resolve(__dirname, '../../..', pkgName),               // npm/npx sibling
    resolve(__dirname, '../../../../node_modules', pkgName), // monorepo hoisted
    resolve(__dirname, '../node_modules', pkgName),          // cli-local
  ];
  for (const candidate of candidates) {
    if (existsSync(resolve(candidate, 'package.json'))) return candidate;
  }
  return resolve(__dirname, '../../../react'); // last resort
}

/** Resolve the bundled base styles CSS file */
function resolveBaseStylesSource(): string {
  // First, try the bundled CSS in the CLI package (for npm installs)
  const bundledPath = resolve(__dirname, '../assets/base-styles.css');
  if (existsSync(bundledPath)) {
    return bundledPath;
  }
  
  // Fallback to React package source (for development)
  const reactPackageRoot = resolveReactPackageRoot();
  const sourcePath = resolve(reactPackageRoot, 'src/index.css');
  if (existsSync(sourcePath)) {
    return sourcePath;
  }
  
  throw new Error('Base styles CSS file not found. Please ensure @uigen-dev/cli is properly installed.');
}

/** Open URL in default browser (platform-specific) */
function openBrowser(url: string): void {
  const os = platform();
  let command: string;

  switch (os) {
    case 'darwin':
      command = `open "${url}"`;
      break;
    case 'win32':
      command = `start "" "${url}"`;
      break;
    default: // linux and others
      command = `xdg-open "${url}"`;
      break;
  }

  exec(command, (error) => {
    if (error) {
      console.log(pc.yellow(`\n⚠ Could not open browser automatically`));
      console.log(pc.gray(`Please open ${pc.bold(url)} manually\n`));
    }
  });
}

/** Try to start server on port, retry with next port if conflict */
async function startServerWithRetry(
  configGuiRoot: string,
  specPath: string,
  specDir: string,
  reactPackageRoot: string,
  startPort: number,
  maxRetries: number = 10
): Promise<{ port: number; server: any }> {
  let currentPort = startPort;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const server = await createViteServer({
        root: configGuiRoot,
        configFile: resolve(configGuiRoot, 'vite.config.ts'),
        server: {
          port: currentPort,
          strictPort: false, // Allow Vite to find next available port
          cors: { origin: '*', credentials: true },
          watch: {
            // Ignore .uigen directory to prevent reloads when config changes
            ignored: ['**/.uigen/**']
          }
        },
        plugins: [{
          name: 'uigen-spec-injection',
          transformIndexHtml(html) {
            return html.replace(
              '</head>',
              `<script>window.__UIGEN_SPEC_PATH__ = ${JSON.stringify(specPath)};</script></head>`
            );
          }
        }, {
          name: 'uigen-api-middleware',
          configureServer(server) {
            // Add API middleware before Vite's internal middleware
            server.middlewares.use(createApiMiddleware(specPath, specDir, reactPackageRoot));
          }
        }]
      });

      await server.listen();
      const actualPort = server.config.server.port || currentPort;
      
      return { port: actualPort, server };
    } catch (error) {
      lastError = error as Error;
      
      // Check if it's a port conflict error
      if (error && typeof error === 'object' && 'code' in error && error.code === 'EADDRINUSE') {
        currentPort++;
        continue;
      }
      
      // For other errors, throw immediately
      throw error;
    }
  }

  // If we exhausted all retries
  throw new Error(
    `Failed to start server after ${maxRetries} attempts. Last error: ${lastError?.message}`
  );
}

/**
 * Initialize CSS files for the project if they don't already exist.
 * Creates two files:
 * - .uigen/base-styles.css: Read-only reference copy of default styles
 * - .uigen/theme.css: Editable custom theme overrides (empty initially)
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */
export function initializeCSS(specDir: string, reactPackageRoot: string, verbose: boolean = false): void {
  const baseStylesPath = resolve(specDir, '.uigen/base-styles.css');
  const themePath = resolve(specDir, '.uigen/theme.css');
  const cssDir = resolve(specDir, '.uigen');

  // Ensure .uigen directory exists
  if (!existsSync(cssDir)) {
    mkdirSync(cssDir, { recursive: true });
  }

  let initialized = false;

  // Initialize base-styles.css (reference copy)
  if (!existsSync(baseStylesPath)) {
    try {
      const defaultCSSPath = resolveBaseStylesSource();
      const defaultContent = readFileSync(defaultCSSPath, 'utf-8');
      const headerComment = `/* UIGen Base Styles - Reference Only
 * 
 * This file is a read-only reference copy of the default UIGen styles.
 * These styles are already included in the React SPA.
 * 
 * Use this as a reference when writing your custom theme overrides in theme.css
 * DO NOT edit this file - your changes will be ignored.
 */

`;
      writeFileSync(baseStylesPath, headerComment + defaultContent, 'utf-8');
      initialized = true;
      if (verbose) {
        console.log(pc.gray(`Created base-styles.css reference at ${baseStylesPath}`));
      }
    } catch (error) {
      console.warn(pc.yellow(`Failed to create base-styles.css: ${error instanceof Error ? error.message : String(error)}`));
    }
  }

  // Initialize theme.css (empty custom overrides)
  if (!existsSync(themePath)) {
    try {
      const themeTemplate = `/* UIGen Custom Theme
 * 
 * Add your custom CSS overrides here.
 * These styles will be applied after the base styles, allowing you to override defaults.
 * 
 * Example:
 * .btn-primary {
 *   background-color: #your-brand-color;
 * }
 */

`;
      writeFileSync(themePath, themeTemplate, 'utf-8');
      initialized = true;
      if (verbose) {
        console.log(pc.gray(`Created theme.css at ${themePath}`));
      }
    } catch (error) {
      console.warn(pc.yellow(`Failed to create theme.css: ${error instanceof Error ? error.message : String(error)}`));
    }
  }

  if (initialized) {
    console.log(pc.green(`✓ Initialized CSS files in ${cssDir}`));
  } else if (verbose) {
    console.log(pc.gray('CSS files already exist, skipping initialization'));
  }
}

interface ConfigOptions {
  port?: number;
  verbose?: boolean;
}

export async function config(specPath: string, options: ConfigOptions) {
  console.log(pc.cyan('🎨 UIGen Config GUI starting...\n'));

  try {
    // Validate spec file exists
    const resolvedSpecPath = resolve(process.cwd(), specPath);
    if (!existsSync(resolvedSpecPath)) {
      console.error(pc.red(`✗ Error: Spec file not found: ${specPath}`));
      process.exit(1);
    }

    const specDir = dirname(resolvedSpecPath);
    console.log(pc.gray(`Spec file: ${specPath}`));
    console.log(pc.gray(`Working directory: ${specDir}`));

    // Resolve config-gui package
    const configGuiRoot = resolveConfigGuiRoot();
    const reactPackageRoot = resolveReactPackageRoot();
    if (options.verbose) {
      console.log(pc.gray(`Config GUI root: ${configGuiRoot}`));
      console.log(pc.gray(`React package root: ${reactPackageRoot}\n`));
    }

    // Initialize CSS file if it doesn't exist
    initializeCSS(specDir, reactPackageRoot, options.verbose ?? false);

    // Start Vite server with retry logic for port conflicts
    const startPort = options.port || 4401;
    console.log(pc.gray(`Starting server on port ${startPort}...\n`));

    const { port, server } = await startServerWithRetry(
      configGuiRoot,
      resolvedSpecPath,
      specDir,
      reactPackageRoot,
      startPort
    );

    if (port !== startPort) {
      console.log(pc.yellow(`⚠ Port ${startPort} was in use, using port ${port} instead\n`));
    }

    const url = `http://localhost:${port}`;
    console.log(pc.green(`✓ Config GUI running at ${pc.bold(url)}\n`));
    console.log(pc.gray('  API endpoints available:'));
    console.log(pc.gray(`  - GET  ${url}/api/config`));
    console.log(pc.gray(`  - POST ${url}/api/config`));
    console.log(pc.gray(`  - GET  ${url}/api/spec`));
    console.log(pc.gray(`  - GET  ${url}/api/annotations`));
    console.log(pc.gray(`  - GET  ${url}/api/css\n`));
    console.log(pc.gray('Opening browser...\n'));

    // Open browser
    openBrowser(url);

    console.log(pc.gray('Press Ctrl+C to stop\n'));

    // Keep process alive
    process.on('SIGINT', () => {
      console.log(pc.gray('\n\nShutting down...'));
      server.close();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log(pc.gray('\n\nShutting down...'));
      server.close();
      process.exit(0);
    });

  } catch (error) {
    console.error(pc.red('✗ Error:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

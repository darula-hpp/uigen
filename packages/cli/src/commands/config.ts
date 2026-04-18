import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import pc from 'picocolors';
import { exec } from 'child_process';
import { platform } from 'os';

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
          cors: { origin: '*', credentials: true }
        },
        plugins: [{
          name: 'uigen-spec-injection',
          transformIndexHtml(html) {
            return html.replace(
              '</head>',
              `<script>window.__UIGEN_SPEC_PATH__ = ${JSON.stringify(specPath)};</script></head>`
            );
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

    console.log(pc.gray(`Spec file: ${specPath}`));

    // Resolve config-gui package
    const configGuiRoot = resolveConfigGuiRoot();
    if (options.verbose) {
      console.log(pc.gray(`Config GUI root: ${configGuiRoot}\n`));
    }

    // Start Vite server with retry logic for port conflicts
    const startPort = options.port || 4401;
    console.log(pc.gray(`Starting server on port ${startPort}...\n`));

    const { port, server } = await startServerWithRetry(
      configGuiRoot,
      resolvedSpecPath,
      startPort
    );

    if (port !== startPort) {
      console.log(pc.yellow(`⚠ Port ${startPort} was in use, using port ${port} instead\n`));
    }

    const url = `http://localhost:${port}`;
    console.log(pc.green(`✓ Config GUI running at ${pc.bold(url)}\n`));
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

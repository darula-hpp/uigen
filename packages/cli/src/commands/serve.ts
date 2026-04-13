import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createServer, type ProxyOptions } from 'vite';
import { parseSpec } from '@uigen-dev/core';
import pc from 'picocolors';
import type { IncomingMessage, ServerResponse } from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPPORTED_RENDERERS = ['react', 'vue', 'svelte'] as const;
type Renderer = typeof SUPPORTED_RENDERERS[number];

/**
 * Resolve the root directory of a renderer package.
 *
 * In the monorepo (dev) the renderer lives at ../../../<renderer> relative to
 * this file.  When the CLI is installed from npm the renderer is a sibling
 * package in node_modules, so we locate it via its package.json and walk up
 * to the package root.
 */
function resolveRendererRoot(renderer: Renderer): string {
  const pkgName = `@uigen-dev/${renderer}`;
  try {
    // Resolve the package.json of the renderer package — works both locally
    // (workspace symlink) and when installed from npm.
    const pkgJsonPath = fileURLToPath(
      import.meta.resolve(`${pkgName}/package.json`)
    );
    return dirname(pkgJsonPath);
  } catch {
    // Fallback for monorepo dev where package.json exports may not expose the
    // root — walk up from __dirname.
    return resolve(__dirname, '../../../' + renderer);
  }
}

interface ServeOptions {
  port?: number;
  proxyBase?: string;
  verbose?: boolean;
  renderer?: string;
}

export async function serve(specPath: string, options: ServeOptions) {
  console.log(pc.cyan('🚀 UIGen starting...\n'));

  try {
    // Read and parse spec
    console.log(pc.gray(`Reading spec: ${specPath}`));
    const specContent = readFileSync(resolve(process.cwd(), specPath), 'utf-8');
    const ir = await parseSpec(specContent);

    console.log(pc.green(`✓ Parsed spec: ${ir.meta.title} v${ir.meta.version}`));
    console.log(pc.gray(`  Resources: ${ir.resources.map(r => r.name).join(', ')}\n`));

    // Determine proxy target
    const proxyTarget = options.proxyBase || ir.servers[0]?.url || 'http://localhost:3000';
    console.log(pc.gray(`API proxy target: ${proxyTarget}\n`));

    // Resolve renderer — defaults to react
    const renderer: Renderer = (SUPPORTED_RENDERERS as readonly string[]).includes(options.renderer ?? '')
      ? (options.renderer as Renderer)
      : 'react';

    if (options.renderer && renderer !== options.renderer) {
      console.log(pc.yellow(`⚠ Unknown renderer "${options.renderer}", falling back to react\n`));
    }

    const rendererRoot = resolveRendererRoot(renderer);
    console.log(pc.gray(`Renderer: ${renderer} (${rendererRoot})\n`));

    // Create proxy configuration with authentication injection
    const proxyConfig: ProxyOptions = {
      target: proxyTarget,
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, ''),
      configure: (proxy, _options) => {
        proxy.on('proxyReq', (proxyReq, req: IncomingMessage, _res: ServerResponse) => {
          const startTime = Date.now();
          
          // Extract authentication headers from the incoming request
          const authHeader = req.headers['x-uigen-auth'];
          const apiKeyHeader = req.headers['x-uigen-api-key'];
          const apiKeyName = req.headers['x-uigen-api-key-name'];
          const apiKeyIn = req.headers['x-uigen-api-key-in'];
          const basicAuthHeader = req.headers['x-uigen-basic-auth'];
          
          // Extract selected server from request headers (Requirement 19.4)
          const selectedServer = req.headers['x-uigen-server'];
          if (selectedServer && typeof selectedServer === 'string') {
            const url = new URL(proxyReq.path || '', selectedServer);
            proxyReq.setHeader('Host', url.host);
            if (options.verbose) {
              console.log(pc.gray(`  [Server] Routing to: ${selectedServer}`));
            }
          }

          // Inject Bearer token authentication
          if (authHeader && typeof authHeader === 'string') {
            proxyReq.setHeader('Authorization', `Bearer ${authHeader}`);
            if (options.verbose) {
              console.log(pc.gray(`  [Auth] Injected Bearer token`));
            }
          }

          // Inject Basic authentication
          if (basicAuthHeader && typeof basicAuthHeader === 'string') {
            proxyReq.setHeader('Authorization', `Basic ${basicAuthHeader}`);
            if (options.verbose) {
              console.log(pc.gray(`  [Auth] Injected Basic auth`));
            }
          }

          // Inject API key authentication
          if (apiKeyHeader && typeof apiKeyHeader === 'string' && apiKeyName && typeof apiKeyName === 'string') {
            if (apiKeyIn === 'header') {
              proxyReq.setHeader(apiKeyName, apiKeyHeader);
              if (options.verbose) {
                console.log(pc.gray(`  [Auth] Injected API key in header: ${apiKeyName}`));
              }
            } else if (apiKeyIn === 'query') {
              const url = new URL(proxyReq.path || '', proxyTarget);
              url.searchParams.set(apiKeyName, apiKeyHeader);
              proxyReq.path = url.pathname + url.search;
              if (options.verbose) {
                console.log(pc.gray(`  [Auth] Injected API key in query: ${apiKeyName}`));
              }
            }
          }

          // Remove UIGen-specific headers before forwarding
          proxyReq.removeHeader('x-uigen-auth');
          proxyReq.removeHeader('x-uigen-api-key');
          proxyReq.removeHeader('x-uigen-api-key-name');
          proxyReq.removeHeader('x-uigen-api-key-in');
          proxyReq.removeHeader('x-uigen-basic-auth');
          proxyReq.removeHeader('x-uigen-server');

          // Log request
          const method = req.method || 'UNKNOWN';
          const path = req.url || '/';
          console.log(pc.blue(`→ ${method} ${path}`));
          
          if (options.verbose && req.headers['content-type']) {
            console.log(pc.gray(`  Content-Type: ${req.headers['content-type']}`));
          }

          (req as any).__startTime = startTime;
        });

        proxy.on('proxyRes', (proxyRes, req: IncomingMessage, _res: ServerResponse) => {
          const duration = Date.now() - ((req as any).__startTime || Date.now());
          const status = proxyRes.statusCode || 0;
          const method = req.method || 'UNKNOWN';
          const path = req.url || '/';
          
          const statusColor = status >= 500 ? pc.red : status >= 400 ? pc.yellow : pc.green;
          console.log(statusColor(`← ${method} ${path} ${status} (${duration}ms)`));

          if (options.verbose) {
            console.log(pc.gray(`  Response headers: ${JSON.stringify(proxyRes.headers)}`));
          }
        });

        proxy.on('error', (err, req: IncomingMessage, _res: ServerResponse) => {
          const method = req.method || 'UNKNOWN';
          const path = req.url || '/';
          console.error(pc.red(`✗ ${method} ${path} - Proxy error: ${err.message}`));
          console.error(pc.gray(`  Target: ${proxyTarget}`));
        });
      }
    };

    // Create Vite server with config injection plugin
    const server = await createServer({
      root: rendererRoot,
      server: {
        port: options.port || 4400,
        cors: {
          origin: '*',
          methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
          allowedHeaders: ['Content-Type', 'Authorization', 'X-UIGen-Auth', 'X-UIGen-API-Key', 'X-UIGen-API-Key-Name', 'X-UIGen-API-Key-In', 'X-UIGen-Basic-Auth', 'X-UIGen-Server'],
          credentials: true
        },
        proxy: {
          '/api': proxyConfig
        }
      },
      plugins: [
        {
          name: 'uigen-config-injection',
          transformIndexHtml(html) {
            return html.replace(
              '</head>',
              `<script>window.__UIGEN_CONFIG__ = ${JSON.stringify(ir)};</script></head>`
            );
          }
        }
      ]
    });

    await server.listen();

    const actualPort = server.config.server.port;
    console.log(pc.green(`✓ Server running at ${pc.bold(`http://localhost:${actualPort}`)}\n`));
    console.log(pc.gray('Press Ctrl+C to stop\n'));
  } catch (error) {
    console.error(pc.red('✗ Error:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

import { readFileSync, existsSync, createReadStream } from 'fs';
import { resolve, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer, type ProxyOptions } from 'vite';
import { createServer as createHttpServer, request as httpRequest, type IncomingMessage, type ServerResponse } from 'http';
import { request as httpsRequest } from 'https';
import { parseSpec, ConfigLoader, AnnotationHandlerRegistry, Reconciler } from '@uigen-dev/core';
import { load as parseYaml } from 'js-yaml';
import pc from 'picocolors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPPORTED_RENDERERS = ['react', 'vue', 'svelte'] as const;
type Renderer = typeof SUPPORTED_RENDERERS[number];

const MIME: Record<string, string> = {
  '.html':  'text/html',
  '.js':    'application/javascript',
  '.css':   'text/css',
  '.svg':   'image/svg+xml',
  '.png':   'image/png',
  '.ico':   'image/x-icon',
  '.json':  'application/json',
  '.woff':  'font/woff',
  '.woff2': 'font/woff2',
};

/** Resolve the renderer package root from node_modules, works for npx, global, and local installs. */
function resolveRendererRoot(renderer: Renderer): string {
  const pkgName = `@uigen-dev/${renderer}`;
  const candidates = [
    resolve(__dirname, '../../..', pkgName),               // npm/npx sibling
    resolve(__dirname, '../../../../node_modules', pkgName), // monorepo hoisted
    resolve(__dirname, '../node_modules', pkgName),          // cli-local
  ];
  for (const candidate of candidates) {
    if (existsSync(resolve(candidate, 'package.json'))) return candidate;
  }
  return resolve(__dirname, '../../../' + renderer); // last resort
}

/** Inject auth headers and strip uigen-specific ones. Mutates the headers object in place. */
function injectAuthHeaders(
  headers: Record<string, string | string[]>,
  incoming: IncomingMessage,
  targetUrl: URL,
  verbose: boolean
): void {
  const authHeader    = incoming.headers['x-uigen-auth'];
  const basicAuth     = incoming.headers['x-uigen-basic-auth'];
  const apiKeyHeader  = incoming.headers['x-uigen-api-key'];
  const apiKeyName    = incoming.headers['x-uigen-api-key-name'];
  const apiKeyIn      = incoming.headers['x-uigen-api-key-in'];

  if (authHeader)  { headers['authorization'] = `Bearer ${authHeader}`;  if (verbose) console.log(pc.gray('  [Auth] Bearer token')); }
  if (basicAuth)   { headers['authorization'] = `Basic ${basicAuth}`;    if (verbose) console.log(pc.gray('  [Auth] Basic auth')); }
  if (apiKeyHeader && apiKeyName) {
    if (apiKeyIn === 'header') {
      headers[apiKeyName as string] = apiKeyHeader as string;
      if (verbose) console.log(pc.gray(`  [Auth] API key header: ${apiKeyName}`));
    } else if (apiKeyIn === 'query') {
      targetUrl.searchParams.set(apiKeyName as string, apiKeyHeader as string);
      if (verbose) console.log(pc.gray(`  [Auth] API key query: ${apiKeyName}`));
    }
  }

  for (const h of ['x-uigen-auth','x-uigen-api-key','x-uigen-api-key-name','x-uigen-api-key-in','x-uigen-basic-auth','x-uigen-server']) {
    delete headers[h];
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
    // Resolve spec path and determine config location
    const resolvedSpecPath = resolve(process.cwd(), specPath);
    const specDir = dirname(resolvedSpecPath);
    const configPath = resolve(specDir, '.uigen/config.yaml');
    
    // Load config file if it exists
    const configLoader = new ConfigLoader({
      configPath,
      verbose: options.verbose
    });
    
    const config = configLoader.load();
    
    if (config) {
      console.log(pc.gray(`Loading annotation config from ${configPath}`));
      
      // Apply config to registry
      const registry = AnnotationHandlerRegistry.getInstance();
      configLoader.applyToRegistry(config, registry);
      
      // Set config loader on registry for precedence handling
      registry.setConfigLoader(configLoader);
      
      // Log disabled annotations
      const disabledAnnotations = Object.entries(config.enabled)
        .filter(([_, enabled]) => !enabled)
        .map(([name]) => name);
      
      if (disabledAnnotations.length > 0 && options.verbose) {
        console.log(pc.gray(`  Disabled annotations: ${disabledAnnotations.join(', ')}`));
      }
      
      // Log annotations with defaults
      const annotationsWithDefaults = Object.keys(config.defaults);
      if (annotationsWithDefaults.length > 0 && options.verbose) {
        console.log(pc.gray(`  Annotations with defaults: ${annotationsWithDefaults.join(', ')}`));
      }
      
      console.log(pc.green('✓ Config loaded\n'));
    } else if (options.verbose) {
      console.log(pc.gray('No config file found, using default annotation settings\n'));
    }
    
    console.log(pc.gray(`Reading spec: ${specPath}`));
    const specContent = readFileSync(resolve(process.cwd(), specPath), 'utf-8');
    
    // Parse the spec as YAML/JSON to get the raw spec object
    let rawSpec: any;
    try {
      rawSpec = parseYaml(specContent);
    } catch {
      // If YAML parsing fails, try JSON
      rawSpec = JSON.parse(specContent);
    }
    
    // Apply reconciliation if config exists
    let reconciledSpec = rawSpec;
    if (config) {
      try {
        const reconciler = new Reconciler({
          logLevel: options.verbose ? 'debug' : 'info',
          validateOutput: true,
          strictMode: false,
        });
        
        const reconciliationResult = reconciler.reconcile(rawSpec, config);
        reconciledSpec = reconciliationResult.spec;
        
        if (options.verbose) {
          console.log(pc.gray(`  Applied ${reconciliationResult.appliedAnnotations} annotation(s) from config`));
          
          if (reconciliationResult.warnings.length > 0) {
            console.log(pc.yellow(`  Warnings: ${reconciliationResult.warnings.length}`));
            for (const warning of reconciliationResult.warnings) {
              console.log(pc.yellow(`    - ${warning.message}`));
              if (warning.suggestion) {
                console.log(pc.gray(`      ${warning.suggestion}`));
              }
            }
          }
        }
        
        console.log(pc.green('✓ Reconciliation complete\n'));
      } catch (error) {
        console.error(pc.red('✗ Reconciliation failed:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    }
    
    // Convert reconciled spec back to string for parseSpec
    const reconciledSpecContent = JSON.stringify(reconciledSpec);
    const ir = await parseSpec(reconciledSpecContent);

    console.log(pc.green(`✓ Parsed spec: ${ir.meta.title} v${ir.meta.version}`));
    console.log(pc.gray(`  Resources: ${ir.resources.map(r => r.name).join(', ')}\n`));

    const proxyTarget = options.proxyBase || ir.servers[0]?.url || 'http://localhost:3000';
    console.log(pc.gray(`API proxy target: ${proxyTarget}\n`));

    const renderer: Renderer = (SUPPORTED_RENDERERS as readonly string[]).includes(options.renderer ?? '')
      ? (options.renderer as Renderer)
      : 'react';

    if (options.renderer && renderer !== options.renderer) {
      console.log(pc.yellow(`⚠ Unknown renderer "${options.renderer}", falling back to react\n`));
    }

    const rendererRoot = resolveRendererRoot(renderer);
    const isInstalled = rendererRoot.includes('node_modules');

    console.log(pc.gray(`Renderer: ${renderer} (${rendererRoot})`));
    if (options.verbose) console.log(pc.gray(`Mode: ${isInstalled ? 'static' : 'dev'}\n`));

    if (!isInstalled) {
      // --- Dev mode: Vite dev server (monorepo) ---
      const proxyConfig: ProxyOptions = {
        target: proxyTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req: IncomingMessage) => {
            const startTime = Date.now();
            const headers: Record<string, string | string[]> = {};
            injectAuthHeaders(headers, req, new URL(proxyReq.path || '', proxyTarget), options.verbose ?? false);
            for (const [k, v] of Object.entries(headers)) proxyReq.setHeader(k, v);
            for (const h of ['x-uigen-auth','x-uigen-api-key','x-uigen-api-key-name','x-uigen-api-key-in','x-uigen-basic-auth','x-uigen-server']) {
              proxyReq.removeHeader(h);
            }
            console.log(pc.blue(`→ ${req.method} ${req.url}`));
            (req as any).__startTime = startTime;
          });
          proxy.on('proxyRes', (proxyRes, req: IncomingMessage) => {
            const duration = Date.now() - ((req as any).__startTime || Date.now());
            const status = proxyRes.statusCode || 0;
            const color = status >= 500 ? pc.red : status >= 400 ? pc.yellow : pc.green;
            console.log(color(`← ${req.method} ${req.url} ${status} (${duration}ms)`));
          });
          proxy.on('error', (err, req: IncomingMessage) => {
            console.error(pc.red(`✗ ${req.method} ${req.url} - ${err.message}`));
          });
        }
      };

      const server = await createViteServer({
        root: rendererRoot,
        configFile: resolve(rendererRoot, 'vite.config.ts'),
        server: {
          port: options.port || 4400,
          cors: { origin: '*', credentials: true },
          proxy: { '/api': proxyConfig }
        },
        plugins: [{
          name: 'uigen-config-injection',
          transformIndexHtml(html) {
            return html.replace('</head>', `<script>window.__UIGEN_CONFIG__ = ${JSON.stringify(ir)};</script></head>`);
          }
        }]
      });
      await server.listen();
      const port = server.config.server.port;
      console.log(pc.green(`\n✓ Server running at ${pc.bold(`http://localhost:${port}`)}\n`));
      console.log(pc.gray('Press Ctrl+C to stop\n'));
    } else {
      // --- Static mode: serve pre-built dist (npm/npx install) ---
      const distDir = resolve(rendererRoot, 'dist');
      const port = options.port || 4400;

      const httpServer = createHttpServer((req: IncomingMessage, res: ServerResponse) => {
        const url = req.url || '/';

        if (url.startsWith('/api')) {
          const targetUrl = new URL(url.replace(/^\/api/, ''), proxyTarget);
          const forwardHeaders: Record<string, string | string[]> = {};
          for (const [k, v] of Object.entries(req.headers)) {
            if (v !== undefined) forwardHeaders[k] = v as string | string[];
          }
          forwardHeaders['host'] = targetUrl.host;
          injectAuthHeaders(forwardHeaders, req, targetUrl, options.verbose ?? false);

          const startTime = Date.now();
          console.log(pc.blue(`→ ${req.method || 'GET'} ${url}`));

          const requester = targetUrl.protocol === 'https:' ? httpsRequest : httpRequest;
          const proxyReq = requester(targetUrl, { method: req.method, headers: forwardHeaders }, (proxyRes) => {
            const duration = Date.now() - startTime;
            const status = proxyRes.statusCode || 0;
            const color = status >= 500 ? pc.red : status >= 400 ? pc.yellow : pc.green;
            console.log(color(`← ${req.method || 'GET'} ${url} ${status} (${duration}ms)`));
            res.writeHead(status, proxyRes.headers);
            proxyRes.pipe(res);
          });
          proxyReq.on('error', (err) => {
            console.error(pc.red(`✗ Proxy error: ${err.message}`));
            res.writeHead(502);
            res.end('Bad Gateway');
          });
          req.pipe(proxyReq);
          return;
        }

        const ext = extname(url);
        const filePath = ext ? resolve(distDir, url.slice(1)) : resolve(distDir, 'index.html');

        if (!existsSync(filePath)) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }

        if (filePath.endsWith('index.html')) {
          let html = readFileSync(filePath, 'utf-8');
          html = html.replace('</head>', `<script>window.__UIGEN_CONFIG__ = ${JSON.stringify(ir)};</script></head>`);
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(html);
        } else {
          res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
          createReadStream(filePath).pipe(res);
        }
      });

      httpServer.listen(port, () => {
        console.log(pc.green(`\n✓ Server running at ${pc.bold(`http://localhost:${port}`)}\n`));
        console.log(pc.gray('Press Ctrl+C to stop\n'));
      });
    }
  } catch (error) {
    console.error(pc.red('✗ Error:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

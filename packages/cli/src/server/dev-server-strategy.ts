/**
 * Development server strategy using Vite
 */

import { existsSync, createReadStream } from 'fs';
import { resolve, extname, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer, type ProxyOptions } from 'vite';
import { watch } from 'chokidar';
import type { IncomingMessage } from 'http';
import pc from 'picocolors';
import type { ServerStrategy, ServerContext, ServeOptions, MIME } from './types.js';
import { ProxyManager } from './proxy-manager.js';
import { AssetLoader } from './asset-loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class DevServerStrategy implements ServerStrategy {
  private proxyManager = new ProxyManager();
  private assetLoader = new AssetLoader();
  
  async start(context: ServerContext, options: ServeOptions): Promise<number> {
    const { specDir, ir, proxyTarget, cssContent, overrideScript, verbose } = context;
    const rendererRoot = this.resolveRendererRoot(options.renderer || 'react');
    
    const proxyConfig: ProxyOptions = {
      target: proxyTarget,
      changeOrigin: true,
      ws: true,
      rewrite: (path) => path.replace(/^\/api/, ''),
      configure: (proxy) => {
        proxy.on('proxyReq', (proxyReq, req: IncomingMessage) => {
          const startTime = Date.now();
          const headers: Record<string, string | string[]> = {};
          this.proxyManager.injectAuthHeaders(headers, req, new URL(proxyReq.path || '', proxyTarget), verbose);
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
          let injectedHtml = html.replace('</head>', `<script>window.__UIGEN_CONFIG__ = ${JSON.stringify(ir)};</script></head>`);
          
          if (cssContent) {
            injectedHtml = injectedHtml.replace('</head>', `<script>window.__UIGEN_CSS__ = ${JSON.stringify(cssContent)};</script></head>`);
          }
          
          injectedHtml = injectedHtml.replace('</head>', `${overrideScript}</head>`);
          
          return injectedHtml;
        },
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const url = req.url || '/';
            if (url.startsWith('/.uigen/assets/')) {
              const assetPath = resolve(specDir, url.slice(1));
              if (existsSync(assetPath)) {
                const ext = extname(assetPath);
                const MIME: Record<string, string> = {
                  '.html': 'text/html',
                  '.js': 'application/javascript',
                  '.css': 'text/css',
                  '.svg': 'image/svg+xml',
                  '.png': 'image/png',
                  '.ico': 'image/x-icon',
                  '.json': 'application/json',
                  '.woff': 'font/woff',
                  '.woff2': 'font/woff2',
                };
                res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
                createReadStream(assetPath).pipe(res);
                return;
              }
            }
            next();
          });
        }
      }]
    });
    
    await server.listen();
    const port = server.config.server.port;
    
    // Setup file watcher for hot reload
    this.setupOverrideWatcher(specDir, server, verbose);
    
    console.log(pc.green(`\n✓ Server running at ${pc.bold(`http://localhost:${port}`)}\n`));
    console.log(pc.gray('Press Ctrl+C to stop\n'));

    return port;
  }
  
  private setupOverrideWatcher(specDir: string, viteServer: any, verbose: boolean): void {
    const srcDir = resolve(specDir, 'src');
    
    if (!existsSync(srcDir)) {
      if (verbose) {
        console.log(pc.gray('No src/ directory found, skipping override file watcher'));
      }
      return;
    }
    
    const watcher = watch(`${srcDir}/**/*.{ts,tsx}`, {
      ignored: ['**/node_modules/**', '**/.uigen/**'],
      persistent: true,
      ignoreInitial: true,
    });
    
    let debounceTimer: NodeJS.Timeout | null = null;
    
    const handleChange = (path: string, event: 'add' | 'change' | 'unlink') => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      
      debounceTimer = setTimeout(async () => {
        const eventLabel = event === 'add' ? 'added' : event === 'change' ? 'changed' : 'removed';
        console.log(pc.cyan(`\n🔄 Override file ${eventLabel}: ${path}`));
        console.log(pc.gray('Reprocessing overrides...\n'));
        
        try {
          await this.assetLoader.processOverrides(specDir, 'development', verbose);
          
          viteServer.ws.send({
            type: 'full-reload',
            path: '*',
          });
          
          console.log(pc.green('✓ Overrides reloaded\n'));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(pc.red(`✗ Override reload failed: ${errorMessage}\n`));
        }
      }, 100);
    };
    
    watcher
      .on('add', (path) => handleChange(path, 'add'))
      .on('change', (path) => handleChange(path, 'change'))
      .on('unlink', (path) => handleChange(path, 'unlink'))
      .on('error', (error) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(pc.red(`✗ File watcher error: ${errorMessage}`));
      });
    
    if (verbose) {
      console.log(pc.gray(`Watching ${srcDir} for override file changes...\n`));
    }
  }
  
  private resolveRendererRoot(renderer: string): string {
    const pkgName = `@uigen-dev/${renderer}`;
    const candidates = [
      resolve(__dirname, '../../node_modules', pkgName),
      resolve(__dirname, '../../..', pkgName),
      resolve(__dirname, '../../../../node_modules', pkgName),
      resolve(__dirname, '../node_modules', pkgName),
    ];
    
    for (const candidate of candidates) {
      if (existsSync(resolve(candidate, 'package.json'))) return candidate;
    }
    
    return resolve(__dirname, '../../../' + renderer);
  }
}

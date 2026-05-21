/**
 * Static server strategy for production builds
 */

import { readFileSync, existsSync, createReadStream } from 'fs';
import { resolve, extname, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createServer as createHttpServer, request as httpRequest, type IncomingMessage, type ServerResponse } from 'http';
import { request as httpsRequest } from 'https';
import pc from 'picocolors';
import type { ServerStrategy, ServerContext, ServeOptions, MIME } from './types.js';
import { ProxyManager } from './proxy-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class StaticServerStrategy implements ServerStrategy {
  private proxyManager = new ProxyManager();
  
  async start(context: ServerContext, options: ServeOptions): Promise<number> {
    const { specDir, ir, proxyTarget, cssContent, overrideScript, verbose } = context;
    const rendererRoot = this.resolveRendererRoot(options.renderer || 'react');
    const distDir = resolve(rendererRoot, 'dist');
    const port = options.port || 4400;
    
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

    const httpServer = createHttpServer((req: IncomingMessage, res: ServerResponse) => {
      const url = req.url || '/';

      // Serve .uigen/assets/* files
      if (url.startsWith('/.uigen/assets/')) {
        const assetPath = resolve(specDir, url.slice(1));
        if (existsSync(assetPath)) {
          const ext = extname(assetPath);
          res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
          createReadStream(assetPath).pipe(res);
          return;
        } else {
          res.writeHead(404);
          res.end('Asset not found');
          return;
        }
      }

      // Proxy API requests
      if (url.startsWith('/api')) {
        this.handleProxyRequest(req, res, url, proxyTarget, verbose);
        return;
      }

      // Serve static files or SPA routes
      this.handleStaticRequest(req, res, url, distDir, ir, cssContent, overrideScript, MIME);
    });

    await new Promise<void>((resolveListen) => {
      httpServer.listen(port, () => {
        console.log(pc.green(`\n✓ Server running at ${pc.bold(`http://localhost:${port}`)}\n`));
        console.log(pc.gray('Press Ctrl+C to stop\n'));
        resolveListen();
      });
    });

    return port;
  }
  
  private handleProxyRequest(
    req: IncomingMessage,
    res: ServerResponse,
    url: string,
    proxyTarget: string,
    verbose: boolean
  ): void {
    const targetUrl = new URL(url.replace(/^\/api/, ''), proxyTarget);
    const forwardHeaders: Record<string, string | string[]> = {};
    
    for (const [k, v] of Object.entries(req.headers)) {
      if (v !== undefined) forwardHeaders[k] = v as string | string[];
    }
    
    forwardHeaders['host'] = targetUrl.host;
    this.proxyManager.injectAuthHeaders(forwardHeaders, req, targetUrl, verbose);

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
  }
  
  private handleStaticRequest(
    req: IncomingMessage,
    res: ServerResponse,
    url: string,
    distDir: string,
    ir: any,
    cssContent: string,
    overrideScript: string,
    MIME: Record<string, string>
  ): void {
    const urlPath = url.split('?')[0].split('#')[0];
    const ext = extname(urlPath);
    const filePath = ext ? resolve(distDir, urlPath.slice(1)) : resolve(distDir, 'index.html');

    if (ext && !existsSync(filePath)) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    if (filePath.endsWith('index.html')) {
      let html = readFileSync(filePath, 'utf-8');
      
      html = html.replace('</head>', `<script>window.__UIGEN_CONFIG__ = ${JSON.stringify(ir)};</script></head>`);
      
      if (cssContent) {
        html = html.replace('</head>', `<script>window.__UIGEN_CSS__ = ${JSON.stringify(cssContent)};</script></head>`);
      }
      
      html = html.replace('</head>', `${overrideScript}</head>`);
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    } else {
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      createReadStream(filePath).pipe(res);
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

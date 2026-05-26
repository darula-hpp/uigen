/**
 * HTTP and WebSocket proxy for /api/* to the configured backend.
 */

import httpProxy from 'http-proxy';
import type { IncomingMessage, ServerResponse } from 'http';
import type { Server } from 'http';
import type { Duplex } from 'stream';
import pc from 'picocolors';
import { buildProxyTargetUrl, isApiProxyPath, resolveProxyBase } from './api-path.js';
import { ProxyManager } from './proxy-manager.js';

export class ApiProxy {
  private readonly proxy = httpProxy.createProxyServer({
    changeOrigin: true,
    ws: true
  });

  constructor(
    private readonly proxyTarget: string,
    private readonly proxyManager: ProxyManager,
    private readonly verbose: boolean
  ) {
    this.proxy.on('error', (err, req) => {
      const method = req && 'method' in req ? (req as IncomingMessage).method : 'WS';
      const url = req && 'url' in req ? (req as IncomingMessage).url : '';
      console.error(pc.red(`✗ Proxy error: ${method} ${url} - ${err.message}`));
    });
  }

  attachUpgradeHandler(httpServer: Server): void {
    httpServer.on('upgrade', (req, socket, head) => {
      this.handleUpgrade(req, socket, head);
    });
  }

  handleHttp(req: IncomingMessage, res: ServerResponse): void {
    const requestUrl = req.url ?? '/';
    const proxyBase = resolveProxyBase(this.proxyTarget, req, requestUrl);
    const targetUrl = buildProxyTargetUrl(requestUrl, proxyBase);
    const forwardHeaders = this.buildForwardHeaders(req, requestUrl, targetUrl);

    req.url = targetUrl.pathname + targetUrl.search;

    const startTime = Date.now();
    console.log(pc.blue(`→ ${req.method || 'GET'} ${requestUrl}`));

    this.proxy.web(req, res, {
      target: proxyBase,
      headers: toStringHeaders(forwardHeaders)
    }, (err) => {
      if (err) {
        console.error(pc.red(`✗ Proxy error: ${err.message}`));
        if (!res.headersSent) {
          res.writeHead(502);
          res.end('Bad Gateway');
        }
        return;
      }

      const duration = Date.now() - startTime;
      console.log(pc.green(`← ${req.method || 'GET'} ${requestUrl} (${duration}ms)`));
    });
  }

  handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): void {
    const requestUrl = req.url ?? '/';

    if (!isApiProxyPath(requestUrl)) {
      socket.destroy();
      return;
    }

    const proxyBase = resolveProxyBase(this.proxyTarget, req, requestUrl);
    const targetUrl = buildProxyTargetUrl(requestUrl, proxyBase);
    const forwardHeaders = this.buildForwardHeaders(req, requestUrl, targetUrl);

    req.url = targetUrl.pathname + targetUrl.search;

    console.log(pc.blue(`→ WS ${requestUrl}`));

    this.proxy.ws(
      req,
      socket,
      head,
      {
        target: proxyBase,
        headers: toStringHeaders(forwardHeaders)
      },
      (err) => {
        if (err) {
          console.error(pc.red(`✗ WebSocket proxy error: ${err.message}`));
          socket.destroy();
        }
      }
    );
  }

  private buildForwardHeaders(
    req: IncomingMessage,
    requestUrl: string,
    targetUrl: URL
  ): Record<string, string | string[]> {
    const forwardHeaders: Record<string, string | string[]> = {};

    for (const [key, value] of Object.entries(req.headers)) {
      if (value !== undefined) {
        forwardHeaders[key] = value;
      }
    }

    forwardHeaders.host = targetUrl.host;
    this.proxyManager.injectAuthHeaders(forwardHeaders, req, targetUrl, this.verbose);

    const incomingUrl = new URL(requestUrl, 'http://localhost');
    this.proxyManager.injectAuthFromQuery(forwardHeaders, incomingUrl, targetUrl, this.verbose);

    return forwardHeaders;
  }
}

function toStringHeaders(
  headers: Record<string, string | string[]>
): Record<string, string> {
  const normalized: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    normalized[key] = Array.isArray(value) ? value.join(', ') : value;
  }

  return normalized;
}

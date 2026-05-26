/**
 * Shared /api proxy path helpers for HTTP and WebSocket forwarding.
 */

import type { IncomingMessage } from 'http';

const UIGEN_AUTH_QUERY_PARAMS = [
  'x-uigen-auth',
  'x-uigen-api-key',
  'x-uigen-api-key-name',
  'x-uigen-api-key-in',
  'x-uigen-basic-auth',
  'x-uigen-server'
] as const;

/**
 * Strip the /api prefix from a request path (not including query string).
 */
export function stripApiPrefix(pathname: string): string {
  return pathname.replace(/^\/api/, '') || '/';
}

/**
 * Build the backend URL for a proxied /api request.
 * Strips /api, applies proxy base, and removes UIGen auth query params from the URL.
 */
export function buildProxyTargetUrl(requestUrl: string, proxyBase: string): URL {
  const incoming = new URL(requestUrl, 'http://localhost');
  const backendPath = stripApiPrefix(incoming.pathname);
  const targetUrl = new URL(backendPath + incoming.search, proxyBase);

  for (const param of UIGEN_AUTH_QUERY_PARAMS) {
    targetUrl.searchParams.delete(param);
  }

  return targetUrl;
}

export function isApiProxyPath(url: string): boolean {
  const pathname = url.split('?')[0] ?? url;
  return pathname.startsWith('/api');
}

/**
 * Resolve proxy target for a request. Honors x-uigen-server from header or query
 * (same contract as REST via useApiCall), then falls back to the CLI default.
 */
export function resolveProxyBase(
  defaultProxyTarget: string,
  req: IncomingMessage,
  requestUrl: string
): string {
  const header = req.headers['x-uigen-server'];
  if (typeof header === 'string' && header.trim()) {
    return header.trim();
  }

  if (Array.isArray(header)) {
    const first = header.find((value) => value.trim());
    if (first) {
      return first.trim();
    }
  }

  const incoming = new URL(requestUrl, 'http://localhost');
  const queryServer = incoming.searchParams.get('x-uigen-server');
  if (queryServer?.trim()) {
    return queryServer.trim();
  }

  return defaultProxyTarget;
}

export { UIGEN_AUTH_QUERY_PARAMS };

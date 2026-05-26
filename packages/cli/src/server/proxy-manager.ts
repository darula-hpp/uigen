/**
 * Proxy management module
 * Handles auth headers and proxy configuration
 */

import type { IncomingMessage } from 'http';
import pc from 'picocolors';

export class ProxyManager {
  /**
   * Inject auth headers and strip uigen-specific ones
   * Mutates the headers object in place
   */
  injectAuthHeaders(
    headers: Record<string, string | string[]>,
    incoming: IncomingMessage,
    targetUrl: URL,
    verbose: boolean
  ): void {
    const authHeader = incoming.headers['x-uigen-auth'];
    const basicAuth = incoming.headers['x-uigen-basic-auth'];
    const apiKeyHeader = incoming.headers['x-uigen-api-key'];
    const apiKeyName = incoming.headers['x-uigen-api-key-name'];
    const apiKeyIn = incoming.headers['x-uigen-api-key-in'];

    if (authHeader) {
      headers['authorization'] = `Bearer ${authHeader}`;
      if (verbose) console.log(pc.gray('  [Auth] Bearer token'));
    }
    
    if (basicAuth) {
      headers['authorization'] = `Basic ${basicAuth}`;
      if (verbose) console.log(pc.gray('  [Auth] Basic auth'));
    }
    
    if (apiKeyHeader && apiKeyName) {
      if (apiKeyIn === 'header') {
        headers[apiKeyName as string] = apiKeyHeader as string;
        if (verbose) console.log(pc.gray(`  [Auth] API key header: ${apiKeyName}`));
      } else if (apiKeyIn === 'query') {
        targetUrl.searchParams.set(apiKeyName as string, apiKeyHeader as string);
        if (verbose) console.log(pc.gray(`  [Auth] API key query: ${apiKeyName}`));
      }
    }

    // Strip uigen-specific headers
    const uigenHeaders = [
      'x-uigen-auth',
      'x-uigen-api-key',
      'x-uigen-api-key-name',
      'x-uigen-api-key-in',
      'x-uigen-basic-auth',
      'x-uigen-server'
    ];
    
    for (const h of uigenHeaders) {
      delete headers[h];
    }
  }

  /**
   * Inject auth from UIGen query params on WebSocket URLs (browser cannot set WS headers).
   * Mutates headers in place; targetUrl search params are stripped by buildProxyTargetUrl.
   */
  injectAuthFromQuery(
    headers: Record<string, string | string[]>,
    incomingUrl: URL,
    targetUrl: URL,
    verbose: boolean
  ): void {
    const authHeader = incomingUrl.searchParams.get('x-uigen-auth');
    const basicAuth = incomingUrl.searchParams.get('x-uigen-basic-auth');
    const apiKeyHeader = incomingUrl.searchParams.get('x-uigen-api-key');
    const apiKeyName = incomingUrl.searchParams.get('x-uigen-api-key-name');
    const apiKeyIn = incomingUrl.searchParams.get('x-uigen-api-key-in');

    if (authHeader) {
      headers.authorization = `Bearer ${authHeader}`;
      if (verbose) console.log(pc.gray('  [Auth] Bearer token (query)'));
    }

    if (basicAuth) {
      headers.authorization = `Basic ${basicAuth}`;
      if (verbose) console.log(pc.gray('  [Auth] Basic auth (query)'));
    }

    if (apiKeyHeader && apiKeyName) {
      switch (apiKeyIn) {
        case 'header':
          headers[apiKeyName] = apiKeyHeader;
          if (verbose) console.log(pc.gray(`  [Auth] API key header (query): ${apiKeyName}`));
          break;
        case 'query':
          targetUrl.searchParams.set(apiKeyName, apiKeyHeader);
          if (verbose) console.log(pc.gray(`  [Auth] API key query (query): ${apiKeyName}`));
          break;
        default:
          break;
      }
    }
  }
}

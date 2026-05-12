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
}

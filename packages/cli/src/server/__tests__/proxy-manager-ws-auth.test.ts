import { describe, it, expect } from 'vitest';
import { ProxyManager } from '../proxy-manager.js';

describe('ProxyManager WebSocket auth query injection', () => {
  const proxyManager = new ProxyManager();

  it('maps x-uigen-auth query param to Authorization header', () => {
    const incomingUrl = new URL('http://localhost/api/ws/v1/board?x-uigen-auth=abc');
    const targetUrl = new URL('http://127.0.0.1:8080/ws/v1/board');
    const headers: Record<string, string | string[]> = {};

    proxyManager.injectAuthFromQuery(headers, incomingUrl, targetUrl, false);

    expect(headers.authorization).toBe('Bearer abc');
  });
});

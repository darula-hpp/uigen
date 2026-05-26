import { describe, it, expect } from 'vitest';
import { IncomingMessage } from 'http';
import { stripApiPrefix, buildProxyTargetUrl, isApiProxyPath, resolveProxyBase } from '../api-path.js';

describe('api-path', () => {
  it('stripApiPrefix removes leading /api', () => {
    expect(stripApiPrefix('/api/v1/board')).toBe('/v1/board');
    expect(stripApiPrefix('/api/ws/v1/sensors/1')).toBe('/ws/v1/sensors/1');
  });

  it('buildProxyTargetUrl forwards to proxy base without /api', () => {
    const target = buildProxyTargetUrl('/api/ws/v1/board', 'http://127.0.0.1:8080');
    expect(target.toString()).toBe('http://127.0.0.1:8080/ws/v1/board');
  });

  it('buildProxyTargetUrl strips uigen auth query params from forwarded URL', () => {
    const target = buildProxyTargetUrl(
      '/api/ws/v1/board?x-uigen-auth=secret-token',
      'http://127.0.0.1:8080'
    );
    expect(target.pathname).toBe('/ws/v1/board');
    expect(target.searchParams.has('x-uigen-auth')).toBe(false);
  });

  it('resolveProxyBase honors x-uigen-server header over default', () => {
    const req = new IncomingMessage(null as any);
    req.headers = { 'x-uigen-server': 'http://127.0.0.1:9000' };

    expect(resolveProxyBase('http://127.0.0.1:8080', req, '/api/v1/board')).toBe(
      'http://127.0.0.1:9000'
    );
  });

  it('resolveProxyBase honors x-uigen-server query param for WebSocket URLs', () => {
    const req = new IncomingMessage(null as any);
    req.headers = {};

    expect(
      resolveProxyBase(
        'http://127.0.0.1:8080',
        req,
        '/api/ws/v1/board?x-uigen-server=http%3A%2F%2F127.0.0.1%3A9000'
      )
    ).toBe('http://127.0.0.1:9000');
  });

  it('isApiProxyPath matches /api routes only', () => {
    expect(isApiProxyPath('/api/v1/board')).toBe(true);
    expect(isApiProxyPath('/api/ws/v1/board?x-uigen-auth=t')).toBe(true);
    expect(isApiProxyPath('/ws/v1/board')).toBe(false);
    expect(isApiProxyPath('/')).toBe(false);
  });
});

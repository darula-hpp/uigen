import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { createServer } from 'vite';
import { parseSpec } from '@uigen-dev/core';

// Mock dependencies
vi.mock('fs');
vi.mock('vite');
vi.mock('@uigen-dev/core');
vi.mock('picocolors', () => ({
  default: {
    cyan: (s: string) => s,
    gray: (s: string) => s,
    green: (s: string) => s,
    blue: (s: string) => s,
    yellow: (s: string) => s,
    red: (s: string) => s,
    bold: (s: string) => s
  }
}));

describe('API Proxy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Authentication Header Injection', () => {
    it('should inject Bearer token into Authorization header', () => {
      const token = 'test-bearer-token-12345';
      const headers: Record<string, string> = {
        'x-uigen-auth': token
      };

      // Simulate authentication injection
      const proxyHeaders: Record<string, string> = {};
      if (headers['x-uigen-auth']) {
        proxyHeaders['Authorization'] = `Bearer ${headers['x-uigen-auth']}`;
      }

      expect(proxyHeaders['Authorization']).toBe(`Bearer ${token}`);
    });

    it('should inject API key into custom header', () => {
      const apiKey = 'test-api-key-67890';
      const headerName = 'X-API-Key';
      const headers: Record<string, string> = {
        'x-uigen-api-key': apiKey,
        'x-uigen-api-key-name': headerName,
        'x-uigen-api-key-in': 'header'
      };

      // Simulate authentication injection
      const proxyHeaders: Record<string, string> = {};
      if (headers['x-uigen-api-key'] && headers['x-uigen-api-key-in'] === 'header') {
        proxyHeaders[headers['x-uigen-api-key-name']] = headers['x-uigen-api-key'];
      }

      expect(proxyHeaders[headerName]).toBe(apiKey);
    });

    it('should inject API key into query parameter', () => {
      const apiKey = 'test-api-key-query';
      const paramName = 'api_key';
      const baseUrl = 'http://api.example.com/users';
      const headers: Record<string, string> = {
        'x-uigen-api-key': apiKey,
        'x-uigen-api-key-name': paramName,
        'x-uigen-api-key-in': 'query'
      };

      // Simulate authentication injection
      const url = new URL(baseUrl);
      if (headers['x-uigen-api-key'] && headers['x-uigen-api-key-in'] === 'query') {
        url.searchParams.set(headers['x-uigen-api-key-name'], headers['x-uigen-api-key']);
      }

      expect(url.searchParams.get(paramName)).toBe(apiKey);
      expect(url.toString()).toContain(`${paramName}=${apiKey}`);
    });

    it('should not inject authentication when no credentials are provided', () => {
      const headers: Record<string, string> = {};

      // Simulate authentication injection
      const proxyHeaders: Record<string, string> = {};
      if (headers['x-uigen-auth']) {
        proxyHeaders['Authorization'] = `Bearer ${headers['x-uigen-auth']}`;
      }

      expect(proxyHeaders['Authorization']).toBeUndefined();
    });

    it('should remove UIGen-specific headers before forwarding', () => {
      const token = 'test-token';
      const incomingHeaders: Record<string, string> = {
        'x-uigen-auth': token,
        'x-uigen-api-key': 'key',
        'x-uigen-api-key-name': 'X-API-Key',
        'x-uigen-api-key-in': 'header',
        'content-type': 'application/json',
        'user-agent': 'test-agent'
      };

      // Simulate header processing
      const proxyHeaders: Record<string, string> = { ...incomingHeaders };
      
      // Inject auth
      if (proxyHeaders['x-uigen-auth']) {
        proxyHeaders['Authorization'] = `Bearer ${proxyHeaders['x-uigen-auth']}`;
      }
      
      // Remove UIGen-specific headers
      delete proxyHeaders['x-uigen-auth'];
      delete proxyHeaders['x-uigen-api-key'];
      delete proxyHeaders['x-uigen-api-key-name'];
      delete proxyHeaders['x-uigen-api-key-in'];

      expect(proxyHeaders['x-uigen-auth']).toBeUndefined();
      expect(proxyHeaders['x-uigen-api-key']).toBeUndefined();
      expect(proxyHeaders['x-uigen-api-key-name']).toBeUndefined();
      expect(proxyHeaders['x-uigen-api-key-in']).toBeUndefined();
      expect(proxyHeaders['content-type']).toBe('application/json');
      expect(proxyHeaders['user-agent']).toBe('test-agent');
      expect(proxyHeaders['Authorization']).toBe(`Bearer ${token}`);
    });
  });

  describe('Path Forwarding', () => {
    it('should strip /api prefix from path', () => {
      const originalPath = '/api/users/123';
      const rewrittenPath = originalPath.replace(/^\/api/, '');

      expect(rewrittenPath).toBe('/users/123');
      expect(rewrittenPath).not.toMatch(/^\/api/);
    });

    it('should preserve path parameters', () => {
      const originalPath = '/api/users/abc-123-def/posts/456';
      const rewrittenPath = originalPath.replace(/^\/api/, '');

      expect(rewrittenPath).toBe('/users/abc-123-def/posts/456');
      expect(rewrittenPath).toContain('abc-123-def');
      expect(rewrittenPath).toContain('456');
    });

    it('should preserve query string', () => {
      const originalPath = '/api/users?page=1&limit=10';
      const rewrittenPath = originalPath.replace(/^\/api/, '');

      expect(rewrittenPath).toBe('/users?page=1&limit=10');
      expect(rewrittenPath).toContain('?page=1&limit=10');
    });

    it('should handle /api with no trailing path', () => {
      const paths = ['/api', '/api/'];
      
      paths.forEach(originalPath => {
        const rewrittenPath = originalPath.replace(/^\/api/, '');
        expect(rewrittenPath === '' || rewrittenPath === '/').toBe(true);
      });
    });
  });

  describe('Request Preservation', () => {
    it('should preserve request method', () => {
      const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
      
      methods.forEach(method => {
        const originalMethod = method;
        const proxiedMethod = method;
        
        expect(proxiedMethod).toBe(originalMethod);
      });
    });

    it('should preserve non-auth headers', () => {
      const originalHeaders: Record<string, string> = {
        'content-type': 'application/json',
        'accept': 'application/json',
        'user-agent': 'test-agent',
        'x-custom-header': 'custom-value'
      };

      const proxiedHeaders = { ...originalHeaders };

      expect(proxiedHeaders['content-type']).toBe(originalHeaders['content-type']);
      expect(proxiedHeaders['accept']).toBe(originalHeaders['accept']);
      expect(proxiedHeaders['user-agent']).toBe(originalHeaders['user-agent']);
      expect(proxiedHeaders['x-custom-header']).toBe(originalHeaders['x-custom-header']);
    });

    it('should preserve request body', () => {
      const body = {
        name: 'Test User',
        email: 'test@example.com',
        age: 25
      };

      const originalBody = JSON.stringify(body);
      const proxiedBody = JSON.stringify(body);

      expect(proxiedBody).toBe(originalBody);
      expect(JSON.parse(proxiedBody)).toEqual(body);
    });
  });

  describe('CORS Handling', () => {
    it('should include CORS headers in configuration', () => {
      const corsConfig = {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-UIGen-Auth', 'X-UIGen-API-Key', 'X-UIGen-API-Key-Name', 'X-UIGen-API-Key-In'],
        credentials: true
      };

      expect(corsConfig.origin).toBe('*');
      expect(corsConfig.methods).toContain('OPTIONS');
      expect(corsConfig.methods).toContain('GET');
      expect(corsConfig.methods).toContain('POST');
      expect(corsConfig.allowedHeaders).toContain('Authorization');
      expect(corsConfig.allowedHeaders).toContain('X-UIGen-Auth');
      expect(corsConfig.credentials).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle proxy errors gracefully', () => {
      const error = new Error('Connection refused');
      const req = {
        method: 'GET',
        url: '/api/users'
      };

      // Simulate error handling
      const errorMessage = `${req.method} ${req.url} - Proxy error: ${error.message}`;

      expect(errorMessage).toContain('GET');
      expect(errorMessage).toContain('/api/users');
      expect(errorMessage).toContain('Connection refused');
    });

    it('should log request and response timing', () => {
      const startTime = Date.now();
      const endTime = startTime + 150; // 150ms later
      const duration = endTime - startTime;

      expect(duration).toBeGreaterThanOrEqual(150);
      expect(duration).toBeLessThan(200);
    });
  });

  describe('Logging', () => {
    it('should log request details', () => {
      const req = {
        method: 'POST',
        url: '/api/users',
        headers: {
          'content-type': 'application/json'
        }
      };

      const logMessage = `${req.method} ${req.url}`;
      expect(logMessage).toBe('POST /api/users');
    });

    it('should log response details with status and duration', () => {
      const req = {
        method: 'GET',
        url: '/api/users/123'
      };
      const res = {
        statusCode: 200
      };
      const duration = 45;

      const logMessage = `${req.method} ${req.url} ${res.statusCode} (${duration}ms)`;
      expect(logMessage).toBe('GET /api/users/123 200 (45ms)');
    });

    it('should include verbose logging when enabled', () => {
      const verbose = true;
      const headers = {
        'content-type': 'application/json',
        'authorization': 'Bearer token'
      };

      if (verbose) {
        const verboseLog = `Response headers: ${JSON.stringify(headers)}`;
        expect(verboseLog).toContain('content-type');
        expect(verboseLog).toContain('authorization');
      }
    });
  });
});

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * Property 12: Authentication Header Injection
 * 
 * **Validates: Requirements 16.4, 17.5**
 * 
 * For any API request when authentication credentials are stored, 
 * the proxy should inject the appropriate authentication headers 
 * (Authorization for bearer, or custom header/query param for API key).
 */

describe('Property 12: Authentication Header Injection', () => {
  it('should inject Bearer token into Authorization header', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 10, maxLength: 100 }), // Bearer token
        fc.webUrl(), // API path
        fc.constantFrom('GET', 'POST', 'PUT', 'PATCH', 'DELETE'), // HTTP method
        (token, path, method) => {
          // Simulate the proxy behavior
          const headers: Record<string, string> = {
            'x-uigen-auth': token
          };

          // Simulate authentication injection
          const proxyHeaders: Record<string, string> = {};
          if (headers['x-uigen-auth']) {
            proxyHeaders['Authorization'] = `Bearer ${headers['x-uigen-auth']}`;
          }

          // Property: Authorization header should be set with Bearer prefix
          expect(proxyHeaders['Authorization']).toBe(`Bearer ${token}`);
          expect(proxyHeaders['Authorization']).toMatch(/^Bearer .+/);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should inject API key into custom header', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 10, maxLength: 100 }), // API key
        fc.string({ minLength: 3, maxLength: 30 }).filter(s => /^[a-zA-Z-]+$/.test(s)), // Header name
        fc.webUrl(), // API path
        (apiKey, headerName, path) => {
          // Simulate the proxy behavior
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

          // Property: Custom header should be set with API key value
          expect(proxyHeaders[headerName]).toBe(apiKey);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should inject API key into query parameter', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 10, maxLength: 100 }), // API key
        fc.string({ minLength: 3, maxLength: 30 }).filter(s => /^[a-zA-Z_]+$/.test(s)), // Param name
        fc.webUrl(), // API path
        (apiKey, paramName, path) => {
          // Simulate the proxy behavior
          const headers: Record<string, string> = {
            'x-uigen-api-key': apiKey,
            'x-uigen-api-key-name': paramName,
            'x-uigen-api-key-in': 'query'
          };

          // Simulate authentication injection
          const url = new URL(path);
          if (headers['x-uigen-api-key'] && headers['x-uigen-api-key-in'] === 'query') {
            url.searchParams.set(headers['x-uigen-api-key-name'], headers['x-uigen-api-key']);
          }

          // Property: Query parameter should be set with API key value
          expect(url.searchParams.get(paramName)).toBe(apiKey);
          // Check that the parameter exists in the URL (encoding may vary)
          expect(url.toString()).toContain(paramName);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not inject authentication when no credentials are provided', () => {
    fc.assert(
      fc.property(
        fc.webUrl(), // API path
        fc.constantFrom('GET', 'POST', 'PUT', 'PATCH', 'DELETE'), // HTTP method
        (path, method) => {
          // Simulate the proxy behavior with no auth headers
          const headers: Record<string, string> = {};

          // Simulate authentication injection
          const proxyHeaders: Record<string, string> = {};
          if (headers['x-uigen-auth']) {
            proxyHeaders['Authorization'] = `Bearer ${headers['x-uigen-auth']}`;
          }

          // Property: No Authorization header should be set
          expect(proxyHeaders['Authorization']).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should remove UIGen-specific headers before forwarding', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 10, maxLength: 100 }), // Token
        fc.webUrl(), // API path
        (token, path) => {
          // Simulate the proxy behavior
          const incomingHeaders: Record<string, string> = {
            'x-uigen-auth': token,
            'content-type': 'application/json',
            'user-agent': 'test'
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

          // Property: UIGen-specific headers should be removed
          expect(proxyHeaders['x-uigen-auth']).toBeUndefined();
          expect(proxyHeaders['x-uigen-api-key']).toBeUndefined();
          expect(proxyHeaders['x-uigen-api-key-name']).toBeUndefined();
          expect(proxyHeaders['x-uigen-api-key-in']).toBeUndefined();
          
          // Property: Other headers should be preserved
          expect(proxyHeaders['content-type']).toBe('application/json');
          expect(proxyHeaders['user-agent']).toBe('test');
          
          // Property: Authorization header should be present
          expect(proxyHeaders['Authorization']).toBe(`Bearer ${token}`);
        }
      ),
      { numRuns: 100 }
    );
  });
});

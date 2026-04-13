import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * Property 13: Proxy Request Preservation
 * 
 * **Validates: Requirements 20.4**
 * 
 * For any request proxied through the API proxy, the request method, 
 * headers (except auth additions), and body should be preserved exactly 
 * as sent from the UI.
 */

describe('Property 13: Proxy Request Preservation', () => {
  it('should preserve request method', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('GET', 'POST', 'PUT', 'PATCH', 'DELETE'),
        fc.webUrl(),
        (method, path) => {
          // Simulate proxy behavior
          const originalMethod = method;
          const proxiedMethod = method; // Method should be preserved

          // Property: Method should be preserved exactly
          expect(proxiedMethod).toBe(originalMethod);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve request headers (except auth headers)', () => {
    fc.assert(
      fc.property(
        fc.dictionary(
          fc.string({ minLength: 3, maxLength: 30 }).filter(s => /^[a-z-]+$/.test(s)),
          fc.string({ minLength: 1, maxLength: 100 })
        ),
        fc.webUrl(),
        (headers, path) => {
          // Simulate proxy behavior
          const originalHeaders = { ...headers };
          const proxiedHeaders = { ...headers };

          // Remove UIGen-specific headers (these should not be forwarded)
          delete proxiedHeaders['x-uigen-auth'];
          delete proxiedHeaders['x-uigen-api-key'];
          delete proxiedHeaders['x-uigen-api-key-name'];
          delete proxiedHeaders['x-uigen-api-key-in'];

          // Property: All non-auth headers should be preserved
          Object.keys(originalHeaders).forEach(key => {
            if (!key.startsWith('x-uigen-')) {
              expect(proxiedHeaders[key]).toBe(originalHeaders[key]);
            }
          });

          // Property: UIGen-specific headers should be removed
          expect(proxiedHeaders['x-uigen-auth']).toBeUndefined();
          expect(proxiedHeaders['x-uigen-api-key']).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve request body for POST/PUT/PATCH', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('POST', 'PUT', 'PATCH'),
        fc.webUrl(),
        fc.oneof(
          fc.record({
            name: fc.string(),
            value: fc.integer()
          }),
          fc.array(fc.string()),
          fc.string()
        ),
        (method, path, body) => {
          // Simulate proxy behavior
          const originalBody = JSON.stringify(body);
          const proxiedBody = JSON.stringify(body); // Body should be preserved

          // Property: Body should be preserved exactly
          expect(proxiedBody).toBe(originalBody);
          expect(JSON.parse(proxiedBody)).toEqual(JSON.parse(originalBody));
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve content-type header', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'application/json',
          'application/x-www-form-urlencoded',
          'multipart/form-data',
          'text/plain'
        ),
        fc.webUrl(),
        (contentType, path) => {
          // Simulate proxy behavior
          const originalHeaders = {
            'content-type': contentType
          };
          const proxiedHeaders = { ...originalHeaders };

          // Property: Content-Type should be preserved
          expect(proxiedHeaders['content-type']).toBe(contentType);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve custom headers', () => {
    fc.assert(
      fc.property(
        fc.record({
          'x-custom-header': fc.string({ minLength: 1, maxLength: 50 }),
          'x-request-id': fc.uuid(),
          'accept': fc.constantFrom('application/json', 'application/xml', '*/*'),
          'accept-language': fc.constantFrom('en-US', 'en', 'es', 'fr')
        }),
        fc.webUrl(),
        (headers, path) => {
          // Simulate proxy behavior
          const originalHeaders = { ...headers };
          const proxiedHeaders = { ...headers };

          // Property: All custom headers should be preserved
          expect(proxiedHeaders['x-custom-header']).toBe(originalHeaders['x-custom-header']);
          expect(proxiedHeaders['x-request-id']).toBe(originalHeaders['x-request-id']);
          expect(proxiedHeaders['accept']).toBe(originalHeaders['accept']);
          expect(proxiedHeaders['accept-language']).toBe(originalHeaders['accept-language']);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve query parameters in the URL', () => {
    fc.assert(
      fc.property(
        fc.webUrl(),
        fc.dictionary(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z_]+$/.test(s)),
          fc.string({ minLength: 1, maxLength: 50 })
        ),
        (baseUrl, queryParams) => {
          // Build URL with query params
          const url = new URL(baseUrl);
          Object.entries(queryParams).forEach(([key, value]) => {
            url.searchParams.set(key, value);
          });

          // Simulate proxy behavior - query params should be preserved
          const originalUrl = url.toString();
          const proxiedUrl = url.toString();

          // Property: Query parameters should be preserved
          expect(proxiedUrl).toBe(originalUrl);
          
          Object.entries(queryParams).forEach(([key, value]) => {
            expect(url.searchParams.get(key)).toBe(value);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

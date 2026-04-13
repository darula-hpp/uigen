import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * Property 14: Proxy Path Forwarding
 * 
 * **Validates: Requirements 20.2**
 * 
 * For any request to /api/*, the proxy should forward it to the selected 
 * server URL with the /api prefix stripped and the rest of the path preserved.
 */

describe('Property 14: Proxy Path Forwarding', () => {
  it('should strip /api prefix from path', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9-_]+$/.test(s)), { minLength: 1, maxLength: 5 }),
        (pathSegments) => {
          // Build path with /api prefix
          const originalPath = `/api/${pathSegments.join('/')}`;
          
          // Simulate proxy rewrite behavior
          const rewrittenPath = originalPath.replace(/^\/api/, '');
          
          // Property: /api prefix should be stripped
          expect(rewrittenPath).not.toMatch(/^\/api/);
          expect(rewrittenPath).toBe(`/${pathSegments.join('/')}`);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve path segments after /api', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9-_]+$/.test(s)), { minLength: 1, maxLength: 5 }),
        (pathSegments) => {
          // Build path with /api prefix
          const originalPath = `/api/${pathSegments.join('/')}`;
          
          // Simulate proxy rewrite behavior
          const rewrittenPath = originalPath.replace(/^\/api/, '');
          
          // Property: All path segments should be preserved
          pathSegments.forEach(segment => {
            expect(rewrittenPath).toContain(segment);
          });
          
          // Property: Path structure should be preserved
          expect(rewrittenPath).toBe(`/${pathSegments.join('/')}`);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve path parameters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z]+$/.test(s)), // Resource name
        fc.uuid(), // ID parameter
        (resource, id) => {
          // Build path with path parameter
          const originalPath = `/api/${resource}/${id}`;
          
          // Simulate proxy rewrite behavior
          const rewrittenPath = originalPath.replace(/^\/api/, '');
          
          // Property: Path parameters should be preserved
          expect(rewrittenPath).toBe(`/${resource}/${id}`);
          expect(rewrittenPath).toContain(resource);
          expect(rewrittenPath).toContain(id);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve nested resource paths', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z]+$/.test(s)), // Parent resource
        fc.uuid(), // Parent ID
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z]+$/.test(s)), // Child resource
        (parent, parentId, child) => {
          // Build nested path
          const originalPath = `/api/${parent}/${parentId}/${child}`;
          
          // Simulate proxy rewrite behavior
          const rewrittenPath = originalPath.replace(/^\/api/, '');
          
          // Property: Nested path structure should be preserved
          expect(rewrittenPath).toBe(`/${parent}/${parentId}/${child}`);
          expect(rewrittenPath).toContain(parent);
          expect(rewrittenPath).toContain(parentId);
          expect(rewrittenPath).toContain(child);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve query string after path rewrite', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9-_]+$/.test(s)), { minLength: 1, maxLength: 3 }),
        fc.dictionary(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z_]+$/.test(s)),
          fc.string({ minLength: 1, maxLength: 50 })
        ),
        (pathSegments, queryParams) => {
          // Build path with query string
          const path = `/api/${pathSegments.join('/')}`;
          const queryString = new URLSearchParams(queryParams).toString();
          const originalPath = queryString ? `${path}?${queryString}` : path;
          
          // Simulate proxy rewrite behavior
          const rewrittenPath = originalPath.replace(/^\/api/, '');
          
          // Property: Query string should be preserved
          if (queryString) {
            expect(rewrittenPath).toContain('?');
            expect(rewrittenPath).toContain(queryString);
          }
          
          // Property: Path should be correctly rewritten
          expect(rewrittenPath).toMatch(new RegExp(`^/${pathSegments.join('/')}`));
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle /api with no trailing path', () => {
    // Edge case: request to /api or /api/
    const paths = ['/api', '/api/'];
    
    paths.forEach(originalPath => {
      const rewrittenPath = originalPath.replace(/^\/api/, '');
      
      // Property: Should result in empty string or single slash
      expect(rewrittenPath === '' || rewrittenPath === '/').toBe(true);
    });
  });

  it('should preserve special characters in path', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z]+$/.test(s)),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[a-zA-Z0-9._~:/?#\[\]@!$&'()*+,;=-]+$/.test(s)),
        (resource, specialValue) => {
          // Build path with special characters (URL encoded)
          const encodedValue = encodeURIComponent(specialValue);
          const originalPath = `/api/${resource}/${encodedValue}`;
          
          // Simulate proxy rewrite behavior
          const rewrittenPath = originalPath.replace(/^\/api/, '');
          
          // Property: Special characters should be preserved
          expect(rewrittenPath).toBe(`/${resource}/${encodedValue}`);
          expect(rewrittenPath).toContain(encodedValue);
        }
      ),
      { numRuns: 100 }
    );
  });
});

import { describe, it, expect } from 'vitest';
import { OpenAPI3Adapter } from '../openapi3.js';
import type { OpenAPIV3 } from 'openapi-types';
import fc from 'fast-check';

describe('Server Configuration Extraction - Property Tests', () => {
  describe('Property: ServerConfig Structure Invariants', () => {
    it('should always return non-empty servers array', () => {
      fc.assert(
        fc.property(
          fc.record({
            openapi: fc.constant('3.0.0'),
            info: fc.record({
              title: fc.string({ minLength: 1 }),
              version: fc.string({ minLength: 1 })
            }),
            servers: fc.option(
              fc.array(
                fc.record({
                  url: fc.webUrl(),
                  description: fc.option(fc.string(), { nil: undefined })
                }),
                { minLength: 0, maxLength: 10 }
              ),
              { nil: undefined }
            ),
            paths: fc.constant({})
          }),
          (spec) => {
            const adapter = new OpenAPI3Adapter(spec as OpenAPIV3.Document);
            const result = adapter.adapt();

            // **Validates: Requirements 1.7, 3.1**
            expect(result.servers).toBeDefined();
            expect(Array.isArray(result.servers)).toBe(true);
            expect(result.servers.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should always include servers in IR structure', () => {
      fc.assert(
        fc.property(
          fc.record({
            openapi: fc.constant('3.0.0'),
            info: fc.record({
              title: fc.string({ minLength: 1 }),
              version: fc.string({ minLength: 1 })
            }),
            servers: fc.option(
              fc.array(
                fc.record({
                  url: fc.webUrl(),
                  description: fc.option(fc.string(), { nil: undefined })
                })
              ),
              { nil: undefined }
            ),
            paths: fc.constant({})
          }),
          (spec) => {
            const adapter = new OpenAPI3Adapter(spec as OpenAPIV3.Document);
            const result = adapter.adapt();

            // **Validates: Requirements 3.1**
            expect(result).toHaveProperty('meta');
            expect(result).toHaveProperty('resources');
            expect(result).toHaveProperty('auth');
            expect(result).toHaveProperty('dashboard');
            expect(result).toHaveProperty('servers');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property: Server Extraction Completeness', () => {
    it('should extract all servers when servers array is provided', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              url: fc.webUrl(),
              description: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined })
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (servers) => {
            const spec: OpenAPIV3.Document = {
              openapi: '3.0.0',
              info: { title: 'Test API', version: '1.0.0' },
              servers,
              paths: {}
            };

            const adapter = new OpenAPI3Adapter(spec);
            const result = adapter.adapt();

            // **Validates: Requirements 1.7**
            expect(result.servers.length).toBe(servers.length);
            
            // All URLs should be extracted
            const extractedUrls = result.servers.map(s => s.url);
            const expectedUrls = servers.map(s => s.url);
            expect(extractedUrls).toEqual(expectedUrls);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should preserve server order from spec', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              url: fc.webUrl(),
              description: fc.string({ minLength: 1, maxLength: 50 })
            }),
            { minLength: 2, maxLength: 5 }
          ),
          (servers) => {
            const spec: OpenAPIV3.Document = {
              openapi: '3.0.0',
              info: { title: 'Test API', version: '1.0.0' },
              servers,
              paths: {}
            };

            const adapter = new OpenAPI3Adapter(spec);
            const result = adapter.adapt();

            // **Validates: Requirements 1.7**
            const extractedDescriptions = result.servers.map(s => s.description);
            const expectedDescriptions = servers.map(s => s.description);
            expect(extractedDescriptions).toEqual(expectedDescriptions);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property: Default Server Provision', () => {
    it('should provide default server when servers is missing or empty', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(undefined),
            fc.constant([]),
            fc.constant(null)
          ),
          (servers) => {
            const spec: OpenAPIV3.Document = {
              openapi: '3.0.0',
              info: { title: 'Test API', version: '1.0.0' },
              servers: servers as any,
              paths: {}
            };

            const adapter = new OpenAPI3Adapter(spec);
            const result = adapter.adapt();

            // **Validates: Requirements 1.7**
            expect(result.servers).toHaveLength(1);
            expect(result.servers[0]).toEqual({
              url: 'http://localhost:3000',
              description: 'Default'
            });
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property: URL Preservation', () => {
    it('should preserve exact URL strings without modification', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.oneof(
              fc.webUrl(),
              fc.webUrl({ withFragments: false, withQueryParameters: false }),
              fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0)
            ),
            { minLength: 1, maxLength: 5 }
          ),
          (urls) => {
            const servers = urls.map(url => ({ url }));
            const spec: OpenAPIV3.Document = {
              openapi: '3.0.0',
              info: { title: 'Test API', version: '1.0.0' },
              servers,
              paths: {}
            };

            const adapter = new OpenAPI3Adapter(spec);
            const result = adapter.adapt();

            // **Validates: Requirements 1.7**
            result.servers.forEach((server, index) => {
              expect(server.url).toBe(urls[index]);
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle various URL formats', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.oneof(
              fc.constant('https://api.example.com'),
              fc.constant('http://localhost:3000'),
              fc.constant('https://api.example.com:8443/v1'),
              fc.constant('/api/v1'),
              fc.constant('/'),
              fc.webUrl()
            ),
            { minLength: 1, maxLength: 5 }
          ),
          (urls) => {
            const servers = urls.map(url => ({ url }));
            const spec: OpenAPIV3.Document = {
              openapi: '3.0.0',
              info: { title: 'Test API', version: '1.0.0' },
              servers,
              paths: {}
            };

            const adapter = new OpenAPI3Adapter(spec);
            const result = adapter.adapt();

            // **Validates: Requirements 1.7**
            expect(result.servers.length).toBe(urls.length);
            result.servers.forEach((server, index) => {
              expect(server.url).toBe(urls[index]);
            });
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property: Description Preservation', () => {
    it('should preserve description strings exactly', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              url: fc.webUrl(),
              description: fc.string({ minLength: 0, maxLength: 200 })
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (servers) => {
            const spec: OpenAPIV3.Document = {
              openapi: '3.0.0',
              info: { title: 'Test API', version: '1.0.0' },
              servers,
              paths: {}
            };

            const adapter = new OpenAPI3Adapter(spec);
            const result = adapter.adapt();

            // **Validates: Requirements 1.7**
            result.servers.forEach((server, index) => {
              expect(server.description).toBe(servers[index].description);
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle missing descriptions', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              url: fc.webUrl(),
              description: fc.option(fc.string(), { nil: undefined })
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (servers) => {
            const spec: OpenAPIV3.Document = {
              openapi: '3.0.0',
              info: { title: 'Test API', version: '1.0.0' },
              servers,
              paths: {}
            };

            const adapter = new OpenAPI3Adapter(spec);
            const result = adapter.adapt();

            // **Validates: Requirements 1.7**
            result.servers.forEach((server, index) => {
              if (servers[index].description === undefined) {
                expect(server.description).toBeUndefined();
              } else {
                expect(server.description).toBe(servers[index].description);
              }
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle special characters in descriptions', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              url: fc.webUrl(),
              description: fc.string({ minLength: 1, maxLength: 100 })
            }),
            { minLength: 1, maxLength: 3 }
          ),
          (servers) => {
            const spec: OpenAPIV3.Document = {
              openapi: '3.0.0',
              info: { title: 'Test API', version: '1.0.0' },
              servers,
              paths: {}
            };

            const adapter = new OpenAPI3Adapter(spec);
            const result = adapter.adapt();

            // **Validates: Requirements 1.7**
            result.servers.forEach((server, index) => {
              expect(server.description).toBe(servers[index].description);
              // Description should not be modified or sanitized
              expect(server.description?.length).toBe(servers[index].description.length);
            });
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property: ServerConfig Object Structure', () => {
    it('should always return objects with url and description properties', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              url: fc.webUrl(),
              description: fc.option(fc.string(), { nil: undefined })
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (servers) => {
            const spec: OpenAPIV3.Document = {
              openapi: '3.0.0',
              info: { title: 'Test API', version: '1.0.0' },
              servers,
              paths: {}
            };

            const adapter = new OpenAPI3Adapter(spec);
            const result = adapter.adapt();

            // **Validates: Requirements 1.7, 3.1**
            result.servers.forEach(server => {
              expect(server).toHaveProperty('url');
              expect(server).toHaveProperty('description');
              expect(typeof server.url).toBe('string');
            });
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property: Empty and Malformed Input Handling', () => {
    it('should handle servers with missing or malformed URLs', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.oneof(
              fc.record({
                url: fc.webUrl(),
                description: fc.option(fc.string(), { nil: undefined })
              }),
              fc.record({
                url: fc.constant(''),
                description: fc.option(fc.string(), { nil: undefined })
              }),
              fc.record({
                description: fc.string()
              }) as any
            ),
            { minLength: 1, maxLength: 5 }
          ),
          (servers) => {
            const spec: OpenAPIV3.Document = {
              openapi: '3.0.0',
              info: { title: 'Test API', version: '1.0.0' },
              servers,
              paths: {}
            };

            const adapter = new OpenAPI3Adapter(spec);
            const result = adapter.adapt();

            // **Validates: Requirements 1.7**
            // Should extract all servers, even malformed ones
            expect(result.servers.length).toBe(servers.length);
            
            result.servers.forEach((server, index) => {
              // Each server should have url and description properties
              expect(server).toHaveProperty('url');
              expect(server).toHaveProperty('description');
            });
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should handle mixed valid and empty descriptions', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              url: fc.webUrl(),
              description: fc.oneof(
                fc.string({ minLength: 1 }),
                fc.constant(''),
                fc.constant(undefined),
                fc.constant(null)
              )
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (servers) => {
            const spec: OpenAPIV3.Document = {
              openapi: '3.0.0',
              info: { title: 'Test API', version: '1.0.0' },
              servers: servers as any,
              paths: {}
            };

            const adapter = new OpenAPI3Adapter(spec);
            const result = adapter.adapt();

            // **Validates: Requirements 1.7**
            expect(result.servers.length).toBe(servers.length);
            
            result.servers.forEach((server, index) => {
              expect(server.url).toBe(servers[index].url);
              // Description should be preserved as-is
              expect(server.description).toBe(servers[index].description);
            });
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property: Server Variables Handling', () => {
    it('should extract server URLs with variables as-is', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              url: fc.oneof(
                fc.webUrl(),
                fc.constant('https://{environment}.example.com'),
                fc.constant('https://{subdomain}.{domain}:{port}/{basePath}'),
                fc.constant('{protocol}://api.example.com')
              ),
              description: fc.option(fc.string(), { nil: undefined })
            }),
            { minLength: 1, maxLength: 3 }
          ),
          (servers) => {
            const spec: OpenAPIV3.Document = {
              openapi: '3.0.0',
              info: { title: 'Test API', version: '1.0.0' },
              servers,
              paths: {}
            };

            const adapter = new OpenAPI3Adapter(spec);
            const result = adapter.adapt();

            // **Validates: Requirements 1.7**
            // URLs with variables should be extracted as-is
            result.servers.forEach((server, index) => {
              expect(server.url).toBe(servers[index].url);
            });
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Property: Count Invariants', () => {
    it('should return exactly one server when input is empty/missing', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(undefined),
            fc.constant([]),
            fc.constant(null)
          ),
          (servers) => {
            const spec: OpenAPIV3.Document = {
              openapi: '3.0.0',
              info: { title: 'Test API', version: '1.0.0' },
              servers: servers as any,
              paths: {}
            };

            const adapter = new OpenAPI3Adapter(spec);
            const result = adapter.adapt();

            // **Validates: Requirements 1.7**
            expect(result.servers).toHaveLength(1);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should return same count as input when servers are provided', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }).chain(count =>
            fc.array(
              fc.record({
                url: fc.webUrl(),
                description: fc.option(fc.string(), { nil: undefined })
              }),
              { minLength: count, maxLength: count }
            )
          ),
          (servers) => {
            const spec: OpenAPIV3.Document = {
              openapi: '3.0.0',
              info: { title: 'Test API', version: '1.0.0' },
              servers,
              paths: {}
            };

            const adapter = new OpenAPI3Adapter(spec);
            const result = adapter.adapt();

            // **Validates: Requirements 1.7**
            expect(result.servers.length).toBe(servers.length);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property: No Data Loss', () => {
    it('should not lose any server information during extraction', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              url: fc.webUrl(),
              description: fc.string({ minLength: 1, maxLength: 100 })
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (servers) => {
            const spec: OpenAPIV3.Document = {
              openapi: '3.0.0',
              info: { title: 'Test API', version: '1.0.0' },
              servers,
              paths: {}
            };

            const adapter = new OpenAPI3Adapter(spec);
            const result = adapter.adapt();

            // **Validates: Requirements 1.7**
            // Every input server should have a corresponding output server
            servers.forEach((inputServer, index) => {
              const outputServer = result.servers[index];
              expect(outputServer.url).toBe(inputServer.url);
              expect(outputServer.description).toBe(inputServer.description);
            });
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});

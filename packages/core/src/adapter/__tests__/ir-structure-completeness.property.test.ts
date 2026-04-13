import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { OpenAPI3Adapter } from '../openapi3.js';
import type { OpenAPIV3 } from 'openapi-types';

/**
 * Property-Based Tests for IR Structure Completeness
 * 
 * **Validates: Requirements 3.1**
 * 
 * Property 4: IR Structure Completeness
 * 
 * For any successfully parsed specification, the resulting IR must contain 
 * all required top-level fields: meta, resources, auth, dashboard, and servers.
 */

describe('IR Structure Completeness - Property-Based Tests', () => {
  /**
   * **Validates: Requirements 3.1**
   * 
   * Property 4: IR Structure Completeness
   * 
   * The IR must always contain all required top-level fields regardless of input spec.
   */
  it('should always produce IR with all required top-level fields', () => {
    // Arbitrary for generating valid OpenAPI 3.x specifications with varying complexity
    const openApiSpecArb = fc.record({
      openapi: fc.constant('3.0.0'),
      info: fc.record({
        title: fc.string({ minLength: 1, maxLength: 100 }),
        version: fc.stringMatching(/^\d+\.\d+\.\d+$/),
        description: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: undefined })
      }),
      servers: fc.option(
        fc.array(
          fc.record({
            url: fc.webUrl(),
            description: fc.option(fc.string({ minLength: 0, maxLength: 200 }), { nil: undefined })
          }),
          { minLength: 1, maxLength: 5 }
        ),
        { nil: undefined }
      ),
      paths: fc.dictionary(
        // Generate resource paths like /users, /users/{id}, /products, etc.
        fc.oneof(
          fc.tuple(
            fc.constantFrom('users', 'products', 'orders', 'items', 'posts', 'comments', 'categories', 'tags'),
            fc.constant('')
          ).map(([r]) => `/${r}`),
          fc.tuple(
            fc.constantFrom('users', 'products', 'orders', 'items', 'posts', 'comments', 'categories', 'tags'),
            fc.constant('{id}')
          ).map(([r, id]) => `/${r}/${id}`)
        ),
        fc.record({
          get: fc.option(
            fc.record({
              summary: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
              description: fc.option(fc.string({ minLength: 0, maxLength: 300 }), { nil: undefined }),
              operationId: fc.option(fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{2,30}$/), { nil: undefined }),
              parameters: fc.option(
                fc.array(
                  fc.record({
                    name: fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{0,20}$/),
                    in: fc.constantFrom('query', 'path', 'header'),
                    required: fc.boolean(),
                    schema: fc.record({
                      type: fc.constantFrom('string', 'integer', 'number', 'boolean')
                    })
                  }),
                  { minLength: 0, maxLength: 8 }
                ),
                { nil: undefined }
              ),
              responses: fc.record({
                '200': fc.record({
                  description: fc.string({ minLength: 1, maxLength: 100 }),
                  content: fc.option(
                    fc.record({
                      'application/json': fc.record({
                        schema: fc.oneof(
                          // Simple object schema
                          fc.record({
                            type: fc.constant('object' as const),
                            properties: fc.dictionary(
                              fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{0,20}$/),
                              fc.record({
                                type: fc.constantFrom('string', 'integer', 'number', 'boolean'),
                                description: fc.option(fc.string({ minLength: 0, maxLength: 100 }), { nil: undefined })
                              }),
                              { minKeys: 1, maxKeys: 10 }
                            ),
                            required: fc.option(
                              fc.array(fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{0,20}$/), { minLength: 0, maxLength: 5 }),
                              { nil: undefined }
                            )
                          }),
                          // Array schema
                          fc.record({
                            type: fc.constant('array' as const),
                            items: fc.record({
                              type: fc.constant('object' as const),
                              properties: fc.dictionary(
                                fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{0,20}$/),
                                fc.record({
                                  type: fc.constantFrom('string', 'integer', 'number', 'boolean')
                                }),
                                { minKeys: 1, maxKeys: 8 }
                              )
                            })
                          })
                        )
                      })
                    }),
                    { nil: undefined }
                  )
                })
              })
            }),
            { nil: undefined }
          ),
          post: fc.option(
            fc.record({
              summary: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
              description: fc.option(fc.string({ minLength: 0, maxLength: 300 }), { nil: undefined }),
              operationId: fc.option(fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{2,30}$/), { nil: undefined }),
              requestBody: fc.option(
                fc.record({
                  content: fc.record({
                    'application/json': fc.record({
                      schema: fc.record({
                        type: fc.constant('object' as const),
                        properties: fc.dictionary(
                          fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{0,20}$/),
                          fc.record({
                            type: fc.constantFrom('string', 'integer', 'number', 'boolean'),
                            minLength: fc.option(fc.integer({ min: 0, max: 50 }), { nil: undefined }),
                            maxLength: fc.option(fc.integer({ min: 1, max: 200 }), { nil: undefined })
                          }),
                          { minKeys: 1, maxKeys: 12 }
                        ),
                        required: fc.option(
                          fc.array(fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{0,20}$/), { minLength: 0, maxLength: 6 }),
                          { nil: undefined }
                        )
                      })
                    })
                  })
                }),
                { nil: undefined }
              ),
              responses: fc.record({
                '201': fc.record({
                  description: fc.string({ minLength: 1, maxLength: 100 })
                })
              })
            }),
            { nil: undefined }
          ),
          put: fc.option(
            fc.record({
              summary: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
              operationId: fc.option(fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{2,30}$/), { nil: undefined }),
              responses: fc.record({
                '200': fc.record({
                  description: fc.string({ minLength: 1, maxLength: 100 })
                })
              })
            }),
            { nil: undefined }
          ),
          patch: fc.option(
            fc.record({
              summary: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
              operationId: fc.option(fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{2,30}$/), { nil: undefined }),
              responses: fc.record({
                '200': fc.record({
                  description: fc.string({ minLength: 1, maxLength: 100 })
                })
              })
            }),
            { nil: undefined }
          ),
          delete: fc.option(
            fc.record({
              summary: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
              operationId: fc.option(fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{2,30}$/), { nil: undefined }),
              responses: fc.record({
                '204': fc.record({
                  description: fc.string({ minLength: 1, maxLength: 100 })
                })
              })
            }),
            { nil: undefined }
          )
        }).filter(pathItem => 
          // Ensure at least one operation exists
          pathItem.get !== undefined || 
          pathItem.post !== undefined || 
          pathItem.put !== undefined || 
          pathItem.patch !== undefined ||
          pathItem.delete !== undefined
        ),
        { minKeys: 0, maxKeys: 10 }
      ),
      components: fc.option(
        fc.record({
          schemas: fc.option(
            fc.dictionary(
              fc.stringMatching(/^[A-Z][a-zA-Z0-9]{2,20}$/),
              fc.record({
                type: fc.constantFrom('object', 'string', 'integer', 'number', 'boolean'),
                properties: fc.option(
                  fc.dictionary(
                    fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{0,20}$/),
                    fc.record({
                      type: fc.constantFrom('string', 'integer', 'number', 'boolean'),
                      format: fc.option(fc.constantFrom('date', 'date-time', 'email', 'uri'), { nil: undefined })
                    }),
                    { minKeys: 1, maxKeys: 15 }
                  ),
                  { nil: undefined }
                )
              }),
              { minKeys: 0, maxKeys: 8 }
            ),
            { nil: undefined }
          ),
          securitySchemes: fc.option(
            fc.dictionary(
              fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{2,20}$/),
              fc.oneof(
                fc.record({
                  type: fc.constant('http' as const),
                  scheme: fc.constant('bearer'),
                  bearerFormat: fc.option(fc.constant('JWT'), { nil: undefined })
                }),
                fc.record({
                  type: fc.constant('apiKey' as const),
                  name: fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_-]{2,20}$/),
                  in: fc.constantFrom('header', 'query', 'cookie')
                })
              ),
              { minKeys: 0, maxKeys: 5 }
            ),
            { nil: undefined }
          )
        }),
        { nil: undefined }
      ),
      security: fc.option(
        fc.array(
          fc.dictionary(
            fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{2,20}$/),
            fc.constant([])
          ),
          { minLength: 0, maxLength: 3 }
        ),
        { nil: undefined }
      )
    });

    fc.assert(
      fc.property(openApiSpecArb, (spec) => {
        // Parse spec to IR
        const adapter = new OpenAPI3Adapter(spec as OpenAPIV3.Document);
        const ir = adapter.adapt();

        // **Validates: Requirements 3.1**
        // Verify all required top-level fields exist
        expect(ir).toBeDefined();
        expect(ir).toHaveProperty('meta');
        expect(ir).toHaveProperty('resources');
        expect(ir).toHaveProperty('auth');
        expect(ir).toHaveProperty('dashboard');
        expect(ir).toHaveProperty('servers');

        // Verify meta field structure
        expect(ir.meta).toBeDefined();
        expect(ir.meta).toHaveProperty('title');
        expect(ir.meta).toHaveProperty('version');
        expect(typeof ir.meta.title).toBe('string');
        expect(typeof ir.meta.version).toBe('string');
        expect(ir.meta.title.length).toBeGreaterThan(0);
        expect(ir.meta.version.length).toBeGreaterThan(0);

        // Verify resources field structure
        expect(ir.resources).toBeDefined();
        expect(Array.isArray(ir.resources)).toBe(true);

        // Verify auth field structure
        expect(ir.auth).toBeDefined();
        expect(ir.auth).toHaveProperty('schemes');
        expect(ir.auth).toHaveProperty('globalRequired');
        expect(Array.isArray(ir.auth.schemes)).toBe(true);
        expect(typeof ir.auth.globalRequired).toBe('boolean');

        // Verify dashboard field structure
        expect(ir.dashboard).toBeDefined();
        expect(ir.dashboard).toHaveProperty('enabled');
        expect(ir.dashboard).toHaveProperty('widgets');
        expect(typeof ir.dashboard.enabled).toBe('boolean');
        expect(Array.isArray(ir.dashboard.widgets)).toBe(true);

        // Verify servers field structure
        expect(ir.servers).toBeDefined();
        expect(Array.isArray(ir.servers)).toBe(true);
        expect(ir.servers.length).toBeGreaterThan(0); // Should always have at least default server
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 3.1**
   * 
   * Property: IR structure should be complete even with minimal specs.
   */
  it('should produce complete IR structure for minimal specs', () => {
    const minimalSpecArb = fc.oneof(
      // Absolute minimum spec - no paths
      fc.constant({
        openapi: '3.0.0',
        info: { title: 'Empty API', version: '1.0.0' },
        paths: {}
      }),
      // Minimal spec with single path
      fc.constant({
        openapi: '3.0.0',
        info: { title: 'Minimal API', version: '1.0.0' },
        paths: {
          '/items': {
            get: {
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      }),
      // Spec with no servers
      fc.constant({
        openapi: '3.0.0',
        info: { title: 'No Servers', version: '1.0.0' },
        paths: {
          '/data': {
            get: {
              responses: { '200': { description: 'OK' } }
            }
          }
        }
      }),
      // Spec with no components
      fc.constant({
        openapi: '3.0.0',
        info: { title: 'No Components', version: '1.0.0' },
        paths: {
          '/public': {
            get: {
              responses: { '200': { description: 'Public' } }
            }
          }
        }
      }),
      // Spec with only info
      fc.constant({
        openapi: '3.0.0',
        info: { title: 'Info Only', version: '0.0.1' },
        paths: {}
      })
    );

    fc.assert(
      fc.property(minimalSpecArb, (spec) => {
        // Parse spec to IR
        const adapter = new OpenAPI3Adapter(spec as OpenAPIV3.Document);
        const ir = adapter.adapt();

        // **Validates: Requirements 3.1**
        // All required fields must exist even for minimal specs
        expect(ir.meta).toBeDefined();
        expect(ir.resources).toBeDefined();
        expect(ir.auth).toBeDefined();
        expect(ir.dashboard).toBeDefined();
        expect(ir.servers).toBeDefined();

        // Verify types
        expect(typeof ir.meta.title).toBe('string');
        expect(typeof ir.meta.version).toBe('string');
        expect(Array.isArray(ir.resources)).toBe(true);
        expect(Array.isArray(ir.auth.schemes)).toBe(true);
        expect(typeof ir.auth.globalRequired).toBe('boolean');
        expect(typeof ir.dashboard.enabled).toBe('boolean');
        expect(Array.isArray(ir.dashboard.widgets)).toBe(true);
        expect(Array.isArray(ir.servers)).toBe(true);

        // Servers should always have at least one entry (default)
        expect(ir.servers.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 3.1**
   * 
   * Property: IR structure should be complete with complex specs.
   */
  it('should produce complete IR structure for complex specs with all features', () => {
    const complexSpecArb = fc.record({
      openapi: fc.constant('3.0.0'),
      info: fc.record({
        title: fc.string({ minLength: 1, maxLength: 100 }),
        version: fc.stringMatching(/^\d+\.\d+\.\d+$/),
        description: fc.string({ minLength: 10, maxLength: 500 })
      }),
      servers: fc.array(
        fc.record({
          url: fc.webUrl(),
          description: fc.string({ minLength: 5, maxLength: 100 })
        }),
        { minLength: 2, maxLength: 5 }
      ),
      paths: fc.dictionary(
        fc.oneof(
          fc.constantFrom('/users', '/products', '/orders', '/items'),
          fc.constantFrom('/users/{id}', '/products/{id}', '/orders/{id}', '/items/{id}')
        ),
        fc.record({
          get: fc.record({
            summary: fc.string({ minLength: 5, maxLength: 50 }),
            description: fc.string({ minLength: 10, maxLength: 200 }),
            operationId: fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{5,30}$/),
            parameters: fc.array(
              fc.record({
                name: fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{2,15}$/),
                in: fc.constantFrom('query', 'path', 'header'),
                required: fc.boolean(),
                schema: fc.record({
                  type: fc.constantFrom('string', 'integer', 'number', 'boolean')
                })
              }),
              { minLength: 1, maxLength: 5 }
            ),
            responses: fc.record({
              '200': fc.record({
                description: fc.string({ minLength: 5, maxLength: 100 }),
                content: fc.record({
                  'application/json': fc.record({
                    schema: fc.record({
                      type: fc.constant('object' as const),
                      properties: fc.dictionary(
                        fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{2,15}$/),
                        fc.record({
                          type: fc.constantFrom('string', 'integer', 'number', 'boolean'),
                          description: fc.string({ minLength: 5, maxLength: 100 })
                        }),
                        { minKeys: 3, maxKeys: 10 }
                      )
                    })
                  })
                })
              })
            })
          }),
          post: fc.record({
            summary: fc.string({ minLength: 5, maxLength: 50 }),
            operationId: fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{5,30}$/),
            requestBody: fc.record({
              content: fc.record({
                'application/json': fc.record({
                  schema: fc.record({
                    type: fc.constant('object' as const),
                    properties: fc.dictionary(
                      fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{2,15}$/),
                      fc.record({
                        type: fc.constantFrom('string', 'integer', 'number', 'boolean')
                      }),
                      { minKeys: 3, maxKeys: 8 }
                    )
                  })
                })
              })
            }),
            responses: fc.record({
              '201': fc.record({
                description: fc.string({ minLength: 5, maxLength: 100 })
              })
            })
          })
        }),
        { minKeys: 4, maxKeys: 8 }
      ),
      components: fc.record({
        schemas: fc.dictionary(
          fc.stringMatching(/^[A-Z][a-zA-Z0-9]{3,20}$/),
          fc.record({
            type: fc.constant('object' as const),
            properties: fc.dictionary(
              fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{2,15}$/),
              fc.record({
                type: fc.constantFrom('string', 'integer', 'number', 'boolean'),
                format: fc.option(fc.constantFrom('date', 'date-time', 'email', 'uri'), { nil: undefined })
              }),
              { minKeys: 3, maxKeys: 12 }
            )
          }),
          { minKeys: 2, maxKeys: 8 }
        ),
        securitySchemes: fc.dictionary(
          fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{3,20}$/),
          fc.oneof(
            fc.record({
              type: fc.constant('http' as const),
              scheme: fc.constant('bearer'),
              bearerFormat: fc.constant('JWT')
            }),
            fc.record({
              type: fc.constant('apiKey' as const),
              name: fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_-]{3,20}$/),
              in: fc.constantFrom('header', 'query', 'cookie')
            })
          ),
          { minKeys: 1, maxKeys: 3 }
        )
      }),
      security: fc.array(
        fc.dictionary(
          fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{3,20}$/),
          fc.constant([])
        ),
        { minLength: 1, maxLength: 2 }
      )
    });

    fc.assert(
      fc.property(complexSpecArb, (spec) => {
        // Parse spec to IR
        const adapter = new OpenAPI3Adapter(spec as OpenAPIV3.Document);
        const ir = adapter.adapt();

        // **Validates: Requirements 3.1**
        // All required fields must exist
        expect(ir.meta).toBeDefined();
        expect(ir.resources).toBeDefined();
        expect(ir.auth).toBeDefined();
        expect(ir.dashboard).toBeDefined();
        expect(ir.servers).toBeDefined();

        // Verify meta has all required fields
        expect(ir.meta.title).toBeDefined();
        expect(ir.meta.version).toBeDefined();
        expect(ir.meta.description).toBeDefined();

        // Verify resources array is populated
        expect(ir.resources.length).toBeGreaterThan(0);

        // Verify auth has schemes
        expect(ir.auth.schemes.length).toBeGreaterThan(0);
        expect(ir.auth.globalRequired).toBe(true);

        // Verify servers are populated
        expect(ir.servers.length).toBeGreaterThan(0);

        // Verify dashboard structure
        expect(ir.dashboard.enabled).toBe(true);
        expect(Array.isArray(ir.dashboard.widgets)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 3.1**
   * 
   * Property: IR structure fields should have correct types regardless of input.
   */
  it('should maintain correct field types for all IR top-level fields', () => {
    const randomSpecArb = fc.record({
      openapi: fc.constant('3.0.0'),
      info: fc.record({
        title: fc.string({ minLength: 1 }),
        version: fc.string({ minLength: 1 })
      }),
      paths: fc.option(
        fc.dictionary(
          fc.string({ minLength: 1 }),
          fc.record({
            get: fc.option(
              fc.record({
                responses: fc.record({
                  '200': fc.record({
                    description: fc.string()
                  })
                })
              }),
              { nil: undefined }
            )
          })
        ),
        { nil: {} }
      )
    });

    fc.assert(
      fc.property(randomSpecArb, (spec) => {
        // Parse spec to IR
        const adapter = new OpenAPI3Adapter(spec as OpenAPIV3.Document);
        const ir = adapter.adapt();

        // **Validates: Requirements 3.1**
        // Verify field types are always correct
        expect(typeof ir.meta).toBe('object');
        expect(ir.meta).not.toBeNull();
        expect(typeof ir.meta.title).toBe('string');
        expect(typeof ir.meta.version).toBe('string');

        expect(Array.isArray(ir.resources)).toBe(true);
        expect(ir.resources).not.toBeNull();

        expect(typeof ir.auth).toBe('object');
        expect(ir.auth).not.toBeNull();
        expect(Array.isArray(ir.auth.schemes)).toBe(true);
        expect(typeof ir.auth.globalRequired).toBe('boolean');

        expect(typeof ir.dashboard).toBe('object');
        expect(ir.dashboard).not.toBeNull();
        expect(typeof ir.dashboard.enabled).toBe('boolean');
        expect(Array.isArray(ir.dashboard.widgets)).toBe(true);

        expect(Array.isArray(ir.servers)).toBe(true);
        expect(ir.servers).not.toBeNull();
        expect(ir.servers.length).toBeGreaterThan(0);

        // Verify each server has required fields
        ir.servers.forEach(server => {
          expect(typeof server.url).toBe('string');
          expect(server.url.length).toBeGreaterThan(0);
        });
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 3.1**
   * 
   * Property: IR structure should be complete with edge case inputs.
   */
  it('should handle edge cases and produce complete IR structure', () => {
    const edgeCaseSpecArb = fc.oneof(
      // Empty paths object
      fc.constant({
        openapi: '3.0.0',
        info: { title: 'Empty Paths', version: '1.0.0' },
        paths: {}
      }),
      // Null-like optional fields
      fc.constant({
        openapi: '3.0.0',
        info: { title: 'Minimal', version: '1.0.0' },
        paths: {
          '/test': {
            get: {
              responses: { '200': { description: 'OK' } }
            }
          }
        }
      }),
      // Very long strings
      fc.constant({
        openapi: '3.0.0',
        info: { 
          title: 'A'.repeat(200), 
          version: '999.999.999',
          description: 'B'.repeat(1000)
        },
        paths: {}
      }),
      // Special characters in title
      fc.constant({
        openapi: '3.0.0',
        info: { 
          title: 'API with $pecial Ch@rs & Symbols!', 
          version: '1.0.0'
        },
        paths: {}
      }),
      // Unicode characters
      fc.constant({
        openapi: '3.0.0',
        info: { 
          title: 'API 日本語 中文 한국어', 
          version: '1.0.0'
        },
        paths: {}
      })
    );

    fc.assert(
      fc.property(edgeCaseSpecArb, (spec) => {
        // Parse spec to IR
        const adapter = new OpenAPI3Adapter(spec as OpenAPIV3.Document);
        const ir = adapter.adapt();

        // **Validates: Requirements 3.1**
        // Even with edge cases, all required fields must exist
        expect(ir.meta).toBeDefined();
        expect(ir.resources).toBeDefined();
        expect(ir.auth).toBeDefined();
        expect(ir.dashboard).toBeDefined();
        expect(ir.servers).toBeDefined();

        // Verify structure integrity
        expect(typeof ir.meta.title).toBe('string');
        expect(typeof ir.meta.version).toBe('string');
        expect(Array.isArray(ir.resources)).toBe(true);
        expect(Array.isArray(ir.auth.schemes)).toBe(true);
        expect(typeof ir.auth.globalRequired).toBe('boolean');
        expect(typeof ir.dashboard.enabled).toBe('boolean');
        expect(Array.isArray(ir.dashboard.widgets)).toBe(true);
        expect(Array.isArray(ir.servers)).toBe(true);
        expect(ir.servers.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });
});

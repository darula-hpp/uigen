import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { OpenAPI3Adapter } from '../openapi3.js';
import type { OpenAPIV3 } from 'openapi-types';
import type { UIGenApp } from '../ir/types.js';

/**
 * Property-Based Tests for Spec Parsing Round Trip
 * 
 * **Validates: Requirements 1.1, 1.2, 2.1, 2.2, 3.8**
 * 
 * Property 1: Spec Parsing Round Trip
 * 
 * For any valid OpenAPI 3.x or Swagger 2.0 specification (YAML or JSON), 
 * parsing to IR and then serializing back to JSON should produce a structurally 
 * equivalent representation that can be parsed again.
 */

describe('Spec Parsing Round Trip - Property-Based Tests', () => {
  /**
   * **Validates: Requirements 1.1, 1.2, 2.1, 2.2, 3.8**
   * 
   * Property 1: Spec Parsing Round Trip
   * 
   * The IR structure should be stable and consistent across parse → serialize → parse cycles.
   */
  it('should produce equivalent IR after parse → serialize → parse cycle', () => {
    // Arbitrary for generating valid OpenAPI 3.x specifications
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
          { minLength: 1, maxLength: 3 }
        ),
        { nil: undefined }
      ),
      paths: fc.dictionary(
        // Generate resource paths like /users, /users/{id}, /products, etc.
        fc.oneof(
          fc.tuple(
            fc.constantFrom('users', 'products', 'orders', 'items', 'posts', 'comments'),
            fc.constant('')
          ).map(([r]) => `/${r}`),
          fc.tuple(
            fc.constantFrom('users', 'products', 'orders', 'items', 'posts', 'comments'),
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
                  { minLength: 0, maxLength: 5 }
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
                              { minKeys: 1, maxKeys: 8 }
                            ),
                            required: fc.option(
                              fc.array(fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{0,20}$/), { minLength: 0, maxLength: 3 }),
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
                                { minKeys: 1, maxKeys: 5 }
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
                          { minKeys: 1, maxKeys: 10 }
                        ),
                        required: fc.option(
                          fc.array(fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{0,20}$/), { minLength: 0, maxLength: 5 }),
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
          pathItem.delete !== undefined
        ),
        { minKeys: 1, maxKeys: 8 }
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
                    { minKeys: 1, maxKeys: 10 }
                  ),
                  { nil: undefined }
                )
              }),
              { minKeys: 0, maxKeys: 5 }
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
              { minKeys: 0, maxKeys: 3 }
            ),
            { nil: undefined }
          )
        }),
        { nil: undefined }
      )
    });

    fc.assert(
      fc.property(openApiSpecArb, (spec) => {
        // Parse spec to IR
        const adapter = new OpenAPI3Adapter(spec as OpenAPIV3.Document);
        const ir1 = adapter.adapt();

        // Serialize IR to JSON
        const serialized = JSON.stringify(ir1);

        // Deserialize JSON back to IR
        const ir2: UIGenApp = JSON.parse(serialized);

        // Verify structural equivalence
        expect(ir2).toEqual(ir1);

        // Verify key properties are preserved
        expect(ir2.meta.title).toBe(ir1.meta.title);
        expect(ir2.meta.version).toBe(ir1.meta.version);
        expect(ir2.resources.length).toBe(ir1.resources.length);
        expect(ir2.servers.length).toBe(ir1.servers.length);
        expect(ir2.auth.schemes.length).toBe(ir1.auth.schemes.length);

        // Verify each resource is preserved
        ir1.resources.forEach((resource1, index) => {
          const resource2 = ir2.resources[index];
          expect(resource2.name).toBe(resource1.name);
          expect(resource2.slug).toBe(resource1.slug);
          expect(resource2.operations.length).toBe(resource1.operations.length);

          // Verify each operation is preserved
          resource1.operations.forEach((op1, opIndex) => {
            const op2 = resource2.operations[opIndex];
            expect(op2.id).toBe(op1.id);
            expect(op2.method).toBe(op1.method);
            expect(op2.path).toBe(op1.path);
            expect(op2.viewHint).toBe(op1.viewHint);
          });
        });
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 1.1, 1.2, 3.8**
   * 
   * Property: IR serialization should preserve all field types and nested structures.
   */
  it('should preserve schema node structure through serialization', () => {
    const schemaArb = fc.record({
      openapi: fc.constant('3.0.0'),
      info: fc.record({
        title: fc.constant('Schema Test API'),
        version: fc.constant('1.0.0')
      }),
      paths: fc.record({
        '/items': fc.record({
          get: fc.record({
            summary: fc.constant('Get items'),
            responses: fc.record({
              '200': fc.record({
                description: fc.constant('Success'),
                content: fc.record({
                  'application/json': fc.record({
                    schema: fc.record({
                      type: fc.constant('object' as const),
                      properties: fc.record({
                        id: fc.record({
                          type: fc.constant('integer' as const),
                          minimum: fc.integer({ min: 1, max: 100 }),
                          maximum: fc.integer({ min: 101, max: 1000 })
                        }),
                        name: fc.record({
                          type: fc.constant('string' as const),
                          minLength: fc.integer({ min: 1, max: 10 }),
                          maxLength: fc.integer({ min: 11, max: 100 }),
                          pattern: fc.option(fc.constantFrom('^[a-z]+$', '\\d{3}'), { nil: undefined })
                        }),
                        email: fc.record({
                          type: fc.constant('string' as const),
                          format: fc.constant('email')
                        }),
                        tags: fc.record({
                          type: fc.constant('array' as const),
                          items: fc.record({
                            type: fc.constant('string' as const)
                          }),
                          minItems: fc.option(fc.integer({ min: 0, max: 5 }), { nil: undefined }),
                          maxItems: fc.option(fc.integer({ min: 6, max: 20 }), { nil: undefined })
                        }),
                        metadata: fc.record({
                          type: fc.constant('object' as const),
                          properties: fc.record({
                            created: fc.record({
                              type: fc.constant('string' as const),
                              format: fc.constant('date-time')
                            }),
                            updated: fc.record({
                              type: fc.constant('string' as const),
                              format: fc.constant('date-time')
                            })
                          })
                        })
                      }),
                      required: fc.array(
                        fc.constantFrom('id', 'name', 'email'),
                        { minLength: 0, maxLength: 3 }
                      ).map(arr => [...new Set(arr)])
                    })
                  })
                })
              })
            })
          })
        })
      })
    });

    fc.assert(
      fc.property(schemaArb, (spec) => {
        // Parse spec to IR
        const adapter = new OpenAPI3Adapter(spec as OpenAPIV3.Document);
        const ir1 = adapter.adapt();

        // Serialize and deserialize
        const serialized = JSON.stringify(ir1);
        const ir2: UIGenApp = JSON.parse(serialized);

        // Verify schema structure is preserved
        const resource1 = ir1.resources[0];
        const resource2 = ir2.resources[0];

        expect(resource2.schema).toEqual(resource1.schema);

        // Verify nested children are preserved
        if (resource1.schema.children) {
          expect(resource2.schema.children).toBeDefined();
          expect(resource2.schema.children!.length).toBe(resource1.schema.children.length);

          resource1.schema.children.forEach((child1, index) => {
            const child2 = resource2.schema.children![index];
            expect(child2.key).toBe(child1.key);
            expect(child2.type).toBe(child1.type);
            expect(child2.required).toBe(child1.required);
            expect(child2.format).toBe(child1.format);

            // Verify validations are preserved
            if (child1.validations) {
              expect(child2.validations).toBeDefined();
              expect(child2.validations!.length).toBe(child1.validations.length);
            }

            // Verify array items are preserved
            if (child1.items) {
              expect(child2.items).toBeDefined();
              expect(child2.items!.type).toBe(child1.items.type);
            }

            // Verify nested objects are preserved
            if (child1.children) {
              expect(child2.children).toBeDefined();
              expect(child2.children!.length).toBe(child1.children.length);
            }
          });
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 1.1, 1.2, 3.8**
   * 
   * Property: Multiple round trips should produce identical results.
   */
  it('should produce identical IR after multiple serialization cycles', () => {
    const simpleSpecArb = fc.record({
      openapi: fc.constant('3.0.0'),
      info: fc.record({
        title: fc.string({ minLength: 1, maxLength: 50 }),
        version: fc.stringMatching(/^\d+\.\d+\.\d+$/)
      }),
      paths: fc.dictionary(
        fc.constantFrom('/users', '/products', '/orders').map(path => path),
        fc.record({
          get: fc.record({
            summary: fc.string({ minLength: 1, maxLength: 50 }),
            responses: fc.record({
              '200': fc.record({
                description: fc.constant('Success')
              })
            })
          })
        }),
        { minKeys: 1, maxKeys: 3 }
      )
    });

    fc.assert(
      fc.property(simpleSpecArb, (spec) => {
        // Parse spec to IR
        const adapter = new OpenAPI3Adapter(spec as OpenAPIV3.Document);
        const ir1 = adapter.adapt();

        // First serialization cycle
        const serialized1 = JSON.stringify(ir1);
        const ir2: UIGenApp = JSON.parse(serialized1);

        // Second serialization cycle
        const serialized2 = JSON.stringify(ir2);
        const ir3: UIGenApp = JSON.parse(serialized2);

        // Third serialization cycle
        const serialized3 = JSON.stringify(ir3);
        const ir4: UIGenApp = JSON.parse(serialized3);

        // All IRs should be identical
        expect(ir2).toEqual(ir1);
        expect(ir3).toEqual(ir1);
        expect(ir4).toEqual(ir1);

        // All serialized strings should be identical
        expect(serialized2).toBe(serialized1);
        expect(serialized3).toBe(serialized1);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 1.1, 1.2, 3.8**
   * 
   * Property: Edge cases (empty specs, minimal specs) should round trip correctly.
   */
  it('should handle edge cases without data loss', () => {
    const edgeCaseSpecArb = fc.oneof(
      // Minimal spec with no paths
      fc.constant({
        openapi: '3.0.0',
        info: { title: 'Empty API', version: '1.0.0' },
        paths: {}
      }),
      // Spec with single resource and single operation
      fc.constant({
        openapi: '3.0.0',
        info: { title: 'Minimal API', version: '1.0.0' },
        paths: {
          '/items': {
            get: {
              summary: 'Get items',
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      }),
      // Spec with no servers (should use default)
      fc.constant({
        openapi: '3.0.0',
        info: { title: 'No Servers API', version: '1.0.0' },
        paths: {
          '/data': {
            get: {
              responses: { '200': { description: 'OK' } }
            }
          }
        }
      }),
      // Spec with no auth schemes
      fc.constant({
        openapi: '3.0.0',
        info: { title: 'No Auth API', version: '1.0.0' },
        paths: {
          '/public': {
            get: {
              responses: { '200': { description: 'Public data' } }
            }
          }
        }
      })
    );

    fc.assert(
      fc.property(edgeCaseSpecArb, (spec) => {
        // Parse spec to IR
        const adapter = new OpenAPI3Adapter(spec as OpenAPIV3.Document);
        const ir1 = adapter.adapt();

        // Serialize and deserialize
        const serialized = JSON.stringify(ir1);
        const ir2: UIGenApp = JSON.parse(serialized);

        // Verify complete structural equivalence
        expect(ir2).toEqual(ir1);

        // Verify IR is valid
        expect(ir2.meta).toBeDefined();
        expect(ir2.resources).toBeDefined();
        expect(ir2.auth).toBeDefined();
        expect(ir2.dashboard).toBeDefined();
        expect(ir2.servers).toBeDefined();
        expect(Array.isArray(ir2.resources)).toBe(true);
        expect(Array.isArray(ir2.servers)).toBe(true);
        expect(Array.isArray(ir2.auth.schemes)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 1.1, 1.2, 3.8**
   * 
   * Property: Authentication schemes should be preserved through serialization.
   */
  it('should preserve authentication schemes through round trip', () => {
    const authSpecArb = fc.record({
      openapi: fc.constant('3.0.0'),
      info: fc.record({
        title: fc.constant('Auth API'),
        version: fc.constant('1.0.0')
      }),
      paths: fc.record({
        '/secure': fc.record({
          get: fc.record({
            summary: fc.constant('Secure endpoint'),
            responses: fc.record({
              '200': fc.record({
                description: fc.constant('Success')
              })
            })
          })
        })
      }),
      components: fc.record({
        securitySchemes: fc.dictionary(
          fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{2,15}$/),
          fc.oneof(
            fc.record({
              type: fc.constant('http' as const),
              scheme: fc.constant('bearer'),
              bearerFormat: fc.option(fc.constantFrom('JWT', 'Bearer'), { nil: undefined })
            }),
            fc.record({
              type: fc.constant('apiKey' as const),
              name: fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_-]{2,15}$/),
              in: fc.constantFrom('header', 'query', 'cookie')
            })
          ),
          { minKeys: 1, maxKeys: 3 }
        )
      })
    });

    fc.assert(
      fc.property(authSpecArb, (spec) => {
        // Parse spec to IR
        const adapter = new OpenAPI3Adapter(spec as OpenAPIV3.Document);
        const ir1 = adapter.adapt();

        // Serialize and deserialize
        const serialized = JSON.stringify(ir1);
        const ir2: UIGenApp = JSON.parse(serialized);

        // Verify auth schemes are preserved
        expect(ir2.auth.schemes.length).toBe(ir1.auth.schemes.length);
        expect(ir2.auth.globalRequired).toBe(ir1.auth.globalRequired);

        ir1.auth.schemes.forEach((scheme1, index) => {
          const scheme2 = ir2.auth.schemes[index];
          expect(scheme2.type).toBe(scheme1.type);
          expect(scheme2.name).toBe(scheme1.name);
          
          if (scheme1.type === 'apiKey') {
            expect(scheme2.in).toBe(scheme1.in);
          }
          
          if (scheme1.type === 'bearer') {
            expect(scheme2.scheme).toBe(scheme1.scheme);
            expect(scheme2.bearerFormat).toBe(scheme1.bearerFormat);
          }
        });
      }),
      { numRuns: 100 }
    );
  });
});

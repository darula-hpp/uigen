import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { OpenAPI3Adapter } from '../openapi3.js';
import type { OpenAPIV3 } from 'openapi-types';

/**
 * Property-Based Tests for Operation Extraction
 * 
 * These tests verify universal properties that should hold for all valid OpenAPI specs.
 */

describe('Operation Extraction - Property Tests', () => {
  /**
   * Property: All operations in the spec should be extracted
   * 
   * For any valid OpenAPI spec with operations, the number of operations
   * extracted should equal the number of operations defined in the spec
   * (excluding operations on invalid paths that are filtered out).
   */
  it('should extract all operations from any valid spec', () => {
    fc.assert(
      fc.property(
        fc.record({
          openapi: fc.constant('3.0.0'),
          info: fc.record({
            title: fc.string({ minLength: 1 }),
            version: fc.string({ minLength: 1 })
          }),
          paths: fc.dictionary(
            // Generate valid resource paths (alphanumeric with hyphens/underscores)
            fc.string({ minLength: 1, maxLength: 20 })
              .filter(s => /^[a-zA-Z0-9_-]+$/.test(s))
              .map(s => `/${s}`),
            fc.record({
              get: fc.option(fc.record({
                summary: fc.option(fc.string()),
                description: fc.option(fc.string()),
                responses: fc.constant({ '200': { description: 'Success' } })
              }), { nil: undefined }),
              post: fc.option(fc.record({
                summary: fc.option(fc.string()),
                description: fc.option(fc.string()),
                responses: fc.constant({ '201': { description: 'Created' } })
              }), { nil: undefined })
            }),
            { minKeys: 1, maxKeys: 5 }
          )
        }),
        (spec) => {
          const adapter = new OpenAPI3Adapter(spec as OpenAPIV3.Document);
          const result = adapter.adapt();

          // Count operations in spec
          let expectedOpCount = 0;
          for (const pathItem of Object.values(spec.paths)) {
            if (pathItem.get) expectedOpCount++;
            if (pathItem.post) expectedOpCount++;
          }

          // Count operations in result
          const actualOpCount = result.resources.reduce(
            (sum, resource) => sum + resource.operations.length,
            0
          );

          expect(actualOpCount).toBe(expectedOpCount);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Operation IDs should be unique
   * 
   * For any valid OpenAPI spec, all extracted operations should have unique IDs.
   */
  it('should generate unique operation IDs', () => {
    fc.assert(
      fc.property(
        fc.record({
          openapi: fc.constant('3.0.0'),
          info: fc.record({
            title: fc.string({ minLength: 1 }),
            version: fc.string({ minLength: 1 })
          }),
          paths: fc.dictionary(
            // Generate valid resource paths
            fc.string({ minLength: 1, maxLength: 20 })
              .filter(s => /^[a-zA-Z0-9_-]+$/.test(s))
              .map(s => `/${s}`),
            fc.record({
              get: fc.option(fc.record({
                operationId: fc.option(fc.string({ minLength: 1 })),
                responses: fc.constant({ '200': { description: 'Success' } })
              }), { nil: undefined }),
              post: fc.option(fc.record({
                operationId: fc.option(fc.string({ minLength: 1 })),
                responses: fc.constant({ '201': { description: 'Created' } })
              }), { nil: undefined })
            }),
            { minKeys: 1, maxKeys: 10 }
          )
        }),
        (spec) => {
          const adapter = new OpenAPI3Adapter(spec as OpenAPIV3.Document);
          const result = adapter.adapt();

          const operationIds = result.resources.flatMap(r => 
            r.operations.map(op => op.id)
          );

          // All IDs should be unique
          const uniqueIds = new Set(operationIds);
          expect(uniqueIds.size).toBe(operationIds.length);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Operations should preserve HTTP method
   * 
   * For any operation, the extracted method should match the HTTP method
   * used in the path definition.
   */
  it('should preserve HTTP methods correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          openapi: fc.constant('3.0.0'),
          info: fc.record({
            title: fc.string({ minLength: 1 }),
            version: fc.string({ minLength: 1 })
          }),
          paths: fc.record({
            '/test': fc.record({
              get: fc.option(fc.record({
                responses: fc.constant({ '200': { description: 'Success' } })
              }), { nil: undefined }),
              post: fc.option(fc.record({
                responses: fc.constant({ '201': { description: 'Created' } })
              }), { nil: undefined }),
              put: fc.option(fc.record({
                responses: fc.constant({ '200': { description: 'Updated' } })
              }), { nil: undefined }),
              patch: fc.option(fc.record({
                responses: fc.constant({ '200': { description: 'Patched' } })
              }), { nil: undefined }),
              delete: fc.option(fc.record({
                responses: fc.constant({ '204': { description: 'Deleted' } })
              }), { nil: undefined })
            })
          })
        }),
        (spec) => {
          const adapter = new OpenAPI3Adapter(spec as OpenAPIV3.Document);
          const result = adapter.adapt();

          if (result.resources.length === 0) return;

          const operations = result.resources[0].operations;
          const methods = operations.map(op => op.method);

          // Check that extracted methods match what was defined
          if (spec.paths['/test'].get) {
            expect(methods).toContain('GET');
          }
          if (spec.paths['/test'].post) {
            expect(methods).toContain('POST');
          }
          if (spec.paths['/test'].put) {
            expect(methods).toContain('PUT');
          }
          if (spec.paths['/test'].patch) {
            expect(methods).toContain('PATCH');
          }
          if (spec.paths['/test'].delete) {
            expect(methods).toContain('DELETE');
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Parameters should be preserved
   * 
   * For any operation with parameters, all parameters should be extracted
   * with their correct properties (name, in, required, schema).
   */
  it('should preserve all parameters', () => {
    fc.assert(
      fc.property(
        fc.record({
          openapi: fc.constant('3.0.0'),
          info: fc.record({
            title: fc.string({ minLength: 1 }),
            version: fc.string({ minLength: 1 })
          }),
          paths: fc.record({
            '/items': fc.record({
              get: fc.record({
                parameters: fc.uniqueArray(
                  fc.record({
                    name: fc.string({ minLength: 1 }),
                    in: fc.constantFrom('query', 'path', 'header'),
                    required: fc.boolean(),
                    schema: fc.record({
                      type: fc.constantFrom('string', 'integer', 'boolean')
                    })
                  }),
                  { 
                    minLength: 0, 
                    maxLength: 5,
                    selector: (param) => param.name // Ensure unique parameter names
                  }
                ),
                responses: fc.constant({ '200': { description: 'Success' } })
              })
            })
          })
        }),
        (spec) => {
          const adapter = new OpenAPI3Adapter(spec as OpenAPIV3.Document);
          const result = adapter.adapt();

          if (result.resources.length === 0) return;

          const operation = result.resources[0].operations[0];
          const expectedParamCount = spec.paths['/items'].get.parameters.length;

          expect(operation.parameters).toHaveLength(expectedParamCount);

          // Verify each parameter is preserved
          spec.paths['/items'].get.parameters.forEach((expectedParam, index) => {
            const actualParam = operation.parameters.find(p => p.name === expectedParam.name);
            expect(actualParam).toBeDefined();
            expect(actualParam?.in).toBe(expectedParam.in);
            expect(actualParam?.required).toBe(expectedParam.required);
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Response status codes should be preserved
   * 
   * For any operation with responses, all response status codes should be
   * extracted and available in the operation's responses object.
   */
  it('should preserve all response status codes', () => {
    fc.assert(
      fc.property(
        fc.record({
          openapi: fc.constant('3.0.0'),
          info: fc.record({
            title: fc.string({ minLength: 1 }),
            version: fc.string({ minLength: 1 })
          }),
          paths: fc.record({
            '/data': fc.record({
              get: fc.record({
                responses: fc.dictionary(
                  fc.constantFrom('200', '201', '400', '404', '500'),
                  fc.record({
                    description: fc.string({ minLength: 1 })
                  }),
                  { minKeys: 1, maxKeys: 5 }
                )
              })
            })
          })
        }),
        (spec) => {
          const adapter = new OpenAPI3Adapter(spec as OpenAPIV3.Document);
          const result = adapter.adapt();

          if (result.resources.length === 0) return;

          const operation = result.resources[0].operations[0];
          const expectedStatusCodes = Object.keys(spec.paths['/data'].get.responses);
          const actualStatusCodes = Object.keys(operation.responses);

          expect(actualStatusCodes.sort()).toEqual(expectedStatusCodes.sort());
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Security requirements should be preserved
   * 
   * For any operation with security requirements, all security schemes
   * should be extracted with their scopes.
   */
  it('should preserve security requirements', () => {
    fc.assert(
      fc.property(
        fc.record({
          openapi: fc.constant('3.0.0'),
          info: fc.record({
            title: fc.string({ minLength: 1 }),
            version: fc.string({ minLength: 1 })
          }),
          components: fc.record({
            securitySchemes: fc.record({
              bearerAuth: fc.constant({
                type: 'http',
                scheme: 'bearer'
              })
            })
          }),
          paths: fc.record({
            '/secure': fc.record({
              get: fc.record({
                security: fc.array(
                  fc.record({
                    bearerAuth: fc.constant([])
                  }),
                  { minLength: 1, maxLength: 1 }
                ),
                responses: fc.constant({ '200': { description: 'Success' } })
              })
            })
          })
        }),
        (spec) => {
          const adapter = new OpenAPI3Adapter(spec as OpenAPIV3.Document);
          const result = adapter.adapt();

          if (result.resources.length === 0) return;

          const operation = result.resources[0].operations[0];
          
          expect(operation.security).toBeDefined();
          expect(operation.security).toHaveLength(1);
          expect(operation.security?.[0].name).toBe('bearerAuth');
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Summary and description should be optional
   * 
   * Operations should be successfully extracted whether or not they have
   * summary and description fields.
   */
  it('should handle optional summary and description', () => {
    fc.assert(
      fc.property(
        fc.record({
          openapi: fc.constant('3.0.0'),
          info: fc.record({
            title: fc.string({ minLength: 1 }),
            version: fc.string({ minLength: 1 })
          }),
          paths: fc.record({
            '/test': fc.record({
              get: fc.record({
                summary: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
                description: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
                responses: fc.constant({ '200': { description: 'Success' } })
              })
            })
          })
        }),
        (spec) => {
          const adapter = new OpenAPI3Adapter(spec as OpenAPIV3.Document);
          const result = adapter.adapt();

          expect(result.resources.length).toBeGreaterThan(0);
          
          const operation = result.resources[0].operations[0];
          expect(operation).toBeDefined();
          
          // Summary and description should match spec (including undefined)
          expect(operation.summary).toBe(spec.paths['/test'].get.summary);
          expect(operation.description).toBe(spec.paths['/test'].get.description);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: RequestBody should be extracted when present
   * 
   * For any operation with a requestBody, the requestBody schema should be
   * extracted and available in the operation.
   */
  it('should extract requestBody when present', () => {
    fc.assert(
      fc.property(
        fc.record({
          openapi: fc.constant('3.0.0'),
          info: fc.record({
            title: fc.string({ minLength: 1 }),
            version: fc.string({ minLength: 1 })
          }),
          paths: fc.record({
            '/items': fc.record({
              post: fc.record({
                requestBody: fc.option(
                  fc.record({
                    required: fc.boolean(),
                    content: fc.record({
                      'application/json': fc.record({
                        schema: fc.record({
                          type: fc.constant('object'),
                          properties: fc.record({
                            name: fc.record({ type: fc.constant('string') })
                          })
                        })
                      })
                    })
                  }),
                  { nil: undefined }
                ),
                responses: fc.constant({ '201': { description: 'Created' } })
              })
            })
          })
        }),
        (spec) => {
          const adapter = new OpenAPI3Adapter(spec as OpenAPIV3.Document);
          const result = adapter.adapt();

          if (result.resources.length === 0) return;

          const operation = result.resources[0].operations[0];
          const hasRequestBody = !!spec.paths['/items'].post.requestBody;

          if (hasRequestBody) {
            expect(operation.requestBody).toBeDefined();
            expect(operation.requestBody?.type).toBe('object');
          } else {
            expect(operation.requestBody).toBeUndefined();
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});

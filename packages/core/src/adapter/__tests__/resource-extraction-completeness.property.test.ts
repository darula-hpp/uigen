import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { OpenAPI3Adapter } from '../openapi3.js';
import type { OpenAPIV3 } from 'openapi-types';

/**
 * Property-Based Tests for Resource Extraction Completeness
 * 
 * **Validates: Requirements 1.4**
 * 
 * Property 5: Resource Extraction Completeness
 * 
 * For any specification with path definitions, all paths should be analyzed 
 * and grouped into resources, with each resource containing all operations 
 * defined for its path pattern.
 */

describe('Resource Extraction Completeness - Property-Based Tests', () => {
  /**
   * **Validates: Requirements 1.4**
   * 
   * Property 5: Resource Extraction Completeness
   * 
   * All paths in the spec should be analyzed and no paths should be lost
   * during resource extraction.
   */
  it('should extract and analyze all paths without losing any', () => {
    // Arbitrary for generating valid OpenAPI specs with various path patterns
    const openApiSpecArb = fc.record({
      openapi: fc.constant('3.0.0'),
      info: fc.record({
        title: fc.string({ minLength: 1, maxLength: 50 }),
        version: fc.string({ minLength: 1, maxLength: 20 })
      }),
      paths: fc.dictionary(
        // Generate diverse path patterns
        fc.oneof(
          // Collection paths: /users, /products, /orders
          fc.constantFrom('users', 'products', 'orders', 'items', 'posts', 'comments', 'categories', 'tags')
            .map(r => `/${r}`),
          // Detail paths: /users/{id}, /products/{productId}
          fc.tuple(
            fc.constantFrom('users', 'products', 'orders', 'items', 'posts', 'comments', 'categories', 'tags'),
            fc.constantFrom('{id}', '{userId}', '{productId}', '{orderId}', '{itemId}')
          ).map(([r, param]) => `/${r}/${param}`),
          // Nested paths: /users/{id}/orders, /products/{id}/reviews
          fc.tuple(
            fc.constantFrom('users', 'products', 'orders', 'items'),
            fc.constantFrom('{id}', '{userId}', '{productId}'),
            fc.constantFrom('orders', 'reviews', 'comments', 'details')
          ).map(([r, param, nested]) => `/${r}/${param}/${nested}`)
        ),
        fc.record({
          get: fc.option(
            fc.record({
              summary: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
              description: fc.option(fc.string({ minLength: 0, maxLength: 200 }), { nil: undefined }),
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
                          fc.record({
                            type: fc.constant('object' as const),
                            properties: fc.dictionary(
                              fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{0,20}$/),
                              fc.record({
                                type: fc.constantFrom('string', 'integer', 'number', 'boolean')
                              }),
                              { minKeys: 1, maxKeys: 8 }
                            )
                          }),
                          fc.record({
                            type: fc.constant('array' as const),
                            items: fc.record({
                              type: fc.constant('object' as const),
                              properties: fc.dictionary(
                                fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{0,20}$/),
                                fc.record({
                                  type: fc.constantFrom('string', 'integer', 'number', 'boolean')
                                }),
                                { minKeys: 1, maxKeys: 6 }
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
                            type: fc.constantFrom('string', 'integer', 'number', 'boolean')
                          }),
                          { minKeys: 1, maxKeys: 10 }
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
          // Ensure at least one operation exists per path
          pathItem.get !== undefined || 
          pathItem.post !== undefined || 
          pathItem.put !== undefined || 
          pathItem.patch !== undefined ||
          pathItem.delete !== undefined
        ),
        { minKeys: 1, maxKeys: 15 }
      )
    });

    fc.assert(
      fc.property(openApiSpecArb, (spec) => {
        const adapter = new OpenAPI3Adapter(spec as OpenAPIV3.Document);
        const result = adapter.adapt();

        // Count total paths in the spec that should be extracted
        const specPaths = Object.keys(spec.paths);
        const totalSpecPaths = specPaths.length;

        // Count paths that have valid resource names (non-empty first segment)
        const validPaths = specPaths.filter(path => {
          const segments = path.split('/').filter(s => s && !s.startsWith('{'));
          return segments.length > 0;
        });

        // Count total operations in spec
        let totalSpecOperations = 0;
        for (const pathItem of Object.values(spec.paths)) {
          if (pathItem.get) totalSpecOperations++;
          if (pathItem.post) totalSpecOperations++;
          if (pathItem.put) totalSpecOperations++;
          if (pathItem.patch) totalSpecOperations++;
          if (pathItem.delete) totalSpecOperations++;
        }

        // Count total operations extracted into resources
        const totalExtractedOperations = result.resources.reduce(
          (sum, resource) => sum + resource.operations.length,
          0
        );

        // **Validates: Requirements 1.4**
        // All operations from valid paths should be extracted
        expect(totalExtractedOperations).toBe(totalSpecOperations);

        // Verify each path is accounted for in some resource
        for (const path of validPaths) {
          const segments = path.split('/').filter(s => s && !s.startsWith('{'));
          const expectedResourceSlug = segments[0];

          // Find the resource for this path
          const resource = result.resources.find(r => r.slug === expectedResourceSlug);
          expect(resource).toBeDefined();

          // Count operations for this path in the spec
          const pathItem = spec.paths[path];
          let pathOperationCount = 0;
          if (pathItem.get) pathOperationCount++;
          if (pathItem.post) pathOperationCount++;
          if (pathItem.put) pathOperationCount++;
          if (pathItem.patch) pathOperationCount++;
          if (pathItem.delete) pathOperationCount++;

          // Verify operations from this path exist in the resource
          const resourceOperationsForPath = resource!.operations.filter(op => op.path === path);
          expect(resourceOperationsForPath.length).toBe(pathOperationCount);
        }

        // Verify no operations are duplicated
        const allOperationPaths = result.resources.flatMap(r => 
          r.operations.map(op => `${op.method}:${op.path}`)
        );
        const uniqueOperationPaths = new Set(allOperationPaths);
        expect(allOperationPaths.length).toBe(uniqueOperationPaths.size);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 1.4**
   * 
   * Property: All HTTP methods defined for a path should be extracted
   * as separate operations within the same resource.
   */
  it('should extract all HTTP methods for each path', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('users', 'products', 'orders', 'items'),
        fc.record({
          hasGet: fc.boolean(),
          hasPost: fc.boolean(),
          hasPut: fc.boolean(),
          hasPatch: fc.boolean(),
          hasDelete: fc.boolean()
        }).filter(methods => 
          // At least one method must be true
          methods.hasGet || methods.hasPost || methods.hasPut || methods.hasPatch || methods.hasDelete
        ),
        (resourceName, methods) => {
          const pathItem: any = {};
          
          if (methods.hasGet) {
            pathItem.get = {
              summary: 'Get operation',
              responses: { '200': { description: 'Success' } }
            };
          }
          if (methods.hasPost) {
            pathItem.post = {
              summary: 'Post operation',
              responses: { '201': { description: 'Created' } }
            };
          }
          if (methods.hasPut) {
            pathItem.put = {
              summary: 'Put operation',
              responses: { '200': { description: 'Updated' } }
            };
          }
          if (methods.hasPatch) {
            pathItem.patch = {
              summary: 'Patch operation',
              responses: { '200': { description: 'Patched' } }
            };
          }
          if (methods.hasDelete) {
            pathItem.delete = {
              summary: 'Delete operation',
              responses: { '204': { description: 'Deleted' } }
            };
          }

          const spec: OpenAPIV3.Document = {
            openapi: '3.0.0',
            info: { title: 'Test API', version: '1.0.0' },
            paths: {
              [`/${resourceName}`]: pathItem
            }
          };

          const adapter = new OpenAPI3Adapter(spec);
          const result = adapter.adapt();

          // Should have exactly one resource
          expect(result.resources).toHaveLength(1);
          expect(result.resources[0].slug).toBe(resourceName);

          // Count expected operations
          const expectedOperationCount = 
            (methods.hasGet ? 1 : 0) +
            (methods.hasPost ? 1 : 0) +
            (methods.hasPut ? 1 : 0) +
            (methods.hasPatch ? 1 : 0) +
            (methods.hasDelete ? 1 : 0);

          // **Validates: Requirements 1.4**
          // All methods should be extracted as operations
          expect(result.resources[0].operations).toHaveLength(expectedOperationCount);

          // Verify each method is present
          const extractedMethods = result.resources[0].operations.map(op => op.method);
          if (methods.hasGet) expect(extractedMethods).toContain('GET');
          if (methods.hasPost) expect(extractedMethods).toContain('POST');
          if (methods.hasPut) expect(extractedMethods).toContain('PUT');
          if (methods.hasPatch) expect(extractedMethods).toContain('PATCH');
          if (methods.hasDelete) expect(extractedMethods).toContain('DELETE');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 1.4**
   * 
   * Property: Paths with the same resource prefix should be grouped
   * into the same resource, regardless of path parameters or nesting.
   */
  it('should group related paths under the same resource', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('users', 'products', 'orders', 'books'),
        fc.integer({ min: 1, max: 5 }),
        (resourceName, pathVariantCount) => {
          const paths: any = {};
          
          // Generate multiple path variants for the same resource
          const pathVariants = [
            `/${resourceName}`,
            `/${resourceName}/{id}`,
            `/${resourceName}/{id}/details`,
            `/${resourceName}/{id}/status`,
            `/${resourceName}/search`
          ].slice(0, pathVariantCount);

          pathVariants.forEach(path => {
            paths[path] = {
              get: {
                summary: `Get ${path}`,
                parameters: path.includes('{id}') ? [
                  { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
                ] : [],
                responses: { '200': { description: 'Success' } }
              }
            };
          });

          const spec: OpenAPIV3.Document = {
            openapi: '3.0.0',
            info: { title: 'Test API', version: '1.0.0' },
            paths
          };

          const adapter = new OpenAPI3Adapter(spec);
          const result = adapter.adapt();

          // **Validates: Requirements 1.4**
          // Should create exactly one resource for all related paths
          expect(result.resources).toHaveLength(1);
          expect(result.resources[0].slug).toBe(resourceName);

          // Should have all operations from all path variants
          expect(result.resources[0].operations).toHaveLength(pathVariantCount);

          // Verify all paths are represented
          const extractedPaths = result.resources[0].operations.map(op => op.path);
          pathVariants.forEach(path => {
            expect(extractedPaths).toContain(path);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 1.4**
   * 
   * Property: Multiple distinct resources should be extracted when
   * paths have different resource prefixes.
   */
  it('should create separate resources for different path prefixes', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.constantFrom('users', 'products', 'orders', 'items', 'posts', 'comments'),
          { minLength: 2, maxLength: 6 }
        ).map(arr => [...new Set(arr)]), // Ensure unique resource names
        (resourceNames) => {
          const paths: any = {};
          
          // Create paths for each resource
          resourceNames.forEach(resourceName => {
            paths[`/${resourceName}`] = {
              get: {
                summary: `List ${resourceName}`,
                responses: { '200': { description: 'Success' } }
              }
            };
            paths[`/${resourceName}/{id}`] = {
              get: {
                summary: `Get ${resourceName}`,
                parameters: [
                  { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
                ],
                responses: { '200': { description: 'Success' } }
              }
            };
          });

          const spec: OpenAPIV3.Document = {
            openapi: '3.0.0',
            info: { title: 'Test API', version: '1.0.0' },
            paths
          };

          const adapter = new OpenAPI3Adapter(spec);
          const result = adapter.adapt();

          // **Validates: Requirements 1.4**
          // Should create one resource per unique resource name
          expect(result.resources).toHaveLength(resourceNames.length);

          // Verify each resource exists and has correct operations
          resourceNames.forEach(resourceName => {
            const resource = result.resources.find(r => r.slug === resourceName);
            expect(resource).toBeDefined();
            expect(resource!.operations).toHaveLength(2); // List and detail operations
          });

          // Verify all operations are accounted for
          const totalOperations = result.resources.reduce(
            (sum, r) => sum + r.operations.length,
            0
          );
          expect(totalOperations).toBe(resourceNames.length * 2);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 1.4**
   * 
   * Property: Edge case paths (empty segments, root paths, malformed)
   * should be handled gracefully without losing valid paths.
   */
  it('should handle edge case paths without losing valid paths', () => {
    fc.assert(
      fc.property(
        fc.record({
          validPaths: fc.dictionary(
            fc.constantFrom('/users', '/products', '/orders'),
            fc.record({
              get: fc.constant({
                summary: 'Valid operation',
                responses: { '200': { description: 'Success' } }
              })
            }),
            { minKeys: 1, maxKeys: 3 }
          ),
          edgeCasePaths: fc.dictionary(
            fc.constantFrom('/', '///', '/{id}', '//', '/{param1}/{param2}'),
            fc.record({
              get: fc.constant({
                summary: 'Edge case operation',
                responses: { '200': { description: 'Success' } }
              })
            }),
            { minKeys: 0, maxKeys: 3 }
          )
        }),
        ({ validPaths, edgeCasePaths }) => {
          const spec: OpenAPIV3.Document = {
            openapi: '3.0.0',
            info: { title: 'Test API', version: '1.0.0' },
            paths: { ...validPaths, ...edgeCasePaths } as any
          };

          // Should not throw
          expect(() => {
            const adapter = new OpenAPI3Adapter(spec);
            const result = adapter.adapt();

            // **Validates: Requirements 1.4**
            // All valid paths should be extracted
            const validPathCount = Object.keys(validPaths).length;
            const totalExtractedOperations = result.resources.reduce(
              (sum, r) => sum + r.operations.length,
              0
            );

            // At minimum, all valid paths should be extracted
            expect(totalExtractedOperations).toBeGreaterThanOrEqual(validPathCount);

            // Verify each valid path is present
            Object.keys(validPaths).forEach(path => {
              const found = result.resources.some(r => 
                r.operations.some(op => op.path === path)
              );
              expect(found).toBe(true);
            });
          }).not.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 1.4**
   * 
   * Property: Paths with missing or malformed responses should still
   * be extracted, ensuring completeness even with imperfect specs.
   */
  it('should extract paths even with missing or malformed responses', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('users', 'products', 'orders'),
        fc.oneof(
          // Missing responses
          fc.constant(undefined),
          // Empty responses
          fc.constant({}),
          // Malformed responses (missing description)
          fc.constant({ '200': {} }),
          // Valid responses
          fc.constant({ '200': { description: 'Success' } })
        ),
        (resourceName, responses) => {
          const spec: OpenAPIV3.Document = {
            openapi: '3.0.0',
            info: { title: 'Test API', version: '1.0.0' },
            paths: {
              [`/${resourceName}`]: {
                get: {
                  summary: 'Test operation',
                  responses: responses || { '200': { description: 'Default' } }
                } as any
              }
            }
          };

          // Should not throw
          expect(() => {
            const adapter = new OpenAPI3Adapter(spec);
            const result = adapter.adapt();

            // **Validates: Requirements 1.4**
            // Path should still be extracted
            expect(result.resources).toHaveLength(1);
            expect(result.resources[0].slug).toBe(resourceName);
            expect(result.resources[0].operations).toHaveLength(1);
            expect(result.resources[0].operations[0].path).toBe(`/${resourceName}`);
          }).not.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 1.4**
   * 
   * Property: Complex nested paths should be correctly attributed
   * to their parent resource.
   */
  it('should correctly attribute nested paths to parent resources', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.constantFrom('users', 'products', 'orders'),
          fc.constantFrom('comments', 'reviews', 'ratings', 'history')
        ),
        ([parentResource, nestedResource]) => {
          const spec: OpenAPIV3.Document = {
            openapi: '3.0.0',
            info: { title: 'Test API', version: '1.0.0' },
            paths: {
              [`/${parentResource}`]: {
                get: {
                  summary: 'List parent',
                  responses: { '200': { description: 'Success' } }
                }
              },
              [`/${parentResource}/{id}`]: {
                get: {
                  summary: 'Get parent',
                  parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
                  ],
                  responses: { '200': { description: 'Success' } }
                }
              },
              [`/${parentResource}/{id}/${nestedResource}`]: {
                get: {
                  summary: 'Get nested',
                  parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
                  ],
                  responses: { '200': { description: 'Success' } }
                }
              }
            }
          };

          const adapter = new OpenAPI3Adapter(spec);
          const result = adapter.adapt();

          // **Validates: Requirements 1.4**
          // Should create resources based on first path segment
          const parentResourceObj = result.resources.find(r => r.slug === parentResource);
          expect(parentResourceObj).toBeDefined();

          // Parent resource should have all three operations
          expect(parentResourceObj!.operations).toHaveLength(3);

          // Verify all paths are present
          const paths = parentResourceObj!.operations.map(op => op.path);
          expect(paths).toContain(`/${parentResource}`);
          expect(paths).toContain(`/${parentResource}/{id}`);
          expect(paths).toContain(`/${parentResource}/{id}/${nestedResource}`);
        }
      ),
      { numRuns: 100 }
    );
  });
});

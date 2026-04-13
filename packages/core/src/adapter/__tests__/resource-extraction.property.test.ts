import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { OpenAPI3Adapter } from '../openapi3.js';
import type { OpenAPIV3 } from 'openapi-types';

/**
 * Property-Based Tests for Resource Extraction
 * 
 * **Validates: Requirements 1.4, 3.2**
 * 
 * These tests verify that resource extraction behaves correctly across
 * a wide range of randomly generated OpenAPI specifications.
 */

describe('Resource Extraction - Property-Based Tests', () => {
  /**
   * **Validates: Requirements 1.4**
   * 
   * Property: For any valid OpenAPI spec with paths, all paths should be
   * analyzed and grouped into resources, with each resource containing
   * all operations defined for its path pattern.
   */
  it('should extract all operations for each resource', () => {
    fc.assert(
      fc.property(
        fc.record({
          openapi: fc.constant('3.0.0'),
          info: fc.record({
            title: fc.string({ minLength: 1, maxLength: 50 }),
            version: fc.string({ minLength: 1, maxLength: 20 })
          }),
          paths: fc.dictionary(
            // Generate resource paths like /users, /users/{id}, /products, etc.
            fc.oneof(
              fc.tuple(fc.constantFrom('users', 'products', 'orders', 'items'), fc.constant('')).map(([r]) => `/${r}`),
              fc.tuple(fc.constantFrom('users', 'products', 'orders', 'items'), fc.constant('{id}')).map(([r, id]) => `/${r}/${id}`)
            ),
            fc.record({
              get: fc.constant({
                summary: 'Test operation',
                responses: { '200': { description: 'Success' } }
              })
            }),
            { minKeys: 1, maxKeys: 10 }
          )
        }),
        (spec) => {
          const adapter = new OpenAPI3Adapter(spec as OpenAPIV3.Document);
          const result = adapter.adapt();

          // Count expected operations per resource
          const pathsByResource = new Map<string, number>();
          for (const path of Object.keys(spec.paths)) {
            const segments = path.split('/').filter(s => s && !s.startsWith('{'));
            if (segments.length > 0) {
              const resourceName = segments[0];
              pathsByResource.set(resourceName, (pathsByResource.get(resourceName) || 0) + 1);
            }
          }

          // Verify each resource has the correct number of operations
          for (const resource of result.resources) {
            const expectedCount = pathsByResource.get(resource.slug) || 0;
            expect(resource.operations.length).toBe(expectedCount);
          }

          // Verify total operation count matches
          const totalOperations = result.resources.reduce((sum, r) => sum + r.operations.length, 0);
          const totalPaths = Object.keys(spec.paths).filter(p => {
            const segments = p.split('/').filter(s => s && !s.startsWith('{'));
            return segments.length > 0;
          }).length;
          expect(totalOperations).toBe(totalPaths);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 1.4, 3.2**
   * 
   * Property: Resource names should be consistently derived from path patterns.
   * /users and /users/{id} should both map to the same "users" resource.
   */
  it('should consistently group related paths under the same resource', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('users', 'products', 'orders', 'books', 'articles'),
        (resourceName) => {
          const spec: OpenAPIV3.Document = {
            openapi: '3.0.0',
            info: { title: 'Test API', version: '1.0.0' },
            paths: {
              [`/${resourceName}`]: {
                get: { summary: 'List', responses: { '200': { description: 'Success' } } }
              },
              [`/${resourceName}/{id}`]: {
                get: {
                  summary: 'Get by ID',
                  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                  responses: { '200': { description: 'Success' } }
                }
              },
              [`/${resourceName}/{id}/details`]: {
                get: {
                  summary: 'Get details',
                  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                  responses: { '200': { description: 'Success' } }
                }
              }
            }
          };

          const adapter = new OpenAPI3Adapter(spec);
          const result = adapter.adapt();

          // Should create exactly one resource
          expect(result.resources).toHaveLength(1);
          expect(result.resources[0].slug).toBe(resourceName);
          
          // Should have all three operations
          expect(result.resources[0].operations).toHaveLength(3);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * **Validates: Requirements 1.4, 3.2**
   * 
   * Property: Schema extraction should handle various response structures
   * including objects, arrays, and nested schemas.
   */
  it('should extract schemas from various response structures', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Object with properties
          fc.record({
            type: fc.constant('object' as const),
            properties: fc.constant({
              id: { type: 'integer' },
              name: { type: 'string' },
              active: { type: 'boolean' }
            })
          }),
          // Array with items
          fc.record({
            type: fc.constant('array' as const),
            items: fc.constant({
              type: 'object',
              properties: {
                id: { type: 'integer' },
                value: { type: 'string' }
              }
            })
          }),
          // Empty object
          fc.record({
            type: fc.constant('object' as const)
          }),
          // Empty array
          fc.record({
            type: fc.constant('array' as const)
          })
        ),
        (responseSchema) => {
          const spec: OpenAPIV3.Document = {
            openapi: '3.0.0',
            info: { title: 'Test API', version: '1.0.0' },
            paths: {
              '/items': {
                get: {
                  summary: 'Get items',
                  responses: {
                    '200': {
                      description: 'Success',
                      content: {
                        'application/json': {
                          schema: responseSchema as any
                        }
                      }
                    }
                  }
                }
              }
            }
          };

          const adapter = new OpenAPI3Adapter(spec);
          const result = adapter.adapt();

          // Should successfully extract resource
          expect(result.resources).toHaveLength(1);
          expect(result.resources[0].schema).toBeDefined();
          
          // If schema has properties or items, they should be extracted
          const hasContent = ('properties' in responseSchema && Object.keys(responseSchema.properties || {}).length > 0) ||
                           ('items' in responseSchema && responseSchema.items);
          
          if (hasContent) {
            expect(result.resources[0].schema.children).toBeDefined();
            expect(result.resources[0].schema.children!.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 1.4, 3.2**
   * 
   * Property: Schema merging should preserve all unique fields from
   * multiple operations without duplication.
   */
  it('should merge schemas without losing or duplicating fields', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.string({ minLength: 1, maxLength: 20 })
            .filter(s => !['__proto__', 'constructor', 'prototype'].includes(s)), // Filter out special JS properties
          { minLength: 1, maxLength: 10 }
        ).map(arr => [...new Set(arr)]),
        fc.array(
          fc.string({ minLength: 1, maxLength: 20 })
            .filter(s => !['__proto__', 'constructor', 'prototype'].includes(s)), // Filter out special JS properties
          { minLength: 1, maxLength: 10 }
        ).map(arr => [...new Set(arr)]),
        (fields1, fields2) => {
          const createSchema = (fields: string[]) => {
            const properties: any = {};
            fields.forEach(field => {
              properties[field] = { type: 'string' };
            });
            return {
              type: 'object' as const,
              properties
            };
          };

          const spec: OpenAPIV3.Document = {
            openapi: '3.0.0',
            info: { title: 'Test API', version: '1.0.0' },
            paths: {
              '/resources': {
                get: {
                  summary: 'List',
                  responses: {
                    '200': {
                      description: 'Success',
                      content: {
                        'application/json': {
                          schema: {
                            type: 'array',
                            items: createSchema(fields1)
                          }
                        }
                      }
                    }
                  }
                }
              },
              '/resources/{id}': {
                get: {
                  summary: 'Get',
                  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                  responses: {
                    '200': {
                      description: 'Success',
                      content: {
                        'application/json': {
                          schema: createSchema(fields2)
                        }
                      }
                    }
                  }
                }
              }
            }
          };

          const adapter = new OpenAPI3Adapter(spec);
          const result = adapter.adapt();

          const resource = result.resources[0];
          const extractedFields = resource.schema.children?.map(c => c.key) || [];
          
          // All unique fields from both operations should be present
          const allUniqueFields = [...new Set([...fields1, ...fields2])];
          expect(extractedFields.length).toBeGreaterThanOrEqual(Math.max(fields1.length, fields2.length));
          
          // No field should be duplicated
          const uniqueExtracted = [...new Set(extractedFields)];
          expect(extractedFields.length).toBe(uniqueExtracted.length);
          
          // All fields from both schemas should be present
          allUniqueFields.forEach(field => {
            expect(extractedFields).toContain(field);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 1.4**
   * 
   * Property: Empty or malformed path objects should not cause crashes
   * and should result in empty or partial resource lists.
   */
  it('should handle edge cases gracefully without crashing', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant({}), // Empty paths
          fc.record({
            '/': fc.record({
              get: fc.constant({ summary: 'Root', responses: { '200': { description: 'Success' } } })
            })
          }), // Root path
          fc.record({
            '///': fc.record({
              get: fc.constant({ summary: 'Malformed', responses: { '200': { description: 'Success' } } })
            })
          }), // Malformed path
          fc.record({
            '/{id}': fc.record({
              get: fc.constant({
                summary: 'Only param',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: { '200': { description: 'Success' } }
              })
            })
          }) // Path with only parameter
        ),
        (paths) => {
          const spec: OpenAPIV3.Document = {
            openapi: '3.0.0',
            info: { title: 'Test API', version: '1.0.0' },
            paths: paths as any
          };

          // Should not throw
          expect(() => {
            const adapter = new OpenAPI3Adapter(spec);
            const result = adapter.adapt();
            
            // Result should be valid
            expect(result).toBeDefined();
            expect(result.resources).toBeDefined();
            expect(Array.isArray(result.resources)).toBe(true);
          }).not.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 1.4, 3.2**
   * 
   * Property: Required fields should be correctly marked in the extracted schema.
   */
  it('should correctly preserve required field markers', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }).map(arr => [...new Set(arr)]),
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 0, maxLength: 3 }).map(arr => [...new Set(arr)]),
        (allFields, requiredFields) => {
          // Ensure required fields are subset of all fields
          const validRequiredFields = requiredFields.filter(f => allFields.includes(f));
          
          const properties: any = {};
          allFields.forEach(field => {
            properties[field] = { type: 'string' };
          });

          const spec: OpenAPIV3.Document = {
            openapi: '3.0.0',
            info: { title: 'Test API', version: '1.0.0' },
            paths: {
              '/items/{id}': {
                get: {
                  summary: 'Get item',
                  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                  responses: {
                    '200': {
                      description: 'Success',
                      content: {
                        'application/json': {
                          schema: {
                            type: 'object',
                            required: validRequiredFields,
                            properties
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          };

          const adapter = new OpenAPI3Adapter(spec);
          const result = adapter.adapt();

          const resource = result.resources[0];
          
          // Check that required fields are marked correctly
          validRequiredFields.forEach(requiredField => {
            const field = resource.schema.children?.find(c => c.key === requiredField);
            expect(field).toBeDefined();
            expect(field?.required).toBe(true);
          });
          
          // Check that non-required fields are not marked as required
          const nonRequiredFields = allFields.filter(f => !validRequiredFields.includes(f));
          nonRequiredFields.forEach(nonRequiredField => {
            const field = resource.schema.children?.find(c => c.key === nonRequiredField);
            if (field) {
              expect(field.required).toBe(false);
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 1.4, 3.2**
   * 
   * Property: Validation rules from schemas should be extracted and preserved.
   */
  it('should extract validation rules from schemas', () => {
    fc.assert(
      fc.property(
        fc.record({
          minLength: fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined }),
          maxLength: fc.option(fc.integer({ min: 1, max: 200 }), { nil: undefined }),
          pattern: fc.option(fc.constantFrom('^[a-z]+$', '\\d{3}', '[A-Z]{2,5}'), { nil: undefined }),
          minimum: fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined }),
          maximum: fc.option(fc.integer({ min: 1, max: 1000 }), { nil: undefined })
        }),
        (constraints) => {
          // Filter out undefined constraints and ensure minLength < maxLength, minimum < maximum
          const validConstraints: any = {};
          if (constraints.minLength !== undefined) validConstraints.minLength = constraints.minLength;
          if (constraints.maxLength !== undefined) {
            validConstraints.maxLength = Math.max(
              constraints.maxLength,
              (constraints.minLength || 0) + 1
            );
          }
          if (constraints.pattern !== undefined) validConstraints.pattern = constraints.pattern;
          if (constraints.minimum !== undefined) validConstraints.minimum = constraints.minimum;
          if (constraints.maximum !== undefined) {
            validConstraints.maximum = Math.max(
              constraints.maximum,
              (constraints.minimum || 0) + 1
            );
          }

          const spec: OpenAPIV3.Document = {
            openapi: '3.0.0',
            info: { title: 'Test API', version: '1.0.0' },
            paths: {
              '/items': {
                post: {
                  summary: 'Create item',
                  requestBody: {
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            name: {
                              type: 'string',
                              ...validConstraints
                            }
                          }
                        }
                      }
                    }
                  },
                  responses: {
                    '201': { description: 'Created' }
                  }
                }
              }
            }
          };

          const adapter = new OpenAPI3Adapter(spec);
          const result = adapter.adapt();

          const resource = result.resources[0];
          const nameField = resource.schema.children?.find(c => c.key === 'name');
          
          expect(nameField).toBeDefined();
          
          // Count expected validations
          const expectedValidationCount = Object.keys(validConstraints).length;
          
          if (expectedValidationCount > 0) {
            expect(nameField?.validations).toBeDefined();
            expect(nameField?.validations!.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { OpenAPI3Adapter } from '../openapi3.js';
import type { OpenAPIV3 } from 'openapi-types';

/**
 * Property 15: Graceful Schema Degradation
 * 
 * For any operation with a missing response schema, the adapter should not crash
 * and should produce a valid IR that can be rendered by the UI.
 * 
 * Validates: Requirement 25.1
 */
describe('Property 15: Graceful Schema Degradation', () => {
  it('should handle operations with missing response schemas', () => {
    fc.assert(
      fc.property(
        fc.record({
          path: fc.constantFrom('/users', '/posts', '/comments', '/products'),
          method: fc.constantFrom('get', 'post', 'put', 'delete'),
          operationId: fc.string({ minLength: 1, maxLength: 20 }),
          summary: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
        }),
        (operation) => {
          // Create a spec with an operation that has no response schema
          const spec: OpenAPIV3.Document = {
            openapi: '3.0.0',
            info: {
              title: 'Test API',
              version: '1.0.0',
            },
            paths: {
              [operation.path]: {
                [operation.method]: {
                  operationId: operation.operationId,
                  summary: operation.summary,
                  responses: {
                    '200': {
                      description: 'Success',
                      // No schema defined
                    },
                  },
                },
              },
            },
          };

          // Adapter should not crash
          const adapter = new OpenAPI3Adapter(spec);
          const ir = adapter.adapt();

          // IR should be valid
          expect(ir).toBeDefined();
          expect(ir.resources).toBeDefined();
          expect(Array.isArray(ir.resources)).toBe(true);

          // Should have at least one resource
          expect(ir.resources.length).toBeGreaterThan(0);

          // Resource should have operations
          const resource = ir.resources[0];
          expect(resource.operations).toBeDefined();
          expect(Array.isArray(resource.operations)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle operations with missing request body schemas', () => {
    fc.assert(
      fc.property(
        fc.record({
          path: fc.constantFrom('/users', '/posts', '/comments'),
          operationId: fc.string({ minLength: 1, maxLength: 20 }),
        }),
        (operation) => {
          // Create a spec with a POST operation that has no request body schema
          const spec: OpenAPIV3.Document = {
            openapi: '3.0.0',
            info: {
              title: 'Test API',
              version: '1.0.0',
            },
            paths: {
              [operation.path]: {
                post: {
                  operationId: operation.operationId,
                  requestBody: {
                    description: 'Request body',
                    // No content defined
                  },
                  responses: {
                    '201': {
                      description: 'Created',
                    },
                  },
                },
              },
            },
          };

          // Adapter should not crash
          const adapter = new OpenAPI3Adapter(spec);
          const ir = adapter.adapt();

          // IR should be valid
          expect(ir).toBeDefined();
          expect(ir.resources).toBeDefined();
          expect(ir.resources.length).toBeGreaterThan(0);

          // Operation should exist but may not have requestBody
          const resource = ir.resources[0];
          const postOp = resource.operations.find((op) => op.method === 'POST');
          expect(postOp).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle operations with missing parameter schemas', () => {
    fc.assert(
      fc.property(
        fc.record({
          path: fc.constantFrom('/users/{id}', '/posts/{id}'),
          paramName: fc.constantFrom('id', 'userId', 'postId'),
        }),
        (operation) => {
          // Create a spec with a parameter that has no schema
          const spec: OpenAPIV3.Document = {
            openapi: '3.0.0',
            info: {
              title: 'Test API',
              version: '1.0.0',
            },
            paths: {
              [operation.path]: {
                get: {
                  operationId: 'getById',
                  parameters: [
                    {
                      name: operation.paramName,
                      in: 'path',
                      required: true,
                      // No schema defined
                    } as any,
                  ],
                  responses: {
                    '200': {
                      description: 'Success',
                    },
                  },
                },
              },
            },
          };

          // Adapter should not crash
          const adapter = new OpenAPI3Adapter(spec);
          const ir = adapter.adapt();

          // IR should be valid
          expect(ir).toBeDefined();
          expect(ir.resources).toBeDefined();
          expect(ir.resources.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle completely empty paths object', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: {
        title: 'Empty API',
        version: '1.0.0',
      },
      paths: {},
    };

    // Adapter should not crash
    const adapter = new OpenAPI3Adapter(spec);
    const ir = adapter.adapt();

    // IR should be valid with empty resources
    expect(ir).toBeDefined();
    expect(ir.resources).toBeDefined();
    expect(Array.isArray(ir.resources)).toBe(true);
    expect(ir.resources.length).toBe(0);
  });

  it('should handle operations with invalid response status codes', () => {
    fc.assert(
      fc.property(
        fc.record({
          path: fc.constantFrom('/users', '/posts'),
          statusCode: fc.constantFrom('999', 'invalid', '2xx'),
        }),
        (operation) => {
          const spec: OpenAPIV3.Document = {
            openapi: '3.0.0',
            info: {
              title: 'Test API',
              version: '1.0.0',
            },
            paths: {
              [operation.path]: {
                get: {
                  operationId: 'getResource',
                  responses: {
                    [operation.statusCode]: {
                      description: 'Response',
                    },
                  },
                },
              },
            },
          };

          // Adapter should not crash
          const adapter = new OpenAPI3Adapter(spec);
          const ir = adapter.adapt();

          // IR should be valid
          expect(ir).toBeDefined();
          expect(ir.resources).toBeDefined();
        }
      ),
      { numRuns: 50 }
    );
  });
});

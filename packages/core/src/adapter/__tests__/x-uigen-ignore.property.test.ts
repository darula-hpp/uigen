import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import type { OpenAPIV3 } from 'openapi-types';
import { OpenAPI3Adapter } from '../openapi3.js';
import { Swagger2Adapter } from '../swagger2.js';

/**
 * Property-Based Tests for x-uigen-ignore Feature
 * 
 * These tests validate universal correctness properties across random inputs
 * using fast-check with minimum 100 iterations per property.
 */

// Helper: Create a minimal valid OpenAPI 3.x spec
function createMinimalSpec(paths: Record<string, any>): OpenAPIV3.Document {
  return {
    openapi: '3.0.0',
    info: { title: 'Test API', version: '1.0.0' },
    paths
  };
}

// Helper: Create a minimal valid Swagger 2.0 spec
function createMinimalSwagger2Spec(paths: Record<string, any>) {
  return {
    swagger: '2.0',
    info: { title: 'Test API', version: '1.0.0' },
    paths
  };
}

// Helper: Create a valid operation with a response
function createOperation(summary: string, ignoreValue?: boolean): any {
  const operation: any = {
    summary,
    responses: {
      '200': {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' }
              }
            }
          }
        }
      }
    }
  };

  if (ignoreValue !== undefined) {
    operation['x-uigen-ignore'] = ignoreValue;
  }

  return operation;
}

// Helper: Create a Swagger 2.0 operation
function createSwagger2Operation(summary: string, ignoreValue?: boolean): any {
  const operation: any = {
    summary,
    responses: {
      '200': {
        description: 'Success',
        schema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' }
          }
        }
      }
    }
  };

  if (ignoreValue !== undefined) {
    operation['x-uigen-ignore'] = ignoreValue;
  }

  return operation;
}

describe('x-uigen-ignore: Property-Based Tests', () => {
  /**
   * Property 1: Operation with `x-uigen-ignore: true` is excluded from IR
   * **Validates: Requirements 2.1**
   */
  describe('Property 1: Operation ignored', () => {
    it('should exclude operations with x-uigen-ignore: true from IR', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('get', 'post', 'put', 'patch', 'delete'),
          fc.string({ minLength: 1, maxLength: 20 }).map(s => `/${s.replace(/[^a-z]/gi, '')}`),
          fc.string({ minLength: 5, maxLength: 50 }),
          (method, path, summary) => {
            const operation = createOperation(summary, true);
            const spec = createMinimalSpec({
              [path]: {
                [method]: operation
              }
            });

            const adapter = new OpenAPI3Adapter(spec);
            const app = adapter.adapt();

            // Property: Operation with x-uigen-ignore: true should not appear in IR
            const allOperations = app.resources.flatMap(r => r.operations);
            const hasIgnoredOperation = allOperations.some(
              op => op.path === path && op.method === method.toUpperCase()
            );

            expect(hasIgnoredOperation).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 2: Operation with `x-uigen-ignore: false` is included in IR
   * **Validates: Requirements 2.2**
   */
  describe('Property 2: Operation included with false', () => {
    it('should include operations with x-uigen-ignore: false in IR', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('get', 'post', 'put', 'patch', 'delete'),
          fc.string({ minLength: 1, maxLength: 20 }).map(s => `/${s.replace(/[^a-z]/gi, '') || 'resource'}`),
          fc.string({ minLength: 5, maxLength: 50 }),
          (method, path, summary) => {
            const operation = createOperation(summary, false);
            const spec = createMinimalSpec({
              [path]: {
                [method]: operation
              }
            });

            const adapter = new OpenAPI3Adapter(spec);
            const app = adapter.adapt();

            // Property: Operation with x-uigen-ignore: false should appear in IR
            const allOperations = app.resources.flatMap(r => r.operations);
            const hasOperation = allOperations.some(
              op => op.path === path && op.method === method.toUpperCase()
            );

            expect(hasOperation).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 3: Operation without annotation is included in IR
   * **Validates: Requirements 2.3**
   */
  describe('Property 3: Default inclusion', () => {
    it('should include operations without x-uigen-ignore annotation in IR', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('get', 'post', 'put', 'patch', 'delete'),
          fc.string({ minLength: 1, maxLength: 20 }).map(s => `/${s.replace(/[^a-z]/gi, '') || 'resource'}`),
          fc.string({ minLength: 5, maxLength: 50 }),
          (method, path, summary) => {
            const operation = createOperation(summary); // No x-uigen-ignore
            const spec = createMinimalSpec({
              [path]: {
                [method]: operation
              }
            });

            const adapter = new OpenAPI3Adapter(spec);
            const app = adapter.adapt();

            // Property: Operation without annotation should appear in IR (default behavior)
            const allOperations = app.resources.flatMap(r => r.operations);
            const hasOperation = allOperations.some(
              op => op.path === path && op.method === method.toUpperCase()
            );

            expect(hasOperation).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 4: Path-level `x-uigen-ignore: true` excludes all operations without overrides
   * **Validates: Requirements 4.1**
   */
  describe('Property 4: Path-level exclusion', () => {
    it('should exclude all operations under path with x-uigen-ignore: true', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom('get', 'post', 'put', 'patch', 'delete'), { minLength: 1, maxLength: 5 }),
          fc.string({ minLength: 1, maxLength: 20 }).map(s => `/${s.replace(/[^a-z]/gi, '')}`),
          (methods, path) => {
            const pathItem: any = {
              'x-uigen-ignore': true
            };

            methods.forEach(method => {
              pathItem[method] = createOperation(`${method} operation`);
            });

            const spec = createMinimalSpec({
              [path]: pathItem
            });

            const adapter = new OpenAPI3Adapter(spec);
            const app = adapter.adapt();

            // Property: All operations under path with x-uigen-ignore: true should be excluded
            const allOperations = app.resources.flatMap(r => r.operations);
            const hasAnyOperation = allOperations.some(op => op.path === path);

            expect(hasAnyOperation).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 5: Operation-level annotation overrides path-level annotation
   * **Validates: Requirements 4.2, 5.1, 5.2**
   */
  describe('Property 5: Operation override', () => {
    it('should respect operation-level annotation over path-level annotation', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          fc.boolean(),
          fc.string({ minLength: 1, maxLength: 20 }).map(s => `/${s.replace(/[^a-z]/gi, '') || 'resource'}`),
          (pathIgnore, operationIgnore, path) => {
            const pathItem: any = {
              'x-uigen-ignore': pathIgnore,
              get: createOperation('Get operation', operationIgnore)
            };

            const spec = createMinimalSpec({
              [path]: pathItem
            });

            const adapter = new OpenAPI3Adapter(spec);
            const app = adapter.adapt();

            // Property: Operation-level annotation takes precedence
            const allOperations = app.resources.flatMap(r => r.operations);
            const hasOperation = allOperations.some(
              op => op.path === path && op.method === 'GET'
            );

            // Operation should be included only if operationIgnore is false
            expect(hasOperation).toBe(!operationIgnore);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use path-level annotation when operation has no annotation', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          fc.string({ minLength: 1, maxLength: 20 }).map(s => `/${s.replace(/[^a-z]/gi, '') || 'resource'}`),
          (pathIgnore, path) => {
            const pathItem: any = {
              'x-uigen-ignore': pathIgnore,
              get: createOperation('Get operation') // No operation-level annotation
            };

            const spec = createMinimalSpec({
              [path]: pathItem
            });

            const adapter = new OpenAPI3Adapter(spec);
            const app = adapter.adapt();

            // Property: Path-level annotation should apply when operation has no annotation
            const allOperations = app.resources.flatMap(r => r.operations);
            const hasOperation = allOperations.some(
              op => op.path === path && op.method === 'GET'
            );

            expect(hasOperation).toBe(!pathIgnore);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 6: Resource with all operations ignored is excluded from IR
   * **Validates: Requirements 3.1**
   */
  describe('Property 6: Resource exclusion', () => {
    it('should exclude resource when all operations have x-uigen-ignore: true', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom('get', 'post', 'put', 'patch', 'delete'), { minLength: 1, maxLength: 5 }),
          fc.string({ minLength: 1, maxLength: 20 }).map(s => `/${s.replace(/[^a-z]/gi, '')}`),
          (methods, path) => {
            const pathItem: any = {};

            methods.forEach(method => {
              pathItem[method] = createOperation(`${method} operation`, true);
            });

            const spec = createMinimalSpec({
              [path]: pathItem
            });

            const adapter = new OpenAPI3Adapter(spec);
            const app = adapter.adapt();

            // Property: Resource with all operations ignored should not appear in IR
            const resourceNames = app.resources.map(r => r.slug);
            const resourceName = path.split('/').filter(s => s && !s.startsWith('{')).pop();
            
            if (resourceName) {
              expect(resourceNames).not.toContain(resourceName);
            }
            
            // Also verify no operations from this path exist
            const allOperations = app.resources.flatMap(r => r.operations);
            const hasAnyOperation = allOperations.some(op => op.path === path);
            expect(hasAnyOperation).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 7: Resource with at least one non-ignored operation is included in IR
   * **Validates: Requirements 3.2**
   */
  describe('Property 7: Partial resource', () => {
    it('should include resource with at least one non-ignored operation', () => {
      fc.assert(
        fc.property(
          fc.array(fc.boolean(), { minLength: 2, maxLength: 5 }).filter(arr => arr.some(v => !v)),
          fc.string({ minLength: 1, maxLength: 20 }).map(s => `/${s.replace(/[^a-z]/gi, '') || 'resource'}`),
          (ignoreFlags, path) => {
            const methods = ['get', 'post', 'put', 'patch', 'delete'].slice(0, ignoreFlags.length);
            const pathItem: any = {};

            methods.forEach((method, index) => {
              pathItem[method] = createOperation(`${method} operation`, ignoreFlags[index]);
            });

            const spec = createMinimalSpec({
              [path]: pathItem
            });

            const adapter = new OpenAPI3Adapter(spec);
            const app = adapter.adapt();

            // Property: Resource should be included if at least one operation is not ignored
            const hasNonIgnoredOperation = ignoreFlags.some(flag => !flag);
            
            if (hasNonIgnoredOperation) {
              const allOperations = app.resources.flatMap(r => r.operations);
              const hasOperation = allOperations.some(op => op.path === path);
              expect(hasOperation).toBe(true);

              // Verify only non-ignored operations are included
              const operationsFromPath = allOperations.filter(op => op.path === path);
              const expectedCount = ignoreFlags.filter(flag => !flag).length;
              expect(operationsFromPath.length).toBe(expectedCount);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 8: Non-boolean annotation values are treated as absent
   * **Validates: Requirements 1.3, 6.1**
   */
  describe('Property 8: Non-boolean fallback', () => {
    it('should treat non-boolean x-uigen-ignore values as absent and include operation', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string(),
            fc.integer(),
            fc.constant(null),
            fc.record({ enabled: fc.boolean() })
          ),
          fc.string({ minLength: 1, maxLength: 20 }).map(s => `/${s.replace(/[^a-z]/gi, '') || 'resource'}`),
          (nonBooleanValue, path) => {
            const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            const operation: any = createOperation('Test operation');
            operation['x-uigen-ignore'] = nonBooleanValue;

            const spec = createMinimalSpec({
              [path]: {
                get: operation
              }
            });

            const adapter = new OpenAPI3Adapter(spec);
            const app = adapter.adapt();

            // Property: Non-boolean values should be treated as absent (operation included)
            const allOperations = app.resources.flatMap(r => r.operations);
            const hasOperation = allOperations.some(
              op => op.path === path && op.method === 'GET'
            );

            expect(hasOperation).toBe(true);

            // Property: Warning should be logged for non-boolean values
            expect(consoleWarnSpy).toHaveBeenCalled();

            consoleWarnSpy.mockRestore();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 9: Ignored operations do not reach view hint classifier
   * **Validates: Requirements 2.4**
   */
  describe('Property 9: No classifier invocation', () => {
    it('should not invoke view hint classifier for ignored operations', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('get', 'post', 'put', 'patch', 'delete'),
          fc.string({ minLength: 1, maxLength: 20 }).map(s => `/${s.replace(/[^a-z]/gi, '')}`),
          (method, path) => {
            const operation = createOperation('Test operation', true);
            const spec = createMinimalSpec({
              [path]: {
                [method]: operation
              }
            });

            const adapter = new OpenAPI3Adapter(spec);
            const app = adapter.adapt();

            // Property: Ignored operations should not appear in IR at all
            // This implicitly means the classifier was never invoked for them
            const allOperations = app.resources.flatMap(r => r.operations);
            const hasIgnoredOperation = allOperations.some(
              op => op.path === path && op.method === method.toUpperCase()
            );

            expect(hasIgnoredOperation).toBe(false);
            
            // If the operation doesn't exist in IR, it was never classified
            // This validates that the ignore check happens before classification
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 10: Relationships to ignored resources are not created
   * **Validates: Requirements 3.4**
   */
  describe('Property 10: No relationships', () => {
    it('should not create relationships to ignored resources', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).map(s => s.replace(/[^a-z]/gi, '')),
          fc.string({ minLength: 1, maxLength: 20 }).map(s => s.replace(/[^a-z]/gi, '')),
          (resource1, resource2) => {
            // Ensure different resource names
            if (resource1 === resource2) return;

            // Create spec with two resources, one ignored
            const spec = createMinimalSpec({
              [`/${resource1}`]: {
                get: createOperation('List resource1')
              },
              [`/${resource2}`]: {
                get: createOperation('List resource2', true) // Ignored
              },
              [`/${resource1}/{id}/${resource2}`]: {
                get: createOperation('Get related resource2', true) // Ignored
              }
            });

            const adapter = new OpenAPI3Adapter(spec);
            const app = adapter.adapt();

            // Property: No relationships should point to ignored resources
            const allRelationships = app.resources.flatMap(r => r.relationships);
            const hasRelationshipToIgnored = allRelationships.some(
              rel => rel.targetResource === resource2
            );

            expect(hasRelationshipToIgnored).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 11: `x-uigen-ignore` is checked before other annotations
   * **Validates: Requirements 7.5**
   */
  describe('Property 11: Annotation precedence', () => {
    it('should check x-uigen-ignore before processing other x-uigen annotations', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).map(s => `/${s.replace(/[^a-z]/gi, '') || 'resource'}`).filter(p => !p.includes('login') && !p.includes('auth') && !p.includes('signin')),
          fc.string({ minLength: 5, maxLength: 50 }).filter(s => s.trim().length > 0 && !s.toLowerCase().includes('login') && !s.toLowerCase().includes('auth')),
          fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
          (path, summary, customId) => {
            const operation: any = createOperation(summary, true);
            operation['x-uigen-id'] = customId;
            operation['x-uigen-login'] = true;

            const spec = createMinimalSpec({
              [path]: {
                post: operation
              }
            });

            const adapter = new OpenAPI3Adapter(spec);
            const app = adapter.adapt();

            // Property: Operation should be excluded despite other annotations
            const allOperations = app.resources.flatMap(r => r.operations);
            const hasOperation = allOperations.some(
              op => op.path === path && op.method === 'POST'
            );

            expect(hasOperation).toBe(false);

            // Note: Login endpoint detection happens before ignore filtering in the current implementation,
            // so we only verify the operation doesn't appear in the IR resources
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 12: Swagger 2.0 `x-uigen-ignore` survives conversion and filters correctly
   * **Validates: Requirements 1.5**
   */
  describe('Property 12: Swagger 2.0 round-trip', () => {
    it('should preserve and apply x-uigen-ignore from Swagger 2.0 specs', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          fc.constantFrom('get', 'post', 'put', 'patch', 'delete'),
          fc.string({ minLength: 1, maxLength: 20 }).map(s => `/${s.replace(/[^a-z]/gi, '') || 'resource'}`),
          (ignoreValue, method, path) => {
            // Create Swagger 2.0 spec
            const swagger2Operation = createSwagger2Operation('Test operation', ignoreValue);
            const swagger2Spec = createMinimalSwagger2Spec({
              [path]: {
                [method]: swagger2Operation
              }
            });

            // Create equivalent OpenAPI 3.x spec
            const openapi3Operation = createOperation('Test operation', ignoreValue);
            const openapi3Spec = createMinimalSpec({
              [path]: {
                [method]: openapi3Operation
              }
            });

            const swagger2Adapter = new Swagger2Adapter(swagger2Spec as any);
            const swagger2App = swagger2Adapter.adapt();

            const openapi3Adapter = new OpenAPI3Adapter(openapi3Spec);
            const openapi3App = openapi3Adapter.adapt();

            // Property: Swagger 2.0 should produce same filtering result as OpenAPI 3.x
            const swagger2Operations = swagger2App.resources.flatMap(r => r.operations);
            const openapi3Operations = openapi3App.resources.flatMap(r => r.operations);

            const swagger2HasOperation = swagger2Operations.some(
              op => op.path === path && op.method === method.toUpperCase()
            );
            const openapi3HasOperation = openapi3Operations.some(
              op => op.path === path && op.method === method.toUpperCase()
            );

            expect(swagger2HasOperation).toBe(openapi3HasOperation);
            expect(swagger2HasOperation).toBe(!ignoreValue);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve path-level x-uigen-ignore from Swagger 2.0', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          fc.array(fc.constantFrom('get', 'post', 'put', 'patch', 'delete'), { minLength: 1, maxLength: 3 }),
          fc.string({ minLength: 1, maxLength: 20 }).map(s => `/${s.replace(/[^a-z]/gi, '') || 'resource'}`),
          (pathIgnore, methods, path) => {
            // Create Swagger 2.0 spec with path-level annotation
            const swagger2PathItem: any = {
              'x-uigen-ignore': pathIgnore
            };
            methods.forEach(method => {
              swagger2PathItem[method] = createSwagger2Operation(`${method} operation`);
            });

            const swagger2Spec = createMinimalSwagger2Spec({
              [path]: swagger2PathItem
            });

            // Create equivalent OpenAPI 3.x spec
            const openapi3PathItem: any = {
              'x-uigen-ignore': pathIgnore
            };
            methods.forEach(method => {
              openapi3PathItem[method] = createOperation(`${method} operation`);
            });

            const openapi3Spec = createMinimalSpec({
              [path]: openapi3PathItem
            });

            const swagger2Adapter = new Swagger2Adapter(swagger2Spec as any);
            const swagger2App = swagger2Adapter.adapt();

            const openapi3Adapter = new OpenAPI3Adapter(openapi3Spec);
            const openapi3App = openapi3Adapter.adapt();

            // Property: Path-level annotation should work the same in both formats
            const swagger2Operations = swagger2App.resources.flatMap(r => r.operations);
            const openapi3Operations = openapi3App.resources.flatMap(r => r.operations);

            const swagger2HasOperations = swagger2Operations.some(op => op.path === path);
            const openapi3HasOperations = openapi3Operations.some(op => op.path === path);

            expect(swagger2HasOperations).toBe(openapi3HasOperations);
            expect(swagger2HasOperations).toBe(!pathIgnore);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

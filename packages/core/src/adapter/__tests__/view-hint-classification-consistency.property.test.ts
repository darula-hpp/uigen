import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { ViewHintClassifier } from '../view-hint-classifier.js';
import type { HttpMethod, Parameter, SchemaNode } from '../../ir/types.js';

/**
 * Property-Based Tests for View Hint Classification Consistency
 * 
 * Feature: uigen-complete-system
 * Property 6: View Hint Classification Consistency
 * Validates: Requirements 4.1-4.5
 * 
 * These tests verify that view hint classification is consistent across all valid
 * operation combinations. The same operation should always get the same classification.
 */

describe('View Hint Classification Consistency - Property Tests', () => {
  const classifier = new ViewHintClassifier();

  /**
   * Arbitrary for generating valid HTTP methods
   */
  const httpMethodArb = fc.constantFrom<HttpMethod>('GET', 'POST', 'PUT', 'PATCH', 'DELETE');

  /**
   * Arbitrary for generating paths with or without path parameters
   */
  const pathArb = fc.oneof(
    // Path without parameter: /resources
    fc.string({ minLength: 1, maxLength: 20 })
      .filter(s => /^[a-zA-Z0-9_-]+$/.test(s))
      .map(s => `/${s}`),
    // Path with parameter: /resources/{id}
    fc.tuple(
      fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
      fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s))
    ).map(([resource, param]) => `/${resource}/{${param}}`),
    // Nested path with parameter: /resources/{id}/subresource
    fc.tuple(
      fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
      fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
      fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s))
    ).map(([resource, param, sub]) => `/${resource}/{${param}}/${sub}`)
  );

  /**
   * Arbitrary for generating parameters
   */
  const parameterArb = fc.array(
    fc.record({
      name: fc.string({ minLength: 1, maxLength: 20 }),
      in: fc.constantFrom<'path' | 'query' | 'header'>('path', 'query', 'header'),
      required: fc.boolean(),
      schema: fc.record({
        type: fc.constantFrom<'string' | 'number' | 'integer' | 'boolean'>('string', 'number', 'integer', 'boolean'),
        key: fc.string({ minLength: 1 }),
        label: fc.string({ minLength: 1 }),
        required: fc.boolean()
      })
    }),
    { maxLength: 10 }
  );

  /**
   * Arbitrary for generating simple schema nodes (non-nested)
   */
  const simpleSchemaArb = fc.record({
    type: fc.constantFrom<'string' | 'number' | 'integer' | 'boolean'>('string', 'number', 'integer', 'boolean'),
    key: fc.string({ minLength: 1 }),
    label: fc.string({ minLength: 1 }),
    required: fc.boolean()
  });

  /**
   * Arbitrary for generating request body schemas with varying field counts
   */
  const requestBodyArb = fc.option(
    fc.nat({ max: 15 }).chain(fieldCount => 
      fc.record({
        type: fc.constant<'object'>('object'),
        key: fc.constant('body'),
        label: fc.constant('Body'),
        required: fc.constant(true),
        children: fc.array(simpleSchemaArb, { minLength: fieldCount, maxLength: fieldCount })
      })
    ),
    { nil: undefined }
  );

  /**
   * Property: Classification should be deterministic
   * 
   * For any operation, classifying it multiple times should always return the same result.
   */
  it('should return consistent classification for the same operation', () => {
    fc.assert(
      fc.property(
        httpMethodArb,
        pathArb,
        parameterArb,
        requestBodyArb,
        (method, path, parameters, requestBody) => {
          // Classify the same operation multiple times
          const result1 = classifier.classify(method, path, parameters, requestBody);
          const result2 = classifier.classify(method, path, parameters, requestBody);
          const result3 = classifier.classify(method, path, parameters, requestBody);

          // All results should be identical
          expect(result1).toBe(result2);
          expect(result2).toBe(result3);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: GET without path params and query params should always be 'list'
   * Validates: Requirement 4.1
   */
  it('should classify GET /resources as list', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 })
          .filter(s => /^[a-zA-Z0-9_-]+$/.test(s))
          .map(s => `/${s}`),
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1 }),
            in: fc.constantFrom<'path' | 'header'>('path', 'header'), // No query params
            required: fc.boolean(),
            schema: simpleSchemaArb
          }),
          { maxLength: 5 }
        ),
        (path, parameters) => {
          const result = classifier.classify('GET', path, parameters, undefined);
          expect(result).toBe('list');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: GET with path parameter should always be 'detail' (unless has query params)
   * Validates: Requirement 4.2
   */
  it('should classify GET /resources/{id} as detail when no query params', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
          fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s))
        ).map(([resource, param]) => `/${resource}/{${param}}`),
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1 }),
            in: fc.constantFrom<'path' | 'header'>('path', 'header'), // No query params
            required: fc.boolean(),
            schema: simpleSchemaArb
          }),
          { maxLength: 5 }
        ),
        (path, parameters) => {
          const result = classifier.classify('GET', path, parameters, undefined);
          expect(result).toBe('detail');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: GET with query parameters should always be 'search'
   * Validates: Requirement 4.6
   */
  it('should classify GET with query params as search', () => {
    fc.assert(
      fc.property(
        pathArb,
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1 }),
            in: fc.constant<'query'>('query'), // At least one query param
            required: fc.boolean(),
            schema: simpleSchemaArb
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (path, queryParams) => {
          const result = classifier.classify('GET', path, queryParams, undefined);
          expect(result).toBe('search');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: POST without path params should be 'create' or 'wizard' based on field count
   * Validates: Requirements 4.3, 4.7
   */
  it('should classify POST /resources as create or wizard based on field count', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 })
          .filter(s => /^[a-zA-Z0-9_-]+$/.test(s))
          .map(s => `/${s}`),
        parameterArb,
        requestBodyArb,
        (path, parameters, requestBody) => {
          const result = classifier.classify('POST', path, parameters, requestBody);
          
          // Count fields in request body
          const fieldCount = requestBody?.children?.length || 0;
          
          if (fieldCount > 8) {
            expect(result).toBe('wizard');
          } else {
            expect(result).toBe('create');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: POST with path parameter should always be 'action'
   * Validates: Requirement 4.8
   */
  it('should classify POST /resources/{id} as action', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
          fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s))
        ).map(([resource, param]) => `/${resource}/{${param}}`),
        parameterArb,
        requestBodyArb,
        (path, parameters, requestBody) => {
          const result = classifier.classify('POST', path, parameters, requestBody);
          expect(result).toBe('action');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: PUT/PATCH with path parameter should always be 'update'
   * Validates: Requirement 4.4
   */
  it('should classify PUT/PATCH /resources/{id} as update', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<'PUT' | 'PATCH'>('PUT', 'PATCH'),
        fc.tuple(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
          fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s))
        ).map(([resource, param]) => `/${resource}/{${param}}`),
        parameterArb,
        requestBodyArb,
        (method, path, parameters, requestBody) => {
          const result = classifier.classify(method, path, parameters, requestBody);
          expect(result).toBe('update');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: PUT/PATCH without path parameter should always be 'action'
   * Validates: Requirement 4.8
   */
  it('should classify PUT/PATCH /resources as action', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<'PUT' | 'PATCH'>('PUT', 'PATCH'),
        fc.string({ minLength: 1, maxLength: 20 })
          .filter(s => /^[a-zA-Z0-9_-]+$/.test(s))
          .map(s => `/${s}`),
        parameterArb,
        requestBodyArb,
        (method, path, parameters, requestBody) => {
          const result = classifier.classify(method, path, parameters, requestBody);
          expect(result).toBe('action');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: DELETE with path parameter should always be 'delete'
   * Validates: Requirement 4.5
   */
  it('should classify DELETE /resources/{id} as delete', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
          fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s))
        ).map(([resource, param]) => `/${resource}/{${param}}`),
        parameterArb,
        (path, parameters) => {
          const result = classifier.classify('DELETE', path, parameters, undefined);
          expect(result).toBe('delete');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: DELETE without path parameter should always be 'action'
   * Validates: Requirement 4.8
   */
  it('should classify DELETE /resources as action', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 })
          .filter(s => /^[a-zA-Z0-9_-]+$/.test(s))
          .map(s => `/${s}`),
        parameterArb,
        (path, parameters) => {
          const result = classifier.classify('DELETE', path, parameters, undefined);
          expect(result).toBe('action');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Classification should only depend on method, path pattern, params, and body
   * 
   * Operations with the same structure should get the same classification,
   * regardless of the specific values (e.g., resource names, parameter names).
   */
  it('should classify structurally equivalent operations identically', () => {
    fc.assert(
      fc.property(
        httpMethodArb,
        fc.boolean(), // hasPathParam
        fc.boolean(), // hasQueryParam
        fc.nat({ max: 15 }), // fieldCount
        (method, hasPathParam, hasQueryParam, fieldCount) => {
          // Generate two operations with same structure but different values
          const path1 = hasPathParam ? '/users/{id}' : '/users';
          const path2 = hasPathParam ? '/products/{productId}' : '/products';

          const params1: Parameter[] = hasQueryParam ? [{
            name: 'filter',
            in: 'query',
            required: false,
            schema: { type: 'string', key: 'filter', label: 'Filter', required: false }
          }] : [];

          const params2: Parameter[] = hasQueryParam ? [{
            name: 'search',
            in: 'query',
            required: false,
            schema: { type: 'string', key: 'search', label: 'Search', required: false }
          }] : [];

          const body1: SchemaNode | undefined = fieldCount > 0 ? {
            type: 'object',
            key: 'body',
            label: 'Body',
            required: true,
            children: Array.from({ length: fieldCount }, (_, i) => ({
              type: 'string' as const,
              key: `field${i}`,
              label: `Field ${i}`,
              required: true
            }))
          } : undefined;

          const body2: SchemaNode | undefined = fieldCount > 0 ? {
            type: 'object',
            key: 'data',
            label: 'Data',
            required: true,
            children: Array.from({ length: fieldCount }, (_, i) => ({
              type: 'string' as const,
              key: `prop${i}`,
              label: `Property ${i}`,
              required: true
            }))
          } : undefined;

          const result1 = classifier.classify(method, path1, params1, body1);
          const result2 = classifier.classify(method, path2, params2, body2);

          // Structurally equivalent operations should get same classification
          expect(result1).toBe(result2);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: All classifications should be valid ViewHint values
   * 
   * For any operation, the classification should always be one of the valid ViewHint types.
   */
  it('should always return a valid ViewHint', () => {
    fc.assert(
      fc.property(
        httpMethodArb,
        pathArb,
        parameterArb,
        requestBodyArb,
        (method, path, parameters, requestBody) => {
          const result = classifier.classify(method, path, parameters, requestBody);
          
          const validHints = ['list', 'detail', 'create', 'update', 'delete', 'search', 'wizard', 'action'];
          expect(validHints).toContain(result);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Nested objects should count all fields recursively for wizard detection
   * 
   * When counting fields for wizard detection, nested object fields should be counted recursively.
   */
  it('should count nested object fields recursively for wizard detection', () => {
    fc.assert(
      fc.property(
        fc.nat({ min: 1, max: 5 }), // topLevelFields
        fc.nat({ min: 1, max: 10 }), // nestedFields
        (topLevelFields, nestedFields) => {
          const requestBody: SchemaNode = {
            type: 'object',
            key: 'body',
            label: 'Body',
            required: true,
            children: [
              ...Array.from({ length: topLevelFields }, (_, i) => ({
                type: 'string' as const,
                key: `field${i}`,
                label: `Field ${i}`,
                required: true
              })),
              {
                type: 'object' as const,
                key: 'nested',
                label: 'Nested',
                required: true,
                children: Array.from({ length: nestedFields }, (_, i) => ({
                  type: 'string' as const,
                  key: `nested${i}`,
                  label: `Nested ${i}`,
                  required: true
                }))
              }
            ]
          };

          const result = classifier.classify('POST', '/users', [], requestBody);
          const totalFields = topLevelFields + nestedFields;

          if (totalFields > 8) {
            expect(result).toBe('wizard');
          } else {
            expect(result).toBe('create');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Array fields should count as single field
   * 
   * Array fields should be counted as a single field, not by their item count.
   */
  it('should count array fields as single field', () => {
    fc.assert(
      fc.property(
        fc.nat({ min: 1, max: 8 }), // regularFields
        fc.nat({ min: 1, max: 5 }), // arrayFields
        (regularFields, arrayFields) => {
          const requestBody: SchemaNode = {
            type: 'object',
            key: 'body',
            label: 'Body',
            required: true,
            children: [
              ...Array.from({ length: regularFields }, (_, i) => ({
                type: 'string' as const,
                key: `field${i}`,
                label: `Field ${i}`,
                required: true
              })),
              ...Array.from({ length: arrayFields }, (_, i) => ({
                type: 'array' as const,
                key: `array${i}`,
                label: `Array ${i}`,
                required: true,
                items: { type: 'string' as const, key: 'item', label: 'Item', required: false }
              }))
            ]
          };

          const result = classifier.classify('POST', '/users', [], requestBody);
          const totalFields = regularFields + arrayFields;

          if (totalFields > 8) {
            expect(result).toBe('wizard');
          } else {
            expect(result).toBe('create');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Edge case - exactly 8 fields should be 'create', 9 fields should be 'wizard'
   * 
   * The boundary condition for wizard detection should be consistent.
   */
  it('should handle wizard boundary condition consistently', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(7, 8, 9, 10),
        (fieldCount) => {
          const requestBody: SchemaNode = {
            type: 'object',
            key: 'body',
            label: 'Body',
            required: true,
            children: Array.from({ length: fieldCount }, (_, i) => ({
              type: 'string' as const,
              key: `field${i}`,
              label: `Field ${i}`,
              required: true
            }))
          };

          const result = classifier.classify('POST', '/users', [], requestBody);

          if (fieldCount > 8) {
            expect(result).toBe('wizard');
          } else {
            expect(result).toBe('create');
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

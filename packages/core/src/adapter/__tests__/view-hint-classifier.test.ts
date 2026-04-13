import { describe, it, expect } from 'vitest';
import { ViewHintClassifier } from '../view-hint-classifier.js';
import type { Parameter, SchemaNode } from '../../ir/types.js';

/**
 * Unit Tests for ViewHintClassifier
 * 
 * **Validates: Requirements 4.1-4.8**
 * 
 * These tests verify specific scenarios and edge cases for view hint classification.
 */

describe('ViewHintClassifier', () => {
  const classifier = new ViewHintClassifier();

  describe('classify - list view', () => {
    /**
     * **Validates: Requirements 4.1**
     */
    it('should classify GET /resources as list', () => {
      const result = classifier.classify('GET', '/users', []);
      expect(result).toBe('list');
    });

    /**
     * **Validates: Requirements 4.1**
     */
    it('should classify GET /resources with path params (non-query) as list', () => {
      const parameters: Parameter[] = [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', key: 'id', label: 'ID', required: true }
        }
      ];

      const result = classifier.classify('GET', '/users', parameters);
      expect(result).toBe('list');
    });

    /**
     * **Validates: Requirements 4.1**
     */
    it('should classify GET /resources with header params as list', () => {
      const parameters: Parameter[] = [
        {
          name: 'Authorization',
          in: 'header',
          required: true,
          schema: { type: 'string', key: 'auth', label: 'Authorization', required: true }
        }
      ];

      const result = classifier.classify('GET', '/users', parameters);
      expect(result).toBe('list');
    });
  });

  describe('classify - detail view', () => {
    /**
     * **Validates: Requirements 4.2**
     */
    it('should classify GET /resources/{id} as detail', () => {
      const result = classifier.classify('GET', '/users/{id}', []);
      expect(result).toBe('detail');
    });

    /**
     * **Validates: Requirements 4.2**
     */
    it('should classify GET /resources/{userId} as detail', () => {
      const result = classifier.classify('GET', '/users/{userId}', []);
      expect(result).toBe('detail');
    });

    /**
     * **Validates: Requirements 4.2**
     */
    it('should classify GET /resources/{id}/subresource as detail', () => {
      const result = classifier.classify('GET', '/users/{id}/profile', []);
      expect(result).toBe('detail');
    });

    /**
     * **Validates: Requirements 4.2**
     */
    it('should classify GET with path parameter and non-query params as detail', () => {
      const parameters: Parameter[] = [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', key: 'id', label: 'ID', required: true }
        },
        {
          name: 'Authorization',
          in: 'header',
          required: true,
          schema: { type: 'string', key: 'auth', label: 'Authorization', required: true }
        }
      ];

      const result = classifier.classify('GET', '/users/{id}', parameters);
      expect(result).toBe('detail');
    });
  });

  describe('classify - create view', () => {
    /**
     * **Validates: Requirements 4.3**
     */
    it('should classify POST /resources as create', () => {
      const result = classifier.classify('POST', '/users', []);
      expect(result).toBe('create');
    });

    /**
     * **Validates: Requirements 4.3**
     */
    it('should classify POST /resources with small request body as create', () => {
      const requestBody: SchemaNode = {
        type: 'object',
        key: 'body',
        label: 'Body',
        required: true,
        children: [
          { type: 'string', key: 'name', label: 'Name', required: true },
          { type: 'string', key: 'email', label: 'Email', required: true },
          { type: 'integer', key: 'age', label: 'Age', required: false }
        ]
      };

      const result = classifier.classify('POST', '/users', [], requestBody);
      expect(result).toBe('create');
    });

    /**
     * **Validates: Requirements 4.3**
     */
    it('should classify POST /resources with exactly 8 fields as create', () => {
      const requestBody: SchemaNode = {
        type: 'object',
        key: 'body',
        label: 'Body',
        required: true,
        children: Array.from({ length: 8 }, (_, i) => ({
          type: 'string' as const,
          key: `field${i}`,
          label: `Field ${i}`,
          required: true
        }))
      };

      const result = classifier.classify('POST', '/users', [], requestBody);
      expect(result).toBe('create');
    });
  });

  describe('classify - update view', () => {
    /**
     * **Validates: Requirements 4.4**
     */
    it('should classify PUT /resources/{id} as update', () => {
      const result = classifier.classify('PUT', '/users/{id}', []);
      expect(result).toBe('update');
    });

    /**
     * **Validates: Requirements 4.4**
     */
    it('should classify PATCH /resources/{id} as update', () => {
      const result = classifier.classify('PATCH', '/users/{id}', []);
      expect(result).toBe('update');
    });

    /**
     * **Validates: Requirements 4.4**
     */
    it('should classify PUT /resources/{userId} as update', () => {
      const result = classifier.classify('PUT', '/users/{userId}', []);
      expect(result).toBe('update');
    });

    /**
     * **Validates: Requirements 4.4**
     */
    it('should classify PATCH with path parameter and request body as update', () => {
      const requestBody: SchemaNode = {
        type: 'object',
        key: 'body',
        label: 'Body',
        required: true,
        children: [
          { type: 'string', key: 'name', label: 'Name', required: true },
          { type: 'string', key: 'email', label: 'Email', required: true }
        ]
      };

      const result = classifier.classify('PATCH', '/users/{id}', [], requestBody);
      expect(result).toBe('update');
    });
  });

  describe('classify - delete view', () => {
    /**
     * **Validates: Requirements 4.5**
     */
    it('should classify DELETE /resources/{id} as delete', () => {
      const result = classifier.classify('DELETE', '/users/{id}', []);
      expect(result).toBe('delete');
    });

    /**
     * **Validates: Requirements 4.5**
     */
    it('should classify DELETE /resources/{userId} as delete', () => {
      const result = classifier.classify('DELETE', '/users/{userId}', []);
      expect(result).toBe('delete');
    });

    /**
     * **Validates: Requirements 4.5**
     */
    it('should classify DELETE with path parameter and params as delete', () => {
      const parameters: Parameter[] = [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', key: 'id', label: 'ID', required: true }
        }
      ];

      const result = classifier.classify('DELETE', '/users/{id}', parameters);
      expect(result).toBe('delete');
    });
  });

  describe('classify - search view', () => {
    /**
     * **Validates: Requirements 4.6**
     */
    it('should classify GET with query params as search', () => {
      const parameters: Parameter[] = [
        {
          name: 'filter',
          in: 'query',
          required: false,
          schema: { type: 'string', key: 'filter', label: 'Filter', required: false }
        }
      ];

      const result = classifier.classify('GET', '/users', parameters);
      expect(result).toBe('search');
    });

    /**
     * **Validates: Requirements 4.6**
     */
    it('should classify GET with multiple query params as search', () => {
      const parameters: Parameter[] = [
        {
          name: 'search',
          in: 'query',
          required: false,
          schema: { type: 'string', key: 'search', label: 'Search', required: false }
        },
        {
          name: 'status',
          in: 'query',
          required: false,
          schema: { type: 'string', key: 'status', label: 'Status', required: false }
        },
        {
          name: 'limit',
          in: 'query',
          required: false,
          schema: { type: 'integer', key: 'limit', label: 'Limit', required: false }
        }
      ];

      const result = classifier.classify('GET', '/users', parameters);
      expect(result).toBe('search');
    });

    /**
     * **Validates: Requirements 4.6**
     */
    it('should classify GET with path param and query params as search', () => {
      const parameters: Parameter[] = [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', key: 'id', label: 'ID', required: true }
        },
        {
          name: 'filter',
          in: 'query',
          required: false,
          schema: { type: 'string', key: 'filter', label: 'Filter', required: false }
        }
      ];

      const result = classifier.classify('GET', '/users/{id}', parameters);
      expect(result).toBe('search');
    });

    /**
     * **Validates: Requirements 4.6**
     */
    it('should prioritize search over detail when query params exist', () => {
      const parameters: Parameter[] = [
        {
          name: 'include',
          in: 'query',
          required: false,
          schema: { type: 'string', key: 'include', label: 'Include', required: false }
        }
      ];

      const result = classifier.classify('GET', '/users/{id}', parameters);
      expect(result).toBe('search');
    });

    /**
     * **Validates: Requirements 4.1**
     * Pagination parameters should not trigger search classification
     */
    it('should classify GET with only pagination params as list', () => {
      const parameters: Parameter[] = [
        {
          name: 'limit',
          in: 'query',
          required: false,
          schema: { type: 'integer', key: 'limit', label: 'Limit', required: false }
        },
        {
          name: 'offset',
          in: 'query',
          required: false,
          schema: { type: 'integer', key: 'offset', label: 'Offset', required: false }
        }
      ];

      const result = classifier.classify('GET', '/users', parameters);
      expect(result).toBe('list');
    });

    /**
     * **Validates: Requirements 4.6**
     * Mix of pagination and filter params should still be search
     */
    it('should classify GET with pagination and filter params as search', () => {
      const parameters: Parameter[] = [
        {
          name: 'limit',
          in: 'query',
          required: false,
          schema: { type: 'integer', key: 'limit', label: 'Limit', required: false }
        },
        {
          name: 'status',
          in: 'query',
          required: false,
          schema: { type: 'string', key: 'status', label: 'Status', required: false }
        }
      ];

      const result = classifier.classify('GET', '/users', parameters);
      expect(result).toBe('search');
    });
  });

  describe('classify - wizard view', () => {
    /**
     * **Validates: Requirements 4.7**
     */
    it('should classify POST with >8 fields as wizard', () => {
      const requestBody: SchemaNode = {
        type: 'object',
        key: 'body',
        label: 'Body',
        required: true,
        children: Array.from({ length: 9 }, (_, i) => ({
          type: 'string' as const,
          key: `field${i}`,
          label: `Field ${i}`,
          required: true
        }))
      };

      const result = classifier.classify('POST', '/users', [], requestBody);
      expect(result).toBe('wizard');
    });

    /**
     * **Validates: Requirements 4.7**
     */
    it('should classify POST with 10 fields as wizard', () => {
      const requestBody: SchemaNode = {
        type: 'object',
        key: 'body',
        label: 'Body',
        required: true,
        children: Array.from({ length: 10 }, (_, i) => ({
          type: 'string' as const,
          key: `field${i}`,
          label: `Field ${i}`,
          required: true
        }))
      };

      const result = classifier.classify('POST', '/users', [], requestBody);
      expect(result).toBe('wizard');
    });

    /**
     * **Validates: Requirements 4.7**
     */
    it('should count nested object fields for wizard detection', () => {
      const requestBody: SchemaNode = {
        type: 'object',
        key: 'body',
        label: 'Body',
        required: true,
        children: [
          { type: 'string', key: 'field1', label: 'Field 1', required: true },
          { type: 'string', key: 'field2', label: 'Field 2', required: true },
          { type: 'string', key: 'field3', label: 'Field 3', required: true },
          {
            type: 'object',
            key: 'nested',
            label: 'Nested',
            required: true,
            children: [
              { type: 'string', key: 'nested1', label: 'Nested 1', required: true },
              { type: 'string', key: 'nested2', label: 'Nested 2', required: true },
              { type: 'string', key: 'nested3', label: 'Nested 3', required: true },
              { type: 'string', key: 'nested4', label: 'Nested 4', required: true },
              { type: 'string', key: 'nested5', label: 'Nested 5', required: true },
              { type: 'string', key: 'nested6', label: 'Nested 6', required: true }
            ]
          }
        ]
      };

      // Total: 3 top-level + 6 nested = 9 fields
      const result = classifier.classify('POST', '/users', [], requestBody);
      expect(result).toBe('wizard');
    });

    /**
     * **Validates: Requirements 4.7**
     */
    it('should count array fields as single field', () => {
      const requestBody: SchemaNode = {
        type: 'object',
        key: 'body',
        label: 'Body',
        required: true,
        children: [
          { type: 'string', key: 'field1', label: 'Field 1', required: true },
          { type: 'string', key: 'field2', label: 'Field 2', required: true },
          { type: 'string', key: 'field3', label: 'Field 3', required: true },
          {
            type: 'array',
            key: 'tags',
            label: 'Tags',
            required: true,
            items: { type: 'string', key: 'tag', label: 'Tag', required: false }
          }
        ]
      };

      // Total: 4 fields (array counts as 1)
      const result = classifier.classify('POST', '/users', [], requestBody);
      expect(result).toBe('create');
    });
  });

  describe('classify - action view', () => {
    /**
     * **Validates: Requirements 4.8**
     */
    it('should classify POST /resources/{id} as action', () => {
      const result = classifier.classify('POST', '/users/{id}/activate', []);
      expect(result).toBe('action');
    });

    /**
     * **Validates: Requirements 4.8**
     */
    it('should classify POST with path parameter as action', () => {
      const result = classifier.classify('POST', '/users/{id}', []);
      expect(result).toBe('action');
    });

    /**
     * **Validates: Requirements 4.8**
     */
    it('should classify PUT /resources as action', () => {
      const result = classifier.classify('PUT', '/users', []);
      expect(result).toBe('action');
    });

    /**
     * **Validates: Requirements 4.8**
     */
    it('should classify PATCH /resources as action', () => {
      const result = classifier.classify('PATCH', '/users', []);
      expect(result).toBe('action');
    });

    /**
     * **Validates: Requirements 4.8**
     */
    it('should classify DELETE /resources as action', () => {
      const result = classifier.classify('DELETE', '/users', []);
      expect(result).toBe('action');
    });

    /**
     * **Validates: Requirements 4.8**
     */
    it('should classify POST with path param even with >8 fields as action', () => {
      const requestBody: SchemaNode = {
        type: 'object',
        key: 'body',
        label: 'Body',
        required: true,
        children: Array.from({ length: 10 }, (_, i) => ({
          type: 'string' as const,
          key: `field${i}`,
          label: `Field ${i}`,
          required: true
        }))
      };

      const result = classifier.classify('POST', '/users/{id}/update', [], requestBody);
      expect(result).toBe('action');
    });
  });

  describe('classify - edge cases', () => {
    it('should handle empty path', () => {
      const result = classifier.classify('GET', '', []);
      expect(result).toBe('list');
    });

    it('should handle path with only slash', () => {
      const result = classifier.classify('GET', '/', []);
      expect(result).toBe('list');
    });

    it('should handle undefined parameters', () => {
      const result = classifier.classify('GET', '/users', undefined as any);
      expect(result).toBe('list');
    });

    it('should handle undefined request body', () => {
      const result = classifier.classify('POST', '/users', [], undefined);
      expect(result).toBe('create');
    });

    it('should handle request body with no children', () => {
      const requestBody: SchemaNode = {
        type: 'object',
        key: 'body',
        label: 'Body',
        required: true
      };

      const result = classifier.classify('POST', '/users', [], requestBody);
      expect(result).toBe('create');
    });

    it('should handle request body with empty children array', () => {
      const requestBody: SchemaNode = {
        type: 'object',
        key: 'body',
        label: 'Body',
        required: true,
        children: []
      };

      const result = classifier.classify('POST', '/users', [], requestBody);
      expect(result).toBe('create');
    });

    it('should handle non-object request body', () => {
      const requestBody: SchemaNode = {
        type: 'string',
        key: 'body',
        label: 'Body',
        required: true
      };

      const result = classifier.classify('POST', '/users', [], requestBody);
      expect(result).toBe('create');
    });

    it('should handle path with multiple parameters', () => {
      const result = classifier.classify('GET', '/users/{userId}/posts/{postId}', []);
      expect(result).toBe('detail');
    });

    it('should handle path with incomplete parameter syntax', () => {
      const result = classifier.classify('GET', '/users/{id', []);
      expect(result).toBe('list');
    });

    it('should handle path with only opening brace', () => {
      const result = classifier.classify('GET', '/users/{', []);
      expect(result).toBe('list');
    });

    it('should handle path with only closing brace', () => {
      const result = classifier.classify('GET', '/users/}', []);
      expect(result).toBe('list');
    });

    it('should handle mixed parameter types correctly', () => {
      const parameters: Parameter[] = [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', key: 'id', label: 'ID', required: true }
        },
        {
          name: 'Authorization',
          in: 'header',
          required: true,
          schema: { type: 'string', key: 'auth', label: 'Authorization', required: true }
        },
        {
          name: 'filter',
          in: 'query',
          required: false,
          schema: { type: 'string', key: 'filter', label: 'Filter', required: false }
        }
      ];

      const result = classifier.classify('GET', '/users/{id}', parameters);
      expect(result).toBe('search');
    });

    it('should handle deeply nested objects', () => {
      const requestBody: SchemaNode = {
        type: 'object',
        key: 'body',
        label: 'Body',
        required: true,
        children: [
          { type: 'string', key: 'field1', label: 'Field 1', required: true },
          {
            type: 'object',
            key: 'level1',
            label: 'Level 1',
            required: true,
            children: [
              { type: 'string', key: 'field2', label: 'Field 2', required: true },
              {
                type: 'object',
                key: 'level2',
                label: 'Level 2',
                required: true,
                children: [
                  { type: 'string', key: 'field3', label: 'Field 3', required: true },
                  { type: 'string', key: 'field4', label: 'Field 4', required: true },
                  { type: 'string', key: 'field5', label: 'Field 5', required: true },
                  { type: 'string', key: 'field6', label: 'Field 6', required: true },
                  { type: 'string', key: 'field7', label: 'Field 7', required: true },
                  { type: 'string', key: 'field8', label: 'Field 8', required: true },
                  { type: 'string', key: 'field9', label: 'Field 9', required: true }
                ]
              }
            ]
          }
        ]
      };

      // Total: 1 + 1 + 7 = 9 fields
      const result = classifier.classify('POST', '/users', [], requestBody);
      expect(result).toBe('wizard');
    });
  });
});

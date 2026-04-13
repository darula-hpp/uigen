import { describe, it, expect } from 'vitest';
import { RelationshipDetector } from '../relationship-detector.js';
import type { Resource } from '../../ir/types.js';

/**
 * Unit Tests for RelationshipDetector
 * 
 * **Validates: Requirements 5.1-5.4**
 * 
 * These tests verify specific scenarios and edge cases for relationship detection.
 */

describe('RelationshipDetector', () => {
  describe('detectFromPaths', () => {
    /**
     * **Validates: Requirements 5.1, 5.3, 5.4**
     */
    it('should detect hasMany relationship from /users/{id}/comments pattern', () => {
      const usersResource: Resource = {
        name: 'Users',
        slug: 'users',
        operations: [
          {
            id: 'get_user_comments',
            method: 'GET',
            path: '/users/{id}/comments',
            summary: 'Get user comments',
            parameters: [],
            responses: {},
            viewHint: 'list'
          }
        ],
        schema: {
          type: 'object',
          key: 'users',
          label: 'Users',
          required: false
        },
        relationships: [],
        pagination: undefined
      };

      const commentsResource: Resource = {
        name: 'Comments',
        slug: 'comments',
        operations: [],
        schema: {
          type: 'object',
          key: 'comments',
          label: 'Comments',
          required: false
        },
        relationships: [],
        pagination: undefined
      };

      const allResources = new Map<string, Resource>([
        ['users', usersResource],
        ['comments', commentsResource]
      ]);

      const detector = new RelationshipDetector();
      const relationships = detector.detectFromPaths(usersResource, allResources);

      expect(relationships).toHaveLength(1);
      expect(relationships[0]).toEqual({
        target: 'comments',
        type: 'hasMany',
        path: '/users/{id}/comments'
      });
    });

    /**
     * **Validates: Requirements 5.1, 5.3, 5.4**
     */
    it('should detect multiple hasMany relationships', () => {
      const usersResource: Resource = {
        name: 'Users',
        slug: 'users',
        operations: [
          {
            id: 'get_user_comments',
            method: 'GET',
            path: '/users/{id}/comments',
            summary: 'Get user comments',
            parameters: [],
            responses: {},
            viewHint: 'list'
          },
          {
            id: 'get_user_posts',
            method: 'GET',
            path: '/users/{id}/posts',
            summary: 'Get user posts',
            parameters: [],
            responses: {},
            viewHint: 'list'
          },
          {
            id: 'get_user_orders',
            method: 'GET',
            path: '/users/{userId}/orders',
            summary: 'Get user orders',
            parameters: [],
            responses: {},
            viewHint: 'list'
          }
        ],
        schema: {
          type: 'object',
          key: 'users',
          label: 'Users',
          required: false
        },
        relationships: [],
        pagination: undefined
      };

      const allResources = new Map<string, Resource>([
        ['users', usersResource],
        ['comments', { name: 'Comments', slug: 'comments', operations: [], schema: { type: 'object', key: 'comments', label: 'Comments', required: false }, relationships: [], pagination: undefined }],
        ['posts', { name: 'Posts', slug: 'posts', operations: [], schema: { type: 'object', key: 'posts', label: 'Posts', required: false }, relationships: [], pagination: undefined }],
        ['orders', { name: 'Orders', slug: 'orders', operations: [], schema: { type: 'object', key: 'orders', label: 'Orders', required: false }, relationships: [], pagination: undefined }]
      ]);

      const detector = new RelationshipDetector();
      const relationships = detector.detectFromPaths(usersResource, allResources);

      expect(relationships).toHaveLength(3);
      expect(relationships.map(r => r.target).sort()).toEqual(['comments', 'orders', 'posts']);
      relationships.forEach(rel => {
        expect(rel.type).toBe('hasMany');
      });
    });

    /**
     * **Validates: Requirements 5.1**
     */
    it('should not detect relationships for non-existent target resources', () => {
      const usersResource: Resource = {
        name: 'Users',
        slug: 'users',
        operations: [
          {
            id: 'get_user_comments',
            method: 'GET',
            path: '/users/{id}/comments',
            summary: 'Get user comments',
            parameters: [],
            responses: {},
            viewHint: 'list'
          }
        ],
        schema: {
          type: 'object',
          key: 'users',
          label: 'Users',
          required: false
        },
        relationships: [],
        pagination: undefined
      };

      // Don't include comments resource
      const allResources = new Map<string, Resource>([
        ['users', usersResource]
      ]);

      const detector = new RelationshipDetector();
      const relationships = detector.detectFromPaths(usersResource, allResources);

      expect(relationships).toHaveLength(0);
    });

    /**
     * **Validates: Requirements 5.1**
     */
    it('should not detect relationships from paths without parameters', () => {
      const usersResource: Resource = {
        name: 'Users',
        slug: 'users',
        operations: [
          {
            id: 'get_users_comments',
            method: 'GET',
            path: '/users/comments', // No {id} parameter
            summary: 'Get all comments',
            parameters: [],
            responses: {},
            viewHint: 'list'
          }
        ],
        schema: {
          type: 'object',
          key: 'users',
          label: 'Users',
          required: false
        },
        relationships: [],
        pagination: undefined
      };

      const allResources = new Map<string, Resource>([
        ['users', usersResource],
        ['comments', { name: 'Comments', slug: 'comments', operations: [], schema: { type: 'object', key: 'comments', label: 'Comments', required: false }, relationships: [], pagination: undefined }]
      ]);

      const detector = new RelationshipDetector();
      const relationships = detector.detectFromPaths(usersResource, allResources);

      expect(relationships).toHaveLength(0);
    });

    /**
     * **Validates: Requirements 5.1**
     */
    it('should handle resource slugs with special characters', () => {
      const resource: Resource = {
        name: 'API Users',
        slug: 'api-users',
        operations: [
          {
            id: 'get_api_user_comments',
            method: 'GET',
            path: '/api-users/{id}/comments',
            summary: 'Get comments',
            parameters: [],
            responses: {},
            viewHint: 'list'
          }
        ],
        schema: {
          type: 'object',
          key: 'api-users',
          label: 'API Users',
          required: false
        },
        relationships: [],
        pagination: undefined
      };

      const allResources = new Map<string, Resource>([
        ['api-users', resource],
        ['comments', { name: 'Comments', slug: 'comments', operations: [], schema: { type: 'object', key: 'comments', label: 'Comments', required: false }, relationships: [], pagination: undefined }]
      ]);

      const detector = new RelationshipDetector();
      const relationships = detector.detectFromPaths(resource, allResources);

      expect(relationships).toHaveLength(1);
      expect(relationships[0].target).toBe('comments');
    });

    /**
     * **Validates: Requirements 5.1**
     */
    it('should not create duplicate relationships', () => {
      const usersResource: Resource = {
        name: 'Users',
        slug: 'users',
        operations: [
          {
            id: 'get_user_comments',
            method: 'GET',
            path: '/users/{id}/comments',
            summary: 'Get user comments',
            parameters: [],
            responses: {},
            viewHint: 'list'
          },
          {
            id: 'post_user_comment',
            method: 'POST',
            path: '/users/{id}/comments',
            summary: 'Create user comment',
            parameters: [],
            responses: {},
            viewHint: 'create'
          }
        ],
        schema: {
          type: 'object',
          key: 'users',
          label: 'Users',
          required: false
        },
        relationships: [],
        pagination: undefined
      };

      const allResources = new Map<string, Resource>([
        ['users', usersResource],
        ['comments', { name: 'Comments', slug: 'comments', operations: [], schema: { type: 'object', key: 'comments', label: 'Comments', required: false }, relationships: [], pagination: undefined }]
      ]);

      const detector = new RelationshipDetector();
      const relationships = detector.detectFromPaths(usersResource, allResources);

      expect(relationships).toHaveLength(1);
    });

    /**
     * **Validates: Requirements 5.1**
     */
    it('should return empty array when no relationships exist', () => {
      const usersResource: Resource = {
        name: 'Users',
        slug: 'users',
        operations: [
          {
            id: 'get_users',
            method: 'GET',
            path: '/users',
            summary: 'Get users',
            parameters: [],
            responses: {},
            viewHint: 'list'
          },
          {
            id: 'get_user',
            method: 'GET',
            path: '/users/{id}',
            summary: 'Get user',
            parameters: [],
            responses: {},
            viewHint: 'detail'
          }
        ],
        schema: {
          type: 'object',
          key: 'users',
          label: 'Users',
          required: false
        },
        relationships: [],
        pagination: undefined
      };

      const allResources = new Map<string, Resource>([
        ['users', usersResource]
      ]);

      const detector = new RelationshipDetector();
      const relationships = detector.detectFromPaths(usersResource, allResources);

      expect(relationships).toHaveLength(0);
    });
  });

  describe('detectFromSchema', () => {
    /**
     * **Validates: Requirements 5.2, 5.3**
     */
    it('should detect belongsTo relationship from URI field matching resource name', () => {
      const schema = {
        type: 'object' as const,
        key: 'comment',
        label: 'Comment',
        required: false,
        children: [
          {
            type: 'string' as const,
            key: 'userId',
            label: 'User ID',
            required: false,
            format: 'uri'
          },
          {
            type: 'string' as const,
            key: 'text',
            label: 'Text',
            required: false
          }
        ]
      };

      const allResources = new Map<string, Resource>([
        ['users', {
          name: 'Users',
          slug: 'users',
          operations: [],
          schema: { type: 'object', key: 'users', label: 'Users', required: false },
          relationships: [],
          pagination: undefined
        }]
      ]);

      const detector = new RelationshipDetector();
      const relationships = detector.detectFromSchema(schema, allResources);

      expect(relationships).toHaveLength(1);
      expect(relationships[0]).toEqual({
        target: 'users',
        type: 'belongsTo',
        path: '/users/{id}'
      });
    });

    /**
     * **Validates: Requirements 5.2, 5.3**
     */
    it('should detect belongsTo from various field naming patterns', () => {
      const testCases = [
        { fieldName: 'userId', resourceSlug: 'users' },
        { fieldName: 'user_id', resourceSlug: 'users' },
        { fieldName: 'user-id', resourceSlug: 'users' },
        { fieldName: 'user', resourceSlug: 'users' },
        { fieldName: 'productId', resourceSlug: 'products' },
        { fieldName: 'product_id', resourceSlug: 'products' }
      ];

      testCases.forEach(({ fieldName, resourceSlug }) => {
        const schema = {
          type: 'object' as const,
          key: 'item',
          label: 'Item',
          required: false,
          children: [
            {
              type: 'string' as const,
              key: fieldName,
              label: fieldName,
              required: false,
              format: 'uri'
            }
          ]
        };

        const allResources = new Map<string, Resource>([
          [resourceSlug, {
            name: resourceSlug,
            slug: resourceSlug,
            operations: [],
            schema: { type: 'object', key: resourceSlug, label: resourceSlug, required: false },
            relationships: [],
            pagination: undefined
          }]
        ]);

        const detector = new RelationshipDetector();
        const relationships = detector.detectFromSchema(schema, allResources);

        expect(relationships).toHaveLength(1);
        expect(relationships[0].target).toBe(resourceSlug);
        expect(relationships[0].type).toBe('belongsTo');
      });
    });

    /**
     * **Validates: Requirements 5.2, 5.3**
     */
    it('should detect multiple belongsTo relationships', () => {
      const schema = {
        type: 'object' as const,
        key: 'order',
        label: 'Order',
        required: false,
        children: [
          {
            type: 'string' as const,
            key: 'userId',
            label: 'User ID',
            required: false,
            format: 'uri'
          },
          {
            type: 'string' as const,
            key: 'productId',
            label: 'Product ID',
            required: false,
            format: 'uri'
          }
        ]
      };

      const allResources = new Map<string, Resource>([
        ['users', {
          name: 'Users',
          slug: 'users',
          operations: [],
          schema: { type: 'object', key: 'users', label: 'Users', required: false },
          relationships: [],
          pagination: undefined
        }],
        ['products', {
          name: 'Products',
          slug: 'products',
          operations: [],
          schema: { type: 'object', key: 'products', label: 'Products', required: false },
          relationships: [],
          pagination: undefined
        }]
      ]);

      const detector = new RelationshipDetector();
      const relationships = detector.detectFromSchema(schema, allResources);

      expect(relationships).toHaveLength(2);
      expect(relationships.map(r => r.target).sort()).toEqual(['products', 'users']);
      relationships.forEach(rel => {
        expect(rel.type).toBe('belongsTo');
      });
    });

    /**
     * **Validates: Requirements 5.2**
     */
    it('should not detect relationships from non-URI fields', () => {
      const schema = {
        type: 'object' as const,
        key: 'comment',
        label: 'Comment',
        required: false,
        children: [
          {
            type: 'string' as const,
            key: 'userId',
            label: 'User ID',
            required: false
            // No format: 'uri'
          }
        ]
      };

      const allResources = new Map<string, Resource>([
        ['users', {
          name: 'Users',
          slug: 'users',
          operations: [],
          schema: { type: 'object', key: 'users', label: 'Users', required: false },
          relationships: [],
          pagination: undefined
        }]
      ]);

      const detector = new RelationshipDetector();
      const relationships = detector.detectFromSchema(schema, allResources);

      expect(relationships).toHaveLength(0);
    });

    /**
     * **Validates: Requirements 5.2, 5.3**
     */
    it('should detect relationships in nested objects', () => {
      const schema = {
        type: 'object' as const,
        key: 'order',
        label: 'Order',
        required: false,
        children: [
          {
            type: 'object' as const,
            key: 'metadata',
            label: 'Metadata',
            required: false,
            children: [
              {
                type: 'string' as const,
                key: 'userId',
                label: 'User ID',
                required: false,
                format: 'uri'
              }
            ]
          }
        ]
      };

      const allResources = new Map<string, Resource>([
        ['users', {
          name: 'Users',
          slug: 'users',
          operations: [],
          schema: { type: 'object', key: 'users', label: 'Users', required: false },
          relationships: [],
          pagination: undefined
        }]
      ]);

      const detector = new RelationshipDetector();
      const relationships = detector.detectFromSchema(schema, allResources);

      expect(relationships).toHaveLength(1);
      expect(relationships[0].target).toBe('users');
    });

    /**
     * **Validates: Requirements 5.2, 5.3**
     */
    it('should detect relationships in array items', () => {
      const schema = {
        type: 'object' as const,
        key: 'order',
        label: 'Order',
        required: false,
        children: [
          {
            type: 'array' as const,
            key: 'items',
            label: 'Items',
            required: false,
            items: {
              type: 'object' as const,
              key: 'item',
              label: 'Item',
              required: false,
              children: [
                {
                  type: 'string' as const,
                  key: 'productId',
                  label: 'Product ID',
                  required: false,
                  format: 'uri'
                }
              ]
            }
          }
        ]
      };

      const allResources = new Map<string, Resource>([
        ['products', {
          name: 'Products',
          slug: 'products',
          operations: [],
          schema: { type: 'object', key: 'products', label: 'Products', required: false },
          relationships: [],
          pagination: undefined
        }]
      ]);

      const detector = new RelationshipDetector();
      const relationships = detector.detectFromSchema(schema, allResources);

      expect(relationships).toHaveLength(1);
      expect(relationships[0].target).toBe('products');
    });

    /**
     * **Validates: Requirements 5.2**
     */
    it('should not create duplicate relationships from schema', () => {
      const schema = {
        type: 'object' as const,
        key: 'order',
        label: 'Order',
        required: false,
        children: [
          {
            type: 'string' as const,
            key: 'userId',
            label: 'User ID',
            required: false,
            format: 'uri'
          },
          {
            type: 'string' as const,
            key: 'user_id',
            label: 'User ID Alt',
            required: false,
            format: 'uri'
          }
        ]
      };

      const allResources = new Map<string, Resource>([
        ['users', {
          name: 'Users',
          slug: 'users',
          operations: [],
          schema: { type: 'object', key: 'users', label: 'Users', required: false },
          relationships: [],
          pagination: undefined
        }]
      ]);

      const detector = new RelationshipDetector();
      const relationships = detector.detectFromSchema(schema, allResources);

      // Should only detect one relationship even though multiple fields match
      expect(relationships).toHaveLength(1);
      expect(relationships[0].target).toBe('users');
    });

    /**
     * **Validates: Requirements 5.2**
     */
    it('should return empty array when no relationships exist in schema', () => {
      const schema = {
        type: 'object' as const,
        key: 'item',
        label: 'Item',
        required: false,
        children: [
          {
            type: 'string' as const,
            key: 'name',
            label: 'Name',
            required: false
          },
          {
            type: 'number' as const,
            key: 'price',
            label: 'Price',
            required: false
          }
        ]
      };

      const allResources = new Map<string, Resource>([
        ['users', {
          name: 'Users',
          slug: 'users',
          operations: [],
          schema: { type: 'object', key: 'users', label: 'Users', required: false },
          relationships: [],
          pagination: undefined
        }]
      ]);

      const detector = new RelationshipDetector();
      const relationships = detector.detectFromSchema(schema, allResources);

      expect(relationships).toHaveLength(0);
    });
  });
});

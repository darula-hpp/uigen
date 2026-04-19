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

  describe('detectManyToMany', () => {
    /**
     * **Validates: Requirements 1.2, 1.3, 1.4, 1.5**
     */
    it('should detect manyToMany relationship from /meetings/{id}/templates pattern', () => {
      const meetingsResource: Resource = {
        name: 'Meetings',
        slug: 'meetings',
        uigenId: 'meetings',
        operations: [
          {
            id: 'get_meeting_templates',
            uigenId: 'get_meeting_templates',
            method: 'GET',
            path: '/meetings/{id}/templates',
            summary: 'List meeting templates',
            parameters: [],
            responses: {},
            viewHint: 'list'
          },
          {
            id: 'add_meeting_template',
            uigenId: 'add_meeting_template',
            method: 'POST',
            path: '/meetings/{id}/templates',
            summary: 'Add template to meeting',
            parameters: [],
            responses: {},
            viewHint: 'create'
          }
        ],
        schema: {
          type: 'object',
          key: 'meetings',
          label: 'Meetings',
          required: false
        },
        relationships: []
      };

      const templatesResource: Resource = {
        name: 'Templates',
        slug: 'templates',
        uigenId: 'templates',
        operations: [
          {
            id: 'get_templates',
            uigenId: 'get_templates',
            method: 'GET',
            path: '/templates',
            summary: 'List templates',
            parameters: [],
            responses: {},
            viewHint: 'list'
          },
          {
            id: 'create_template',
            uigenId: 'create_template',
            method: 'POST',
            path: '/templates',
            summary: 'Create template',
            parameters: [],
            responses: {},
            viewHint: 'create'
          }
        ],
        schema: {
          type: 'object',
          key: 'templates',
          label: 'Templates',
          required: false
        },
        relationships: []
      };

      const allResources = new Map<string, Resource>([
        ['meetings', meetingsResource],
        ['templates', templatesResource]
      ]);

      const detector = new RelationshipDetector();
      const relationships = detector.detectManyToMany(meetingsResource, allResources);

      expect(relationships).toHaveLength(1);
      expect(relationships[0]).toEqual({
        target: 'templates',
        type: 'manyToMany',
        path: '/meetings/{id}/templates',
        isReadOnly: false
      });
    });

    /**
     * **Validates: Requirements 1.2, 1.3, 1.4, 1.5, 6.3**
     */
    it('should mark relationship as read-only when only GET operation exists', () => {
      const meetingsResource: Resource = {
        name: 'Meetings',
        slug: 'meetings',
        uigenId: 'meetings',
        operations: [
          {
            id: 'get_meeting_templates',
            uigenId: 'get_meeting_templates',
            method: 'GET',
            path: '/meetings/{id}/templates',
            summary: 'List meeting templates',
            parameters: [],
            responses: {},
            viewHint: 'list'
          }
        ],
        schema: {
          type: 'object',
          key: 'meetings',
          label: 'Meetings',
          required: false
        },
        relationships: []
      };

      const templatesResource: Resource = {
        name: 'Templates',
        slug: 'templates',
        uigenId: 'templates',
        operations: [
          {
            id: 'get_templates',
            uigenId: 'get_templates',
            method: 'GET',
            path: '/templates',
            summary: 'List templates',
            parameters: [],
            responses: {},
            viewHint: 'list'
          },
          {
            id: 'create_template',
            uigenId: 'create_template',
            method: 'POST',
            path: '/templates',
            summary: 'Create template',
            parameters: [],
            responses: {},
            viewHint: 'create'
          }
        ],
        schema: {
          type: 'object',
          key: 'templates',
          label: 'Templates',
          required: false
        },
        relationships: []
      };

      const allResources = new Map<string, Resource>([
        ['meetings', meetingsResource],
        ['templates', templatesResource]
      ]);

      const detector = new RelationshipDetector();
      const relationships = detector.detectManyToMany(meetingsResource, allResources);

      expect(relationships).toHaveLength(1);
      expect(relationships[0].isReadOnly).toBe(true);
    });

    /**
     * **Validates: Requirements 1.2, 1.3, 1.4, 1.5**
     */
    it('should detect manyToMany with DELETE operation', () => {
      const meetingsResource: Resource = {
        name: 'Meetings',
        slug: 'meetings',
        uigenId: 'meetings',
        operations: [
          {
            id: 'get_meeting_templates',
            uigenId: 'get_meeting_templates',
            method: 'GET',
            path: '/meetings/{id}/templates',
            summary: 'List meeting templates',
            parameters: [],
            responses: {},
            viewHint: 'list'
          },
          {
            id: 'remove_meeting_template',
            uigenId: 'remove_meeting_template',
            method: 'DELETE',
            path: '/meetings/{id}/templates',
            summary: 'Remove template from meeting',
            parameters: [],
            responses: {},
            viewHint: 'delete'
          }
        ],
        schema: {
          type: 'object',
          key: 'meetings',
          label: 'Meetings',
          required: false
        },
        relationships: []
      };

      const templatesResource: Resource = {
        name: 'Templates',
        slug: 'templates',
        uigenId: 'templates',
        operations: [
          {
            id: 'get_templates',
            uigenId: 'get_templates',
            method: 'GET',
            path: '/templates',
            summary: 'List templates',
            parameters: [],
            responses: {},
            viewHint: 'list'
          },
          {
            id: 'create_template',
            uigenId: 'create_template',
            method: 'POST',
            path: '/templates',
            summary: 'Create template',
            parameters: [],
            responses: {},
            viewHint: 'create'
          }
        ],
        schema: {
          type: 'object',
          key: 'templates',
          label: 'Templates',
          required: false
        },
        relationships: []
      };

      const allResources = new Map<string, Resource>([
        ['meetings', meetingsResource],
        ['templates', templatesResource]
      ]);

      const detector = new RelationshipDetector();
      const relationships = detector.detectManyToMany(meetingsResource, allResources);

      expect(relationships).toHaveLength(1);
      expect(relationships[0].isReadOnly).toBe(false);
    });

    /**
     * **Validates: Requirements 1.2, 1.3**
     */
    it('should not detect manyToMany when target resource does not exist', () => {
      const meetingsResource: Resource = {
        name: 'Meetings',
        slug: 'meetings',
        uigenId: 'meetings',
        operations: [
          {
            id: 'get_meeting_templates',
            uigenId: 'get_meeting_templates',
            method: 'GET',
            path: '/meetings/{id}/templates',
            summary: 'List meeting templates',
            parameters: [],
            responses: {},
            viewHint: 'list'
          },
          {
            id: 'add_meeting_template',
            uigenId: 'add_meeting_template',
            method: 'POST',
            path: '/meetings/{id}/templates',
            summary: 'Add template to meeting',
            parameters: [],
            responses: {},
            viewHint: 'create'
          }
        ],
        schema: {
          type: 'object',
          key: 'meetings',
          label: 'Meetings',
          required: false
        },
        relationships: []
      };

      const allResources = new Map<string, Resource>([
        ['meetings', meetingsResource]
        // templates resource not included
      ]);

      const detector = new RelationshipDetector();
      const relationships = detector.detectManyToMany(meetingsResource, allResources);

      expect(relationships).toHaveLength(0);
    });

    /**
     * **Validates: Requirements 1.2, 1.3, 1.4**
     */
    it('should not detect manyToMany when target lacks standalone collection endpoint', () => {
      const meetingsResource: Resource = {
        name: 'Meetings',
        slug: 'meetings',
        uigenId: 'meetings',
        operations: [
          {
            id: 'get_meeting_templates',
            uigenId: 'get_meeting_templates',
            method: 'GET',
            path: '/meetings/{id}/templates',
            summary: 'List meeting templates',
            parameters: [],
            responses: {},
            viewHint: 'list'
          },
          {
            id: 'add_meeting_template',
            uigenId: 'add_meeting_template',
            method: 'POST',
            path: '/meetings/{id}/templates',
            summary: 'Add template to meeting',
            parameters: [],
            responses: {},
            viewHint: 'create'
          }
        ],
        schema: {
          type: 'object',
          key: 'meetings',
          label: 'Meetings',
          required: false
        },
        relationships: []
      };

      const templatesResource: Resource = {
        name: 'Templates',
        slug: 'templates',
        uigenId: 'templates',
        operations: [
          // Missing GET /templates
          {
            id: 'create_template',
            uigenId: 'create_template',
            method: 'POST',
            path: '/templates',
            summary: 'Create template',
            parameters: [],
            responses: {},
            viewHint: 'create'
          }
        ],
        schema: {
          type: 'object',
          key: 'templates',
          label: 'Templates',
          required: false
        },
        relationships: []
      };

      const allResources = new Map<string, Resource>([
        ['meetings', meetingsResource],
        ['templates', templatesResource]
      ]);

      const detector = new RelationshipDetector();
      const relationships = detector.detectManyToMany(meetingsResource, allResources);

      expect(relationships).toHaveLength(0);
    });

    /**
     * **Validates: Requirements 1.2, 1.3, 1.4**
     */
    it('should not detect manyToMany when target lacks standalone creation endpoint', () => {
      const meetingsResource: Resource = {
        name: 'Meetings',
        slug: 'meetings',
        uigenId: 'meetings',
        operations: [
          {
            id: 'get_meeting_templates',
            uigenId: 'get_meeting_templates',
            method: 'GET',
            path: '/meetings/{id}/templates',
            summary: 'List meeting templates',
            parameters: [],
            responses: {},
            viewHint: 'list'
          },
          {
            id: 'add_meeting_template',
            uigenId: 'add_meeting_template',
            method: 'POST',
            path: '/meetings/{id}/templates',
            summary: 'Add template to meeting',
            parameters: [],
            responses: {},
            viewHint: 'create'
          }
        ],
        schema: {
          type: 'object',
          key: 'meetings',
          label: 'Meetings',
          required: false
        },
        relationships: []
      };

      const templatesResource: Resource = {
        name: 'Templates',
        slug: 'templates',
        uigenId: 'templates',
        operations: [
          {
            id: 'get_templates',
            uigenId: 'get_templates',
            method: 'GET',
            path: '/templates',
            summary: 'List templates',
            parameters: [],
            responses: {},
            viewHint: 'list'
          }
          // Missing POST /templates
        ],
        schema: {
          type: 'object',
          key: 'templates',
          label: 'Templates',
          required: false
        },
        relationships: []
      };

      const allResources = new Map<string, Resource>([
        ['meetings', meetingsResource],
        ['templates', templatesResource]
      ]);

      const detector = new RelationshipDetector();
      const relationships = detector.detectManyToMany(meetingsResource, allResources);

      expect(relationships).toHaveLength(0);
    });

    /**
     * **Validates: Requirements 1.2, 1.5**
     */
    it('should not detect manyToMany when association endpoint lacks GET operation', () => {
      const meetingsResource: Resource = {
        name: 'Meetings',
        slug: 'meetings',
        uigenId: 'meetings',
        operations: [
          // Missing GET operation
          {
            id: 'add_meeting_template',
            uigenId: 'add_meeting_template',
            method: 'POST',
            path: '/meetings/{id}/templates',
            summary: 'Add template to meeting',
            parameters: [],
            responses: {},
            viewHint: 'create'
          }
        ],
        schema: {
          type: 'object',
          key: 'meetings',
          label: 'Meetings',
          required: false
        },
        relationships: []
      };

      const templatesResource: Resource = {
        name: 'Templates',
        slug: 'templates',
        uigenId: 'templates',
        operations: [
          {
            id: 'get_templates',
            uigenId: 'get_templates',
            method: 'GET',
            path: '/templates',
            summary: 'List templates',
            parameters: [],
            responses: {},
            viewHint: 'list'
          },
          {
            id: 'create_template',
            uigenId: 'create_template',
            method: 'POST',
            path: '/templates',
            summary: 'Create template',
            parameters: [],
            responses: {},
            viewHint: 'create'
          }
        ],
        schema: {
          type: 'object',
          key: 'templates',
          label: 'Templates',
          required: false
        },
        relationships: []
      };

      const allResources = new Map<string, Resource>([
        ['meetings', meetingsResource],
        ['templates', templatesResource]
      ]);

      const detector = new RelationshipDetector();
      const relationships = detector.detectManyToMany(meetingsResource, allResources);

      expect(relationships).toHaveLength(0);
    });

    /**
     * **Validates: Requirements 1.2, 1.3, 1.4, 1.5**
     */
    it('should detect multiple manyToMany relationships', () => {
      const meetingsResource: Resource = {
        name: 'Meetings',
        slug: 'meetings',
        uigenId: 'meetings',
        operations: [
          {
            id: 'get_meeting_templates',
            uigenId: 'get_meeting_templates',
            method: 'GET',
            path: '/meetings/{id}/templates',
            summary: 'List meeting templates',
            parameters: [],
            responses: {},
            viewHint: 'list'
          },
          {
            id: 'add_meeting_template',
            uigenId: 'add_meeting_template',
            method: 'POST',
            path: '/meetings/{id}/templates',
            summary: 'Add template to meeting',
            parameters: [],
            responses: {},
            viewHint: 'create'
          },
          {
            id: 'get_meeting_tags',
            uigenId: 'get_meeting_tags',
            method: 'GET',
            path: '/meetings/{id}/tags',
            summary: 'List meeting tags',
            parameters: [],
            responses: {},
            viewHint: 'list'
          },
          {
            id: 'add_meeting_tag',
            uigenId: 'add_meeting_tag',
            method: 'POST',
            path: '/meetings/{id}/tags',
            summary: 'Add tag to meeting',
            parameters: [],
            responses: {},
            viewHint: 'create'
          }
        ],
        schema: {
          type: 'object',
          key: 'meetings',
          label: 'Meetings',
          required: false
        },
        relationships: []
      };

      const templatesResource: Resource = {
        name: 'Templates',
        slug: 'templates',
        uigenId: 'templates',
        operations: [
          {
            id: 'get_templates',
            uigenId: 'get_templates',
            method: 'GET',
            path: '/templates',
            summary: 'List templates',
            parameters: [],
            responses: {},
            viewHint: 'list'
          },
          {
            id: 'create_template',
            uigenId: 'create_template',
            method: 'POST',
            path: '/templates',
            summary: 'Create template',
            parameters: [],
            responses: {},
            viewHint: 'create'
          }
        ],
        schema: {
          type: 'object',
          key: 'templates',
          label: 'Templates',
          required: false
        },
        relationships: []
      };

      const tagsResource: Resource = {
        name: 'Tags',
        slug: 'tags',
        uigenId: 'tags',
        operations: [
          {
            id: 'get_tags',
            uigenId: 'get_tags',
            method: 'GET',
            path: '/tags',
            summary: 'List tags',
            parameters: [],
            responses: {},
            viewHint: 'list'
          },
          {
            id: 'create_tag',
            uigenId: 'create_tag',
            method: 'POST',
            path: '/tags',
            summary: 'Create tag',
            parameters: [],
            responses: {},
            viewHint: 'create'
          }
        ],
        schema: {
          type: 'object',
          key: 'tags',
          label: 'Tags',
          required: false
        },
        relationships: []
      };

      const allResources = new Map<string, Resource>([
        ['meetings', meetingsResource],
        ['templates', templatesResource],
        ['tags', tagsResource]
      ]);

      const detector = new RelationshipDetector();
      const relationships = detector.detectManyToMany(meetingsResource, allResources);

      expect(relationships).toHaveLength(2);
      expect(relationships.map(r => r.target).sort()).toEqual(['tags', 'templates']);
      relationships.forEach(rel => {
        expect(rel.type).toBe('manyToMany');
        expect(rel.isReadOnly).toBe(false);
      });
    });

    /**
     * **Validates: Requirements 1.2, 1.3, 1.4, 1.5**
     */
    it('should not create duplicate manyToMany relationships', () => {
      const meetingsResource: Resource = {
        name: 'Meetings',
        slug: 'meetings',
        uigenId: 'meetings',
        operations: [
          {
            id: 'get_meeting_templates',
            uigenId: 'get_meeting_templates',
            method: 'GET',
            path: '/meetings/{id}/templates',
            summary: 'List meeting templates',
            parameters: [],
            responses: {},
            viewHint: 'list'
          },
          {
            id: 'add_meeting_template',
            uigenId: 'add_meeting_template',
            method: 'POST',
            path: '/meetings/{id}/templates',
            summary: 'Add template to meeting',
            parameters: [],
            responses: {},
            viewHint: 'create'
          },
          {
            id: 'remove_meeting_template',
            uigenId: 'remove_meeting_template',
            method: 'DELETE',
            path: '/meetings/{id}/templates',
            summary: 'Remove template from meeting',
            parameters: [],
            responses: {},
            viewHint: 'delete'
          }
        ],
        schema: {
          type: 'object',
          key: 'meetings',
          label: 'Meetings',
          required: false
        },
        relationships: []
      };

      const templatesResource: Resource = {
        name: 'Templates',
        slug: 'templates',
        uigenId: 'templates',
        operations: [
          {
            id: 'get_templates',
            uigenId: 'get_templates',
            method: 'GET',
            path: '/templates',
            summary: 'List templates',
            parameters: [],
            responses: {},
            viewHint: 'list'
          },
          {
            id: 'create_template',
            uigenId: 'create_template',
            method: 'POST',
            path: '/templates',
            summary: 'Create template',
            parameters: [],
            responses: {},
            viewHint: 'create'
          }
        ],
        schema: {
          type: 'object',
          key: 'templates',
          label: 'Templates',
          required: false
        },
        relationships: []
      };

      const allResources = new Map<string, Resource>([
        ['meetings', meetingsResource],
        ['templates', templatesResource]
      ]);

      const detector = new RelationshipDetector();
      const relationships = detector.detectManyToMany(meetingsResource, allResources);

      expect(relationships).toHaveLength(1);
    });

    /**
     * **Validates: Requirements 1.2**
     */
    it('should handle resource slugs with special characters', () => {
      const resource: Resource = {
        name: 'API Meetings',
        slug: 'api-meetings',
        uigenId: 'api-meetings',
        operations: [
          {
            id: 'get_api_meeting_templates',
            uigenId: 'get_api_meeting_templates',
            method: 'GET',
            path: '/api-meetings/{id}/templates',
            summary: 'List templates',
            parameters: [],
            responses: {},
            viewHint: 'list'
          },
          {
            id: 'add_api_meeting_template',
            uigenId: 'add_api_meeting_template',
            method: 'POST',
            path: '/api-meetings/{id}/templates',
            summary: 'Add template',
            parameters: [],
            responses: {},
            viewHint: 'create'
          }
        ],
        schema: {
          type: 'object',
          key: 'api-meetings',
          label: 'API Meetings',
          required: false
        },
        relationships: []
      };

      const templatesResource: Resource = {
        name: 'Templates',
        slug: 'templates',
        uigenId: 'templates',
        operations: [
          {
            id: 'get_templates',
            uigenId: 'get_templates',
            method: 'GET',
            path: '/templates',
            summary: 'List templates',
            parameters: [],
            responses: {},
            viewHint: 'list'
          },
          {
            id: 'create_template',
            uigenId: 'create_template',
            method: 'POST',
            path: '/templates',
            summary: 'Create template',
            parameters: [],
            responses: {},
            viewHint: 'create'
          }
        ],
        schema: {
          type: 'object',
          key: 'templates',
          label: 'Templates',
          required: false
        },
        relationships: []
      };

      const allResources = new Map<string, Resource>([
        ['api-meetings', resource],
        ['templates', templatesResource]
      ]);

      const detector = new RelationshipDetector();
      const relationships = detector.detectManyToMany(resource, allResources);

      expect(relationships).toHaveLength(1);
      expect(relationships[0].target).toBe('templates');
    });

    /**
     * **Validates: Requirements 1.2**
     */
    it('should return empty array when no manyToMany relationships exist', () => {
      const meetingsResource: Resource = {
        name: 'Meetings',
        slug: 'meetings',
        uigenId: 'meetings',
        operations: [
          {
            id: 'get_meetings',
            uigenId: 'get_meetings',
            method: 'GET',
            path: '/meetings',
            summary: 'List meetings',
            parameters: [],
            responses: {},
            viewHint: 'list'
          },
          {
            id: 'get_meeting',
            uigenId: 'get_meeting',
            method: 'GET',
            path: '/meetings/{id}',
            summary: 'Get meeting',
            parameters: [],
            responses: {},
            viewHint: 'detail'
          }
        ],
        schema: {
          type: 'object',
          key: 'meetings',
          label: 'Meetings',
          required: false
        },
        relationships: []
      };

      const allResources = new Map<string, Resource>([
        ['meetings', meetingsResource]
      ]);

      const detector = new RelationshipDetector();
      const relationships = detector.detectManyToMany(meetingsResource, allResources);

      expect(relationships).toHaveLength(0);
    });

    /**
     * **Validates: Requirements 6.1, 6.4**
     * 
     * Test ambiguous paths with multiple parameter segments.
     * The detector should use the final two segments for detection.
     * Pattern: /a/{id}/b/{id}/c should detect relationship between b and c
     */
    it('should handle ambiguous paths by using final two segments', () => {
      const organizationsResource: Resource = {
        name: 'Organizations',
        slug: 'organizations',
        uigenId: 'organizations',
        operations: [
          {
            id: 'get_org_meeting_templates',
            uigenId: 'get_org_meeting_templates',
            method: 'GET',
            path: '/organizations/{orgId}/meetings/{meetingId}/templates',
            summary: 'List templates for a meeting in an organization',
            parameters: [],
            responses: {},
            viewHint: 'list'
          },
          {
            id: 'add_org_meeting_template',
            uigenId: 'add_org_meeting_template',
            method: 'POST',
            path: '/organizations/{orgId}/meetings/{meetingId}/templates',
            summary: 'Add template to meeting',
            parameters: [],
            responses: {},
            viewHint: 'create'
          }
        ],
        schema: {
          type: 'object',
          key: 'organizations',
          label: 'Organizations',
          required: false
        },
        relationships: []
      };

      const meetingsResource: Resource = {
        name: 'Meetings',
        slug: 'meetings',
        uigenId: 'meetings',
        operations: [
          {
            id: 'get_meeting_templates',
            uigenId: 'get_meeting_templates',
            method: 'GET',
            path: '/meetings/{id}/templates',
            summary: 'List meeting templates',
            parameters: [],
            responses: {},
            viewHint: 'list'
          },
          {
            id: 'add_meeting_template',
            uigenId: 'add_meeting_template',
            method: 'POST',
            path: '/meetings/{id}/templates',
            summary: 'Add template to meeting',
            parameters: [],
            responses: {},
            viewHint: 'create'
          }
        ],
        schema: {
          type: 'object',
          key: 'meetings',
          label: 'Meetings',
          required: false
        },
        relationships: []
      };

      const templatesResource: Resource = {
        name: 'Templates',
        slug: 'templates',
        uigenId: 'templates',
        operations: [
          {
            id: 'get_templates',
            uigenId: 'get_templates',
            method: 'GET',
            path: '/templates',
            summary: 'List templates',
            parameters: [],
            responses: {},
            viewHint: 'list'
          },
          {
            id: 'create_template',
            uigenId: 'create_template',
            method: 'POST',
            path: '/templates',
            summary: 'Create template',
            parameters: [],
            responses: {},
            viewHint: 'create'
          }
        ],
        schema: {
          type: 'object',
          key: 'templates',
          label: 'Templates',
          required: false
        },
        relationships: []
      };

      const allResources = new Map<string, Resource>([
        ['organizations', organizationsResource],
        ['meetings', meetingsResource],
        ['templates', templatesResource]
      ]);

      const detector = new RelationshipDetector();
      
      // Test that organizations resource does NOT detect a relationship
      // because the path doesn't match /organizations/{id}/something
      const orgRelationships = detector.detectManyToMany(organizationsResource, allResources);
      expect(orgRelationships).toHaveLength(0);

      // Test that meetings resource correctly detects templates relationship
      const meetingRelationships = detector.detectManyToMany(meetingsResource, allResources);
      expect(meetingRelationships).toHaveLength(1);
      expect(meetingRelationships[0]).toEqual({
        target: 'templates',
        type: 'manyToMany',
        path: '/meetings/{id}/templates',
        isReadOnly: false
      });
    });

    /**
     * **Validates: Requirements 6.2, 6.5**
     * 
     * Test slug normalization with singular vs plural variations.
     * The detector should match "template" with "templates" and vice versa.
     */
    it('should detect manyToMany with singular/plural slug variations', () => {
      const meetingsResource: Resource = {
        name: 'Meetings',
        slug: 'meetings',
        uigenId: 'meetings',
        operations: [
          {
            id: 'get_meeting_template',
            uigenId: 'get_meeting_template',
            method: 'GET',
            path: '/meetings/{id}/template',
            summary: 'List meeting templates',
            parameters: [],
            responses: {},
            viewHint: 'list'
          },
          {
            id: 'add_meeting_template',
            uigenId: 'add_meeting_template',
            method: 'POST',
            path: '/meetings/{id}/template',
            summary: 'Add template to meeting',
            parameters: [],
            responses: {},
            viewHint: 'create'
          }
        ],
        schema: {
          type: 'object',
          key: 'meetings',
          label: 'Meetings',
          required: false
        },
        relationships: []
      };

      const templatesResource: Resource = {
        name: 'Templates',
        slug: 'templates',
        uigenId: 'templates',
        operations: [
          {
            id: 'get_templates',
            uigenId: 'get_templates',
            method: 'GET',
            path: '/templates',
            summary: 'List templates',
            parameters: [],
            responses: {},
            viewHint: 'list'
          },
          {
            id: 'create_template',
            uigenId: 'create_template',
            method: 'POST',
            path: '/templates',
            summary: 'Create template',
            parameters: [],
            responses: {},
            viewHint: 'create'
          }
        ],
        schema: {
          type: 'object',
          key: 'templates',
          label: 'Templates',
          required: false
        },
        relationships: []
      };

      const allResources = new Map<string, Resource>([
        ['meetings', meetingsResource],
        ['templates', templatesResource]
      ]);

      const detector = new RelationshipDetector();
      const relationships = detector.detectManyToMany(meetingsResource, allResources);

      // Should detect relationship even though path uses "template" (singular)
      // and resource slug is "templates" (plural)
      expect(relationships).toHaveLength(1);
      expect(relationships[0]).toEqual({
        target: 'templates',
        type: 'manyToMany',
        path: '/meetings/{id}/template',
        isReadOnly: false
      });
    });
  });

  describe('markLibraryResources', () => {
    /**
     * **Validates: Requirements 2.1, 2.2, 2.3, 2.5**
     */
    it('should mark target resource as library when it is target of manyToMany relationship', () => {
      const meetingsResource: Resource = {
        name: 'Meetings',
        slug: 'meetings',
        uigenId: 'meetings',
        operations: [],
        schema: {
          type: 'object',
          key: 'meetings',
          label: 'Meetings',
          required: false
        },
        relationships: []
      };

      const templatesResource: Resource = {
        name: 'Templates',
        slug: 'templates',
        uigenId: 'templates',
        operations: [
          {
            id: 'get_templates',
            uigenId: 'get_templates',
            method: 'GET',
            path: '/templates',
            summary: 'List templates',
            parameters: [],
            responses: {},
            viewHint: 'list'
          },
          {
            id: 'create_template',
            uigenId: 'create_template',
            method: 'POST',
            path: '/templates',
            summary: 'Create template',
            parameters: [],
            responses: {},
            viewHint: 'create'
          }
        ],
        schema: {
          type: 'object',
          key: 'templates',
          label: 'Templates',
          required: false
        },
        relationships: []
      };

      const allResources = new Map<string, Resource>([
        ['meetings', meetingsResource],
        ['templates', templatesResource]
      ]);

      const relationships: Relationship[] = [
        {
          target: 'templates',
          type: 'manyToMany',
          path: '/meetings/{id}/templates',
          isReadOnly: false
        }
      ];

      const detector = new RelationshipDetector();
      detector.markLibraryResources(allResources, relationships);

      expect(templatesResource.isLibrary).toBe(true);
      expect(meetingsResource.isLibrary).toBeUndefined();
    });

    /**
     * **Validates: Requirements 2.1, 2.2, 2.3, 2.5**
     */
    it('should mark multiple resources as libraries when they are targets of manyToMany relationships', () => {
      const meetingsResource: Resource = {
        name: 'Meetings',
        slug: 'meetings',
        uigenId: 'meetings',
        operations: [],
        schema: {
          type: 'object',
          key: 'meetings',
          label: 'Meetings',
          required: false
        },
        relationships: []
      };

      const templatesResource: Resource = {
        name: 'Templates',
        slug: 'templates',
        uigenId: 'templates',
        operations: [
          {
            id: 'get_templates',
            uigenId: 'get_templates',
            method: 'GET',
            path: '/templates',
            summary: 'List templates',
            parameters: [],
            responses: {},
            viewHint: 'list'
          },
          {
            id: 'create_template',
            uigenId: 'create_template',
            method: 'POST',
            path: '/templates',
            summary: 'Create template',
            parameters: [],
            responses: {},
            viewHint: 'create'
          }
        ],
        schema: {
          type: 'object',
          key: 'templates',
          label: 'Templates',
          required: false
        },
        relationships: []
      };

      const tagsResource: Resource = {
        name: 'Tags',
        slug: 'tags',
        uigenId: 'tags',
        operations: [
          {
            id: 'get_tags',
            uigenId: 'get_tags',
            method: 'GET',
            path: '/tags',
            summary: 'List tags',
            parameters: [],
            responses: {},
            viewHint: 'list'
          },
          {
            id: 'create_tag',
            uigenId: 'create_tag',
            method: 'POST',
            path: '/tags',
            summary: 'Create tag',
            parameters: [],
            responses: {},
            viewHint: 'create'
          }
        ],
        schema: {
          type: 'object',
          key: 'tags',
          label: 'Tags',
          required: false
        },
        relationships: []
      };

      const allResources = new Map<string, Resource>([
        ['meetings', meetingsResource],
        ['templates', templatesResource],
        ['tags', tagsResource]
      ]);

      const relationships: Relationship[] = [
        {
          target: 'templates',
          type: 'manyToMany',
          path: '/meetings/{id}/templates',
          isReadOnly: false
        },
        {
          target: 'tags',
          type: 'manyToMany',
          path: '/meetings/{id}/tags',
          isReadOnly: false
        }
      ];

      const detector = new RelationshipDetector();
      detector.markLibraryResources(allResources, relationships);

      expect(templatesResource.isLibrary).toBe(true);
      expect(tagsResource.isLibrary).toBe(true);
      expect(meetingsResource.isLibrary).toBeUndefined();
    });

    /**
     * **Validates: Requirements 2.1, 2.2, 2.3, 2.5**
     */
    it('should not mark resource as library if it lacks standalone collection endpoint', () => {
      const meetingsResource: Resource = {
        name: 'Meetings',
        slug: 'meetings',
        uigenId: 'meetings',
        operations: [],
        schema: {
          type: 'object',
          key: 'meetings',
          label: 'Meetings',
          required: false
        },
        relationships: []
      };

      const templatesResource: Resource = {
        name: 'Templates',
        slug: 'templates',
        uigenId: 'templates',
        operations: [
          // Missing GET /templates
          {
            id: 'create_template',
            uigenId: 'create_template',
            method: 'POST',
            path: '/templates',
            summary: 'Create template',
            parameters: [],
            responses: {},
            viewHint: 'create'
          }
        ],
        schema: {
          type: 'object',
          key: 'templates',
          label: 'Templates',
          required: false
        },
        relationships: []
      };

      const allResources = new Map<string, Resource>([
        ['meetings', meetingsResource],
        ['templates', templatesResource]
      ]);

      const relationships: Relationship[] = [
        {
          target: 'templates',
          type: 'manyToMany',
          path: '/meetings/{id}/templates',
          isReadOnly: false
        }
      ];

      const detector = new RelationshipDetector();
      detector.markLibraryResources(allResources, relationships);

      expect(templatesResource.isLibrary).toBeUndefined();
    });

    /**
     * **Validates: Requirements 2.1, 2.2, 2.3, 2.5**
     */
    it('should not mark resource as library if it lacks standalone creation endpoint', () => {
      const meetingsResource: Resource = {
        name: 'Meetings',
        slug: 'meetings',
        uigenId: 'meetings',
        operations: [],
        schema: {
          type: 'object',
          key: 'meetings',
          label: 'Meetings',
          required: false
        },
        relationships: []
      };

      const templatesResource: Resource = {
        name: 'Templates',
        slug: 'templates',
        uigenId: 'templates',
        operations: [
          {
            id: 'get_templates',
            uigenId: 'get_templates',
            method: 'GET',
            path: '/templates',
            summary: 'List templates',
            parameters: [],
            responses: {},
            viewHint: 'list'
          }
          // Missing POST /templates
        ],
        schema: {
          type: 'object',
          key: 'templates',
          label: 'Templates',
          required: false
        },
        relationships: []
      };

      const allResources = new Map<string, Resource>([
        ['meetings', meetingsResource],
        ['templates', templatesResource]
      ]);

      const relationships: Relationship[] = [
        {
          target: 'templates',
          type: 'manyToMany',
          path: '/meetings/{id}/templates',
          isReadOnly: false
        }
      ];

      const detector = new RelationshipDetector();
      detector.markLibraryResources(allResources, relationships);

      expect(templatesResource.isLibrary).toBeUndefined();
    });

    /**
     * **Validates: Requirements 2.1, 2.3**
     */
    it('should mark resource as library when referenced by multiple manyToMany relationships', () => {
      const meetingsResource: Resource = {
        name: 'Meetings',
        slug: 'meetings',
        uigenId: 'meetings',
        operations: [],
        schema: {
          type: 'object',
          key: 'meetings',
          label: 'Meetings',
          required: false
        },
        relationships: []
      };

      const ordersResource: Resource = {
        name: 'Orders',
        slug: 'orders',
        uigenId: 'orders',
        operations: [],
        schema: {
          type: 'object',
          key: 'orders',
          label: 'Orders',
          required: false
        },
        relationships: []
      };

      const templatesResource: Resource = {
        name: 'Templates',
        slug: 'templates',
        uigenId: 'templates',
        operations: [
          {
            id: 'get_templates',
            uigenId: 'get_templates',
            method: 'GET',
            path: '/templates',
            summary: 'List templates',
            parameters: [],
            responses: {},
            viewHint: 'list'
          },
          {
            id: 'create_template',
            uigenId: 'create_template',
            method: 'POST',
            path: '/templates',
            summary: 'Create template',
            parameters: [],
            responses: {},
            viewHint: 'create'
          }
        ],
        schema: {
          type: 'object',
          key: 'templates',
          label: 'Templates',
          required: false
        },
        relationships: []
      };

      const allResources = new Map<string, Resource>([
        ['meetings', meetingsResource],
        ['orders', ordersResource],
        ['templates', templatesResource]
      ]);

      const relationships: Relationship[] = [
        {
          target: 'templates',
          type: 'manyToMany',
          path: '/meetings/{id}/templates',
          isReadOnly: false
        },
        {
          target: 'templates',
          type: 'manyToMany',
          path: '/orders/{id}/templates',
          isReadOnly: false
        }
      ];

      const detector = new RelationshipDetector();
      detector.markLibraryResources(allResources, relationships);

      expect(templatesResource.isLibrary).toBe(true);
    });

    /**
     * **Validates: Requirements 2.1, 2.2**
     */
    it('should not mark resources as libraries when no manyToMany relationships exist', () => {
      const meetingsResource: Resource = {
        name: 'Meetings',
        slug: 'meetings',
        uigenId: 'meetings',
        operations: [],
        schema: {
          type: 'object',
          key: 'meetings',
          label: 'Meetings',
          required: false
        },
        relationships: []
      };

      const templatesResource: Resource = {
        name: 'Templates',
        slug: 'templates',
        uigenId: 'templates',
        operations: [
          {
            id: 'get_templates',
            uigenId: 'get_templates',
            method: 'GET',
            path: '/templates',
            summary: 'List templates',
            parameters: [],
            responses: {},
            viewHint: 'list'
          },
          {
            id: 'create_template',
            uigenId: 'create_template',
            method: 'POST',
            path: '/templates',
            summary: 'Create template',
            parameters: [],
            responses: {},
            viewHint: 'create'
          }
        ],
        schema: {
          type: 'object',
          key: 'templates',
          label: 'Templates',
          required: false
        },
        relationships: []
      };

      const allResources = new Map<string, Resource>([
        ['meetings', meetingsResource],
        ['templates', templatesResource]
      ]);

      const relationships: Relationship[] = [
        {
          target: 'templates',
          type: 'hasMany',
          path: '/meetings/{id}/templates'
        }
      ];

      const detector = new RelationshipDetector();
      detector.markLibraryResources(allResources, relationships);

      expect(templatesResource.isLibrary).toBeUndefined();
      expect(meetingsResource.isLibrary).toBeUndefined();
    });

    /**
     * **Validates: Requirements 2.1, 2.2**
     */
    it('should handle empty relationships array', () => {
      const templatesResource: Resource = {
        name: 'Templates',
        slug: 'templates',
        uigenId: 'templates',
        operations: [
          {
            id: 'get_templates',
            uigenId: 'get_templates',
            method: 'GET',
            path: '/templates',
            summary: 'List templates',
            parameters: [],
            responses: {},
            viewHint: 'list'
          },
          {
            id: 'create_template',
            uigenId: 'create_template',
            method: 'POST',
            path: '/templates',
            summary: 'Create template',
            parameters: [],
            responses: {},
            viewHint: 'create'
          }
        ],
        schema: {
          type: 'object',
          key: 'templates',
          label: 'Templates',
          required: false
        },
        relationships: []
      };

      const allResources = new Map<string, Resource>([
        ['templates', templatesResource]
      ]);

      const relationships: Relationship[] = [];

      const detector = new RelationshipDetector();
      detector.markLibraryResources(allResources, relationships);

      expect(templatesResource.isLibrary).toBeUndefined();
    });

    /**
     * **Validates: Requirements 2.1, 2.2**
     */
    it('should handle non-existent target resource gracefully', () => {
      const meetingsResource: Resource = {
        name: 'Meetings',
        slug: 'meetings',
        uigenId: 'meetings',
        operations: [],
        schema: {
          type: 'object',
          key: 'meetings',
          label: 'Meetings',
          required: false
        },
        relationships: []
      };

      const allResources = new Map<string, Resource>([
        ['meetings', meetingsResource]
      ]);

      const relationships: Relationship[] = [
        {
          target: 'templates', // templates resource doesn't exist
          type: 'manyToMany',
          path: '/meetings/{id}/templates',
          isReadOnly: false
        }
      ];

      const detector = new RelationshipDetector();
      
      // Should not throw an error
      expect(() => {
        detector.markLibraryResources(allResources, relationships);
      }).not.toThrow();
    });
  });

  describe('normalizeSlug', () => {
    /**
     * **Validates: Requirements 6.2**
     */
    it('should convert plural slugs to singular by removing trailing s', () => {
      const detector = new RelationshipDetector();
      
      expect(detector.normalizeSlug('users')).toBe('user');
      expect(detector.normalizeSlug('templates')).toBe('template');
      expect(detector.normalizeSlug('tags')).toBe('tag');
      expect(detector.normalizeSlug('products')).toBe('product');
      expect(detector.normalizeSlug('meetings')).toBe('meeting');
    });

    /**
     * **Validates: Requirements 6.2**
     */
    it('should handle singular slugs without modification', () => {
      const detector = new RelationshipDetector();
      
      expect(detector.normalizeSlug('user')).toBe('user');
      expect(detector.normalizeSlug('template')).toBe('template');
      expect(detector.normalizeSlug('tag')).toBe('tag');
      expect(detector.normalizeSlug('product')).toBe('product');
    });

    /**
     * **Validates: Requirements 6.2**
     */
    it('should convert slugs to lowercase', () => {
      const detector = new RelationshipDetector();
      
      expect(detector.normalizeSlug('Users')).toBe('user');
      expect(detector.normalizeSlug('TEMPLATES')).toBe('template');
      expect(detector.normalizeSlug('Tags')).toBe('tag');
      expect(detector.normalizeSlug('MixedCase')).toBe('mixedcase');
    });

    /**
     * **Validates: Requirements 6.2**
     */
    it('should handle irregular plurals ending in s', () => {
      const detector = new RelationshipDetector();
      
      // Note: This is a simple implementation that removes trailing 's'
      // Irregular plurals like "categories" become "categorie"
      expect(detector.normalizeSlug('categories')).toBe('categorie');
      expect(detector.normalizeSlug('entries')).toBe('entrie');
      expect(detector.normalizeSlug('stories')).toBe('storie');
    });

    /**
     * **Validates: Requirements 6.2**
     */
    it('should handle slugs with hyphens and underscores', () => {
      const detector = new RelationshipDetector();
      
      expect(detector.normalizeSlug('api-users')).toBe('api-user');
      expect(detector.normalizeSlug('user_profiles')).toBe('user_profile');
      expect(detector.normalizeSlug('meeting-templates')).toBe('meeting-template');
    });

    /**
     * **Validates: Requirements 6.2**
     */
    it('should handle empty string', () => {
      const detector = new RelationshipDetector();
      
      expect(detector.normalizeSlug('')).toBe('');
    });

    /**
     * **Validates: Requirements 6.2**
     */
    it('should handle single character slugs', () => {
      const detector = new RelationshipDetector();
      
      expect(detector.normalizeSlug('s')).toBe('');
      expect(detector.normalizeSlug('a')).toBe('a');
      expect(detector.normalizeSlug('x')).toBe('x');
    });

    /**
     * **Validates: Requirements 6.2**
     */
    it('should handle slugs that do not end in s', () => {
      const detector = new RelationshipDetector();
      
      expect(detector.normalizeSlug('person')).toBe('person');
      expect(detector.normalizeSlug('data')).toBe('data');
      expect(detector.normalizeSlug('information')).toBe('information');
    });
  });

  describe('slugsMatch', () => {
    /**
     * **Validates: Requirements 6.2**
     */
    it('should match singular and plural forms', () => {
      const detector = new RelationshipDetector();
      
      expect(detector.slugsMatch('users', 'user')).toBe(true);
      expect(detector.slugsMatch('user', 'users')).toBe(true);
      expect(detector.slugsMatch('templates', 'template')).toBe(true);
      expect(detector.slugsMatch('template', 'templates')).toBe(true);
      expect(detector.slugsMatch('tags', 'tag')).toBe(true);
      expect(detector.slugsMatch('tag', 'tags')).toBe(true);
    });

    /**
     * **Validates: Requirements 6.2**
     */
    it('should match identical slugs', () => {
      const detector = new RelationshipDetector();
      
      expect(detector.slugsMatch('users', 'users')).toBe(true);
      expect(detector.slugsMatch('user', 'user')).toBe(true);
      expect(detector.slugsMatch('templates', 'templates')).toBe(true);
      expect(detector.slugsMatch('template', 'template')).toBe(true);
    });

    /**
     * **Validates: Requirements 6.2**
     */
    it('should not match different resources', () => {
      const detector = new RelationshipDetector();
      
      expect(detector.slugsMatch('users', 'products')).toBe(false);
      expect(detector.slugsMatch('user', 'product')).toBe(false);
      expect(detector.slugsMatch('templates', 'tags')).toBe(false);
      expect(detector.slugsMatch('meetings', 'orders')).toBe(false);
    });

    /**
     * **Validates: Requirements 6.2**
     */
    it('should be case-insensitive', () => {
      const detector = new RelationshipDetector();
      
      expect(detector.slugsMatch('Users', 'user')).toBe(true);
      expect(detector.slugsMatch('USERS', 'user')).toBe(true);
      expect(detector.slugsMatch('users', 'USER')).toBe(true);
      expect(detector.slugsMatch('Templates', 'TEMPLATE')).toBe(true);
    });

    /**
     * **Validates: Requirements 6.2**
     */
    it('should handle slugs with hyphens and underscores', () => {
      const detector = new RelationshipDetector();
      
      expect(detector.slugsMatch('api-users', 'api-user')).toBe(true);
      expect(detector.slugsMatch('user_profiles', 'user_profile')).toBe(true);
      expect(detector.slugsMatch('meeting-templates', 'meeting-template')).toBe(true);
    });

    /**
     * **Validates: Requirements 6.2**
     */
    it('should handle irregular plurals', () => {
      const detector = new RelationshipDetector();
      
      // Note: Simple implementation treats "categories" as "categorie"
      expect(detector.slugsMatch('categories', 'categorie')).toBe(true);
      expect(detector.slugsMatch('entries', 'entrie')).toBe(true);
    });

    /**
     * **Validates: Requirements 6.2**
     */
    it('should handle empty strings', () => {
      const detector = new RelationshipDetector();
      
      expect(detector.slugsMatch('', '')).toBe(true);
      expect(detector.slugsMatch('users', '')).toBe(false);
      expect(detector.slugsMatch('', 'users')).toBe(false);
    });

    /**
     * **Validates: Requirements 6.2**
     */
    it('should handle single character slugs', () => {
      const detector = new RelationshipDetector();
      
      expect(detector.slugsMatch('s', '')).toBe(true); // 's' normalizes to ''
      expect(detector.slugsMatch('a', 'a')).toBe(true);
      expect(detector.slugsMatch('x', 'y')).toBe(false);
    });
  });
});

import { describe, it, expect } from 'vitest';
import type { Resource, SchemaNode, Operation } from '../../ir/types.js';

/**
 * Backward Compatibility Tests for Profile Type Definitions
 * 
 * Task 3.3: Verify type definitions maintain backward compatibility
 * Requirements: 10.4
 * 
 * These tests verify that the addition of __profileAnnotation to Resource
 * and x-uigen-profile to AnnotationConfig maintains backward compatibility
 * with existing code that doesn't use these properties.
 */
describe('Profile Type Backward Compatibility', () => {
  describe('Resource type with __profileAnnotation', () => {
    it('should allow creating resources without __profileAnnotation property', () => {
      // This simulates existing code that creates resources
      // without knowledge of the new __profileAnnotation property
      const resource: Resource = {
        name: 'Users',
        slug: 'users',
        uigenId: 'users-123',
        description: 'User management',
        operations: [],
        schema: {
          type: 'object',
          key: 'User',
          label: 'User',
          required: false,
          children: []
        } as SchemaNode,
        relationships: []
      };

      // Should compile and work without __profileAnnotation
      expect(resource.name).toBe('Users');
      expect(resource.slug).toBe('users');
      expect(resource.__profileAnnotation).toBeUndefined();
    });

    it('should allow creating resources with __profileAnnotation set to true', () => {
      const resource: Resource = {
        name: 'Profile',
        slug: 'profile',
        uigenId: 'profile-123',
        operations: [],
        schema: {
          type: 'object',
          key: 'Profile',
          label: 'Profile',
          required: false
        } as SchemaNode,
        relationships: [],
        __profileAnnotation: true
      };

      expect(resource.__profileAnnotation).toBe(true);
    });

    it('should allow creating resources with __profileAnnotation set to false', () => {
      const resource: Resource = {
        name: 'Admin',
        slug: 'admin',
        uigenId: 'admin-123',
        operations: [],
        schema: {
          type: 'object',
          key: 'Admin',
          label: 'Admin',
          required: false
        } as SchemaNode,
        relationships: [],
        __profileAnnotation: false
      };

      expect(resource.__profileAnnotation).toBe(false);
    });

    it('should allow creating resources with __profileAnnotation explicitly undefined', () => {
      const resource: Resource = {
        name: 'Products',
        slug: 'products',
        uigenId: 'products-123',
        operations: [],
        schema: {
          type: 'object',
          key: 'Product',
          label: 'Product',
          required: false
        } as SchemaNode,
        relationships: [],
        __profileAnnotation: undefined
      };

      expect(resource.__profileAnnotation).toBeUndefined();
    });

    it('should allow spreading existing resources without __profileAnnotation', () => {
      const existingResource: Resource = {
        name: 'Orders',
        slug: 'orders',
        uigenId: 'orders-123',
        operations: [],
        schema: {
          type: 'object',
          key: 'Order',
          label: 'Order',
          required: false
        } as SchemaNode,
        relationships: []
      };

      // Spread operator should work without issues
      const updatedResource: Resource = {
        ...existingResource,
        description: 'Updated description'
      };

      expect(updatedResource.name).toBe('Orders');
      expect(updatedResource.description).toBe('Updated description');
      expect(updatedResource.__profileAnnotation).toBeUndefined();
    });

    it('should allow adding __profileAnnotation to existing resources', () => {
      const existingResource: Resource = {
        name: 'Settings',
        slug: 'settings',
        uigenId: 'settings-123',
        operations: [],
        schema: {
          type: 'object',
          key: 'Settings',
          label: 'Settings',
          required: false
        } as SchemaNode,
        relationships: []
      };

      // Should be able to add the property later
      const profileResource: Resource = {
        ...existingResource,
        __profileAnnotation: true
      };

      expect(profileResource.__profileAnnotation).toBe(true);
      expect(profileResource.name).toBe('Settings');
    });

    it('should allow arrays of resources with mixed __profileAnnotation values', () => {
      const resources: Resource[] = [
        {
          name: 'Users',
          slug: 'users',
          uigenId: 'users-123',
          operations: [],
          schema: {} as SchemaNode,
          relationships: []
          // No __profileAnnotation
        },
        {
          name: 'Profile',
          slug: 'profile',
          uigenId: 'profile-123',
          operations: [],
          schema: {} as SchemaNode,
          relationships: [],
          __profileAnnotation: true
        },
        {
          name: 'Admin',
          slug: 'admin',
          uigenId: 'admin-123',
          operations: [],
          schema: {} as SchemaNode,
          relationships: [],
          __profileAnnotation: false
        }
      ];

      expect(resources).toHaveLength(3);
      expect(resources[0].__profileAnnotation).toBeUndefined();
      expect(resources[1].__profileAnnotation).toBe(true);
      expect(resources[2].__profileAnnotation).toBe(false);
    });

    it('should allow filtering resources without checking __profileAnnotation', () => {
      const resources: Resource[] = [
        {
          name: 'Users',
          slug: 'users',
          uigenId: 'users-123',
          operations: [],
          schema: {} as SchemaNode,
          relationships: []
        },
        {
          name: 'Products',
          slug: 'products',
          uigenId: 'products-123',
          operations: [],
          schema: {} as SchemaNode,
          relationships: []
        }
      ];

      // Existing code that filters resources should still work
      const filteredResources = resources.filter(r => r.slug === 'users');
      expect(filteredResources).toHaveLength(1);
      expect(filteredResources[0].name).toBe('Users');
    });

    it('should allow mapping resources without accessing __profileAnnotation', () => {
      const resources: Resource[] = [
        {
          name: 'Users',
          slug: 'users',
          uigenId: 'users-123',
          operations: [],
          schema: {} as SchemaNode,
          relationships: []
        }
      ];

      // Existing code that maps resources should still work
      const slugs = resources.map(r => r.slug);
      expect(slugs).toEqual(['users']);
    });

    it('should allow destructuring resources without __profileAnnotation', () => {
      const resource: Resource = {
        name: 'Categories',
        slug: 'categories',
        uigenId: 'categories-123',
        operations: [],
        schema: {} as SchemaNode,
        relationships: []
      };

      // Destructuring should work without issues
      const { name, slug, operations } = resource;
      expect(name).toBe('Categories');
      expect(slug).toBe('categories');
      expect(operations).toEqual([]);
    });
  });

  describe('Type compatibility with existing patterns', () => {
    it('should work with existing resource creation patterns', () => {
      // Simulate a factory function that creates resources
      const createResource = (name: string, slug: string): Resource => ({
        name,
        slug,
        uigenId: `${slug}-${Date.now()}`,
        operations: [],
        schema: {
          type: 'object',
          key: name,
          label: name,
          required: false
        } as SchemaNode,
        relationships: []
      });

      const resource = createResource('Tags', 'tags');
      expect(resource.name).toBe('Tags');
      expect(resource.__profileAnnotation).toBeUndefined();
    });

    it('should work with partial resource updates', () => {
      const resource: Resource = {
        name: 'Comments',
        slug: 'comments',
        uigenId: 'comments-123',
        operations: [],
        schema: {} as SchemaNode,
        relationships: []
      };

      // Partial updates should work
      const updates: Partial<Resource> = {
        description: 'Comment management'
      };

      const updatedResource = { ...resource, ...updates };
      expect(updatedResource.description).toBe('Comment management');
      expect(updatedResource.__profileAnnotation).toBeUndefined();
    });

    it('should work with resource comparison logic', () => {
      const resource1: Resource = {
        name: 'Posts',
        slug: 'posts',
        uigenId: 'posts-123',
        operations: [],
        schema: {} as SchemaNode,
        relationships: []
      };

      const resource2: Resource = {
        name: 'Posts',
        slug: 'posts',
        uigenId: 'posts-123',
        operations: [],
        schema: {} as SchemaNode,
        relationships: []
      };

      // Comparison logic should work
      expect(resource1.slug).toBe(resource2.slug);
      expect(resource1.name).toBe(resource2.name);
    });

    it('should work with resource serialization', () => {
      const resource: Resource = {
        name: 'Reviews',
        slug: 'reviews',
        uigenId: 'reviews-123',
        operations: [],
        schema: {} as SchemaNode,
        relationships: []
      };

      // JSON serialization should work
      const serialized = JSON.stringify(resource);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.name).toBe('Reviews');
      expect(deserialized.slug).toBe('reviews');
      // __profileAnnotation should not be in serialized output when undefined
      expect(deserialized.__profileAnnotation).toBeUndefined();
    });

    it('should work with resource cloning', () => {
      const original: Resource = {
        name: 'Notifications',
        slug: 'notifications',
        uigenId: 'notifications-123',
        operations: [],
        schema: {} as SchemaNode,
        relationships: []
      };

      // Cloning should work
      const clone = { ...original };
      expect(clone.name).toBe(original.name);
      expect(clone.slug).toBe(original.slug);
      expect(clone.__profileAnnotation).toBeUndefined();
    });
  });

  describe('Type safety with optional property', () => {
    it('should allow checking __profileAnnotation with optional chaining', () => {
      const resource: Resource = {
        name: 'Logs',
        slug: 'logs',
        uigenId: 'logs-123',
        operations: [],
        schema: {} as SchemaNode,
        relationships: []
      };

      // Optional chaining should work
      const isProfile = resource.__profileAnnotation === true;
      expect(isProfile).toBe(false);
    });

    it('should allow safe access to __profileAnnotation', () => {
      const resources: Resource[] = [
        {
          name: 'Events',
          slug: 'events',
          uigenId: 'events-123',
          operations: [],
          schema: {} as SchemaNode,
          relationships: []
        },
        {
          name: 'Profile',
          slug: 'profile',
          uigenId: 'profile-123',
          operations: [],
          schema: {} as SchemaNode,
          relationships: [],
          __profileAnnotation: true
        }
      ];

      // Safe access pattern
      const profileResources = resources.filter(r => r.__profileAnnotation === true);
      expect(profileResources).toHaveLength(1);
      expect(profileResources[0].slug).toBe('profile');
    });

    it('should handle undefined __profileAnnotation in conditional logic', () => {
      const resource: Resource = {
        name: 'Metrics',
        slug: 'metrics',
        uigenId: 'metrics-123',
        operations: [],
        schema: {} as SchemaNode,
        relationships: []
      };

      // Conditional logic should handle undefined correctly
      if (resource.__profileAnnotation === true) {
        throw new Error('Should not reach here');
      }

      if (resource.__profileAnnotation === false) {
        throw new Error('Should not reach here');
      }

      // This should be the path taken
      expect(resource.__profileAnnotation).toBeUndefined();
    });
  });

  describe('Integration with existing resource operations', () => {
    it('should work with resources that have operations', () => {
      const operation: Operation = {
        id: 'getUsers',
        uigenId: 'get-users-123',
        method: 'GET',
        path: '/users',
        parameters: [],
        responses: {},
        viewHint: 'list'
      };

      const resource: Resource = {
        name: 'Users',
        slug: 'users',
        uigenId: 'users-123',
        operations: [operation],
        schema: {} as SchemaNode,
        relationships: []
      };

      expect(resource.operations).toHaveLength(1);
      expect(resource.operations[0].method).toBe('GET');
      expect(resource.__profileAnnotation).toBeUndefined();
    });

    it('should work with resources that have relationships', () => {
      const resource: Resource = {
        name: 'Users',
        slug: 'users',
        uigenId: 'users-123',
        operations: [],
        schema: {} as SchemaNode,
        relationships: [
          {
            target: 'orders',
            type: 'hasMany',
            path: '/users/{id}/orders'
          }
        ]
      };

      expect(resource.relationships).toHaveLength(1);
      expect(resource.relationships[0].type).toBe('hasMany');
      expect(resource.__profileAnnotation).toBeUndefined();
    });

    it('should work with resources that have all optional properties', () => {
      const resource: Resource = {
        name: 'FullResource',
        slug: 'full-resource',
        uigenId: 'full-resource-123',
        label: 'Full Resource Label',
        schemaName: 'FullResourceSchema',
        description: 'A complete resource',
        operations: [],
        schema: {} as SchemaNode,
        relationships: [],
        pagination: {
          style: 'offset',
          params: { limit: 'limit', offset: 'offset' }
        },
        isLibrary: false,
        __profileAnnotation: true
      };

      expect(resource.label).toBe('Full Resource Label');
      expect(resource.schemaName).toBe('FullResourceSchema');
      expect(resource.description).toBe('A complete resource');
      expect(resource.pagination).toBeDefined();
      expect(resource.isLibrary).toBe(false);
      expect(resource.__profileAnnotation).toBe(true);
    });
  });
});

import { describe, it, expect } from 'vitest';
import type { Resource, Relationship } from '../types.js';

describe('IR Type Extensions', () => {
  describe('manyToMany relationship type', () => {
    it('should create a manyToMany relationship', () => {
      const relationship: Relationship = {
        target: 'templates',
        type: 'manyToMany',
        path: '/meetings/{id}/templates',
      };

      expect(relationship.type).toBe('manyToMany');
      expect(relationship.target).toBe('templates');
      expect(relationship.path).toBe('/meetings/{id}/templates');
    });

    it('should create a manyToMany relationship with isReadOnly flag', () => {
      const relationship: Relationship = {
        target: 'templates',
        type: 'manyToMany',
        path: '/meetings/{id}/templates',
        isReadOnly: true,
      };

      expect(relationship.type).toBe('manyToMany');
      expect(relationship.isReadOnly).toBe(true);
    });

    it('should serialize manyToMany relationship to JSON', () => {
      const relationship: Relationship = {
        target: 'templates',
        type: 'manyToMany',
        path: '/meetings/{id}/templates',
      };

      const serialized = JSON.stringify(relationship);
      const deserialized = JSON.parse(serialized) as Relationship;

      expect(deserialized.type).toBe('manyToMany');
      expect(deserialized.target).toBe('templates');
      expect(deserialized.path).toBe('/meetings/{id}/templates');
    });

    it('should serialize manyToMany relationship with isReadOnly to JSON', () => {
      const relationship: Relationship = {
        target: 'templates',
        type: 'manyToMany',
        path: '/meetings/{id}/templates',
        isReadOnly: true,
      };

      const serialized = JSON.stringify(relationship);
      const deserialized = JSON.parse(serialized) as Relationship;

      expect(deserialized.type).toBe('manyToMany');
      expect(deserialized.isReadOnly).toBe(true);
    });

    it('should allow manyToMany alongside hasMany and belongsTo relationships', () => {
      const relationships: Relationship[] = [
        {
          target: 'user',
          type: 'belongsTo',
          path: '/meetings/{id}/user',
        },
        {
          target: 'attendees',
          type: 'hasMany',
          path: '/meetings/{id}/attendees',
        },
        {
          target: 'templates',
          type: 'manyToMany',
          path: '/meetings/{id}/templates',
        },
      ];

      expect(relationships).toHaveLength(3);
      expect(relationships[0].type).toBe('belongsTo');
      expect(relationships[1].type).toBe('hasMany');
      expect(relationships[2].type).toBe('manyToMany');
    });
  });

  describe('isLibrary flag', () => {
    it('should set isLibrary flag to true on a resource', () => {
      const resource: Resource = {
        name: 'Template',
        slug: 'templates',
        uigenId: 'resource-templates',
        description: 'Meeting templates',
        operations: [],
        schema: {
          type: 'object',
          key: 'template',
          label: 'Template',
          required: false,
        },
        relationships: [],
        isLibrary: true,
      };

      expect(resource.isLibrary).toBe(true);
    });

    it('should set isLibrary flag to false on a resource', () => {
      const resource: Resource = {
        name: 'Meeting',
        slug: 'meetings',
        uigenId: 'resource-meetings',
        description: 'Meetings',
        operations: [],
        schema: {
          type: 'object',
          key: 'meeting',
          label: 'Meeting',
          required: false,
        },
        relationships: [],
        isLibrary: false,
      };

      expect(resource.isLibrary).toBe(false);
    });

    it('should allow isLibrary to be undefined', () => {
      const resource: Resource = {
        name: 'Meeting',
        slug: 'meetings',
        uigenId: 'resource-meetings',
        operations: [],
        schema: {
          type: 'object',
          key: 'meeting',
          label: 'Meeting',
          required: false,
        },
        relationships: [],
      };

      expect(resource.isLibrary).toBeUndefined();
    });

    it('should serialize resource with isLibrary flag to JSON', () => {
      const resource: Resource = {
        name: 'Template',
        slug: 'templates',
        uigenId: 'resource-templates',
        operations: [],
        schema: {
          type: 'object',
          key: 'template',
          label: 'Template',
          required: false,
        },
        relationships: [],
        isLibrary: true,
      };

      const serialized = JSON.stringify(resource);
      const deserialized = JSON.parse(serialized) as Resource;

      expect(deserialized.isLibrary).toBe(true);
      expect(deserialized.name).toBe('Template');
      expect(deserialized.slug).toBe('templates');
    });

    it('should serialize resource without isLibrary flag to JSON', () => {
      const resource: Resource = {
        name: 'Meeting',
        slug: 'meetings',
        uigenId: 'resource-meetings',
        operations: [],
        schema: {
          type: 'object',
          key: 'meeting',
          label: 'Meeting',
          required: false,
        },
        relationships: [],
      };

      const serialized = JSON.stringify(resource);
      const deserialized = JSON.parse(serialized) as Resource;

      expect(deserialized.isLibrary).toBeUndefined();
    });
  });

  describe('Integration: Resource with manyToMany relationships', () => {
    it('should create a consumer resource with manyToMany relationships to library resources', () => {
      const libraryResource: Resource = {
        name: 'Template',
        slug: 'templates',
        uigenId: 'resource-templates',
        operations: [],
        schema: {
          type: 'object',
          key: 'template',
          label: 'Template',
          required: false,
        },
        relationships: [],
        isLibrary: true,
      };

      const consumerResource: Resource = {
        name: 'Meeting',
        slug: 'meetings',
        uigenId: 'resource-meetings',
        operations: [],
        schema: {
          type: 'object',
          key: 'meeting',
          label: 'Meeting',
          required: false,
        },
        relationships: [
          {
            target: 'templates',
            type: 'manyToMany',
            path: '/meetings/{id}/templates',
          },
        ],
        isLibrary: false,
      };

      expect(consumerResource.relationships).toHaveLength(1);
      expect(consumerResource.relationships[0].type).toBe('manyToMany');
      expect(consumerResource.relationships[0].target).toBe(libraryResource.slug);
      expect(consumerResource.isLibrary).toBe(false);
      expect(libraryResource.isLibrary).toBe(true);
    });

    it('should serialize complete resource structure with manyToMany relationships', () => {
      const resources: Resource[] = [
        {
          name: 'Template',
          slug: 'templates',
          uigenId: 'resource-templates',
          operations: [],
          schema: {
            type: 'object',
            key: 'template',
            label: 'Template',
            required: false,
          },
          relationships: [],
          isLibrary: true,
        },
        {
          name: 'Meeting',
          slug: 'meetings',
          uigenId: 'resource-meetings',
          operations: [],
          schema: {
            type: 'object',
            key: 'meeting',
            label: 'Meeting',
            required: false,
          },
          relationships: [
            {
              target: 'templates',
              type: 'manyToMany',
              path: '/meetings/{id}/templates',
            },
          ],
        },
      ];

      const serialized = JSON.stringify(resources);
      const deserialized = JSON.parse(serialized) as Resource[];

      expect(deserialized).toHaveLength(2);
      expect(deserialized[0].isLibrary).toBe(true);
      expect(deserialized[1].relationships[0].type).toBe('manyToMany');
    });

    it('should handle multiple manyToMany relationships on a single resource', () => {
      const resource: Resource = {
        name: 'Meeting',
        slug: 'meetings',
        uigenId: 'resource-meetings',
        operations: [],
        schema: {
          type: 'object',
          key: 'meeting',
          label: 'Meeting',
          required: false,
        },
        relationships: [
          {
            target: 'templates',
            type: 'manyToMany',
            path: '/meetings/{id}/templates',
          },
          {
            target: 'tags',
            type: 'manyToMany',
            path: '/meetings/{id}/tags',
          },
          {
            target: 'categories',
            type: 'manyToMany',
            path: '/meetings/{id}/categories',
          },
        ],
      };

      expect(resource.relationships).toHaveLength(3);
      expect(resource.relationships.every(rel => rel.type === 'manyToMany')).toBe(true);
    });
  });
});

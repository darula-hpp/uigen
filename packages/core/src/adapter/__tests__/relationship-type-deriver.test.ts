import { describe, it, expect, vi } from 'vitest';
import { deriveRelationshipType } from '../relationship-type-deriver.js';
import type { RelationshipConfig } from '../../config/types.js';

describe('deriveRelationshipType', () => {
  describe('hasMany pattern', () => {
    it('/{sourceSlug}/{id}/{targetSlug} returns hasMany', () => {
      expect(deriveRelationshipType('/users/{id}/orders', 'users', 'orders', [])).toBe('hasMany');
    });

    it('handles different id parameter names', () => {
      expect(deriveRelationshipType('/projects/{projectId}/tasks', 'projects', 'tasks', [])).toBe('hasMany');
    });

    it('returns hasMany when no symmetric counterpart exists', () => {
      const entries: RelationshipConfig[] = [
        { source: 'users', target: 'orders', path: '/users/{id}/orders' },
      ];
      expect(deriveRelationshipType('/users/{id}/orders', 'users', 'orders', entries)).toBe('hasMany');
    });
  });

  describe('belongsTo pattern', () => {
    it('/{targetSlug}/{id}/{sourceSlug} returns belongsTo', () => {
      expect(deriveRelationshipType('/orders/{id}/users', 'users', 'orders', [])).toBe('belongsTo');
    });

    it('handles different id parameter names for belongsTo', () => {
      expect(deriveRelationshipType('/tasks/{taskId}/projects', 'projects', 'tasks', [])).toBe('belongsTo');
    });
  });

  describe('manyToMany pattern', () => {
    it('symmetric pair produces manyToMany on both sides', () => {
      const entries: RelationshipConfig[] = [
        { source: 'projects', target: 'tags', path: '/projects/{id}/tags' },
        { source: 'tags', target: 'projects', path: '/tags/{id}/projects' },
      ];

      expect(deriveRelationshipType('/projects/{id}/tags', 'projects', 'tags', entries)).toBe('manyToMany');
      expect(deriveRelationshipType('/tags/{id}/projects', 'tags', 'projects', entries)).toBe('manyToMany');
    });

    it('non-symmetric pair does not produce manyToMany', () => {
      const entries: RelationshipConfig[] = [
        { source: 'projects', target: 'tags', path: '/projects/{id}/tags' },
        // No reverse entry
      ];

      expect(deriveRelationshipType('/projects/{id}/tags', 'projects', 'tags', entries)).toBe('hasMany');
    });
  });

  describe('unknown pattern', () => {
    it('unrecognised path defaults to hasMany and logs a warning', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = deriveRelationshipType('/some/completely/different/path', 'users', 'orders', []);

      expect(result).toBe('hasMany');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unrecognised path pattern')
      );

      warnSpy.mockRestore();
    });
  });
});

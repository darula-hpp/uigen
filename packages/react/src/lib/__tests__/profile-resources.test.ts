import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isProfileResource, filterProfileResources, findProfileResource } from '../profile-resources';
import type { UIGenApp, Resource } from '@uigen-dev/core';

describe('profile-resources', () => {
  const createMockResource = (
    slug: string,
    profileAnnotation?: boolean
  ): Resource => ({
    name: slug,
    slug,
    uigenId: `resource-${slug}`,
    operations: [],
    schema: {
      type: 'object',
      key: slug,
      children: [],
    },
    relationships: [],
    __profileAnnotation: profileAnnotation,
  });

  const createMockConfig = (resources: Resource[]): UIGenApp => ({
    meta: { title: 'Test API', version: '1.0.0' },
    resources,
    auth: {
      schemes: [],
      globalRequired: false,
    },
    dashboard: { enabled: true, widgets: [] },
    servers: [{ url: 'http://localhost:3000' }],
  });

  describe('isProfileResource', () => {
    it('should return true for __profileAnnotation: true', () => {
      const resource = createMockResource('Profile', true);
      expect(isProfileResource(resource)).toBe(true);
    });

    it('should return false for __profileAnnotation: false', () => {
      const resource = createMockResource('Users', false);
      expect(isProfileResource(resource)).toBe(false);
    });

    it('should return false for undefined __profileAnnotation', () => {
      const resource = createMockResource('Users', undefined);
      expect(isProfileResource(resource)).toBe(false);
    });

    it('should return false for missing __profileAnnotation property', () => {
      const resource = createMockResource('Users');
      expect(isProfileResource(resource)).toBe(false);
    });
  });

  describe('filterProfileResources', () => {
    it('should filter out profile resources', () => {
      const profileResource = createMockResource('Profile', true);
      const userResource = createMockResource('Users', undefined);
      const postResource = createMockResource('Posts', false);

      const filtered = filterProfileResources([profileResource, userResource, postResource]);

      expect(filtered).toHaveLength(2);
      expect(filtered.map(r => r.slug)).toEqual(['Users', 'Posts']);
    });

    it('should preserve non-profile resources', () => {
      const userResource = createMockResource('Users', undefined);
      const postResource = createMockResource('Posts', false);

      const filtered = filterProfileResources([userResource, postResource]);

      expect(filtered).toHaveLength(2);
      expect(filtered.map(r => r.slug)).toEqual(['Users', 'Posts']);
    });

    it('should maintain original order', () => {
      const resource1 = createMockResource('Users', undefined);
      const resource2 = createMockResource('Profile', true);
      const resource3 = createMockResource('Posts', false);
      const resource4 = createMockResource('Comments', undefined);

      const filtered = filterProfileResources([resource1, resource2, resource3, resource4]);

      expect(filtered.map(r => r.slug)).toEqual(['Users', 'Posts', 'Comments']);
    });

    it('should handle empty arrays', () => {
      const filtered = filterProfileResources([]);
      expect(filtered).toHaveLength(0);
    });

    it('should return empty array when all resources are profile resources', () => {
      const profile1 = createMockResource('Profile1', true);
      const profile2 = createMockResource('Profile2', true);

      const filtered = filterProfileResources([profile1, profile2]);

      expect(filtered).toHaveLength(0);
    });
  });

  describe('findProfileResource', () => {
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleWarnSpy.mockRestore();
    });

    it('should return first profile resource', () => {
      const profileResource = createMockResource('Profile', true);
      const userResource = createMockResource('Users', undefined);
      const config = createMockConfig([profileResource, userResource]);

      const result = findProfileResource(config);

      expect(result).toBe(profileResource);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should return undefined when no profile resources exist', () => {
      const userResource = createMockResource('Users', undefined);
      const postResource = createMockResource('Posts', false);
      const config = createMockConfig([userResource, postResource]);

      const result = findProfileResource(config);

      expect(result).toBeUndefined();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should log warning for multiple profile resources', () => {
      const profile1 = createMockResource('Profile1', true);
      const profile2 = createMockResource('Profile2', true);
      const config = createMockConfig([profile1, profile2]);

      const result = findProfileResource(config);

      expect(result).toBe(profile1);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Multiple profile resources found: Profile1, Profile2. Using first: Profile1'
      );
    });

    it('should return first profile resource when multiple exist', () => {
      const userResource = createMockResource('Users', undefined);
      const profile1 = createMockResource('Profile1', true);
      const profile2 = createMockResource('Profile2', true);
      const profile3 = createMockResource('Profile3', true);
      const config = createMockConfig([userResource, profile1, profile2, profile3]);

      const result = findProfileResource(config);

      expect(result).toBe(profile1);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Multiple profile resources found: Profile1, Profile2, Profile3. Using first: Profile1'
      );
    });

    it('should handle empty resource array', () => {
      const config = createMockConfig([]);

      const result = findProfileResource(config);

      expect(result).toBeUndefined();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });
});

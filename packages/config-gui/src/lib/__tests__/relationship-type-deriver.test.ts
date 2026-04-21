import { describe, it, expect } from 'vitest';
import { deriveTypeFromPath } from '../relationship-type-deriver.js';

describe('deriveTypeFromPath', () => {
  // Subtask 5.2: Handle hasMany pattern: /{sourceSlug}/{id}/{targetSlug}
  describe('hasMany pattern detection', () => {
    it('detects hasMany pattern with standard path', () => {
      const result = deriveTypeFromPath('/users/{id}/orders', 'users', 'orders');
      expect(result).toBe('hasMany');
    });

    it('detects hasMany pattern with different parameter name', () => {
      const result = deriveTypeFromPath('/users/{userId}/orders', 'users', 'orders');
      expect(result).toBe('hasMany');
    });

    it('detects hasMany pattern with uuid parameter', () => {
      const result = deriveTypeFromPath('/users/{uuid}/posts', 'users', 'posts');
      expect(result).toBe('hasMany');
    });

    it('detects hasMany pattern with different resource names', () => {
      const result = deriveTypeFromPath('/projects/{id}/tasks', 'projects', 'tasks');
      expect(result).toBe('hasMany');
    });

    it('detects hasMany pattern with plural source and target', () => {
      const result = deriveTypeFromPath('/meetings/{id}/templates', 'meetings', 'templates');
      expect(result).toBe('hasMany');
    });

    it('detects hasMany pattern with camelCase slugs', () => {
      const result = deriveTypeFromPath('/userProfiles/{id}/socialLinks', 'userProfiles', 'socialLinks');
      expect(result).toBe('hasMany');
    });

    it('detects hasMany pattern with kebab-case slugs', () => {
      const result = deriveTypeFromPath('/user-profiles/{id}/social-links', 'user-profiles', 'social-links');
      expect(result).toBe('hasMany');
    });
  });

  // Subtask 5.3: Handle belongsTo pattern: /{targetSlug}/{id}/{sourceSlug}
  describe('belongsTo pattern detection', () => {
    it('detects belongsTo pattern with standard path', () => {
      const result = deriveTypeFromPath('/users/{id}/orders', 'orders', 'users');
      expect(result).toBe('belongsTo');
    });

    it('detects belongsTo pattern with different parameter name', () => {
      const result = deriveTypeFromPath('/users/{userId}/orders', 'orders', 'users');
      expect(result).toBe('belongsTo');
    });

    it('detects belongsTo pattern with different resource names', () => {
      const result = deriveTypeFromPath('/projects/{id}/tasks', 'tasks', 'projects');
      expect(result).toBe('belongsTo');
    });

    it('detects belongsTo pattern with plural source and target', () => {
      const result = deriveTypeFromPath('/meetings/{id}/templates', 'templates', 'meetings');
      expect(result).toBe('belongsTo');
    });

    it('detects belongsTo pattern with camelCase slugs', () => {
      const result = deriveTypeFromPath('/userProfiles/{id}/socialLinks', 'socialLinks', 'userProfiles');
      expect(result).toBe('belongsTo');
    });

    it('detects belongsTo pattern with kebab-case slugs', () => {
      const result = deriveTypeFromPath('/user-profiles/{id}/social-links', 'social-links', 'user-profiles');
      expect(result).toBe('belongsTo');
    });
  });

  // Subtask 5.4: Default to hasMany when no pattern matches
  describe('default behavior', () => {
    it('defaults to hasMany for non-matching path', () => {
      const result = deriveTypeFromPath('/custom/path', 'users', 'orders');
      expect(result).toBe('hasMany');
    });

    it('defaults to hasMany for root path', () => {
      const result = deriveTypeFromPath('/', 'users', 'orders');
      expect(result).toBe('hasMany');
    });

    it('defaults to hasMany for path without parameters', () => {
      const result = deriveTypeFromPath('/users/orders', 'users', 'orders');
      expect(result).toBe('hasMany');
    });

    it('defaults to hasMany for path with extra segments', () => {
      const result = deriveTypeFromPath('/api/v1/users/{id}/orders', 'users', 'orders');
      expect(result).toBe('hasMany');
    });

    it('defaults to hasMany for path with nested parameters', () => {
      const result = deriveTypeFromPath('/users/{userId}/orders/{orderId}', 'users', 'orders');
      expect(result).toBe('hasMany');
    });

    it('defaults to hasMany for completely different path structure', () => {
      const result = deriveTypeFromPath('/some/random/path', 'users', 'orders');
      expect(result).toBe('hasMany');
    });
  });

  // Subtask 5.6: Add edge case tests (empty paths, malformed paths, etc.)
  describe('edge cases', () => {
    it('handles empty path', () => {
      const result = deriveTypeFromPath('', 'users', 'orders');
      expect(result).toBe('hasMany');
    });

    it('handles empty source slug', () => {
      const result = deriveTypeFromPath('/users/{id}/orders', '', 'orders');
      expect(result).toBe('hasMany');
    });

    it('handles empty target slug', () => {
      const result = deriveTypeFromPath('/users/{id}/orders', 'users', '');
      expect(result).toBe('hasMany');
    });

    it('handles path without leading slash', () => {
      const result = deriveTypeFromPath('users/{id}/orders', 'users', 'orders');
      expect(result).toBe('hasMany');
    });

    it('handles path with trailing slash', () => {
      const result = deriveTypeFromPath('/users/{id}/orders/', 'users', 'orders');
      expect(result).toBe('hasMany');
    });

    it('handles path with multiple slashes', () => {
      const result = deriveTypeFromPath('/users//{id}//orders', 'users', 'orders');
      expect(result).toBe('hasMany');
    });

    it('handles path with whitespace', () => {
      const result = deriveTypeFromPath('  /users/{id}/orders  ', 'users', 'orders');
      expect(result).toBe('hasMany');
    });

    it('handles slugs with special regex characters', () => {
      const result = deriveTypeFromPath('/user.profiles/{id}/social+links', 'user.profiles', 'social+links');
      expect(result).toBe('hasMany');
    });

    it('handles slugs with parentheses', () => {
      const result = deriveTypeFromPath('/users(v2)/{id}/orders(v2)', 'users(v2)', 'orders(v2)');
      expect(result).toBe('hasMany');
    });

    it('handles slugs with brackets', () => {
      const result = deriveTypeFromPath('/users[v2]/{id}/orders[v2]', 'users[v2]', 'orders[v2]');
      expect(result).toBe('hasMany');
    });

    it('handles parameter with complex name', () => {
      const result = deriveTypeFromPath('/users/{user_id_v2}/orders', 'users', 'orders');
      expect(result).toBe('hasMany');
    });

    it('handles empty parameter braces', () => {
      const result = deriveTypeFromPath('/users/{}/orders', 'users', 'orders');
      expect(result).toBe('hasMany');
    });

    it('handles malformed parameter (missing closing brace)', () => {
      const result = deriveTypeFromPath('/users/{id/orders', 'users', 'orders');
      expect(result).toBe('hasMany');
    });

    it('handles malformed parameter (missing opening brace)', () => {
      const result = deriveTypeFromPath('/users/id}/orders', 'users', 'orders');
      expect(result).toBe('hasMany');
    });
  });

  // Additional tests for pattern matching accuracy
  describe('pattern matching accuracy', () => {
    it('does not match hasMany when slugs are swapped', () => {
      const result = deriveTypeFromPath('/orders/{id}/users', 'users', 'orders');
      expect(result).toBe('belongsTo');
    });

    it('does not match belongsTo when slugs are swapped', () => {
      const result = deriveTypeFromPath('/orders/{id}/users', 'orders', 'users');
      expect(result).toBe('hasMany');
    });

    it('is case-sensitive for slug matching', () => {
      const result = deriveTypeFromPath('/Users/{id}/Orders', 'users', 'orders');
      expect(result).toBe('hasMany'); // No match, defaults to hasMany
    });

    it('matches exact slug names only', () => {
      const result = deriveTypeFromPath('/users/{id}/user_orders', 'users', 'orders');
      expect(result).toBe('hasMany'); // No match, defaults to hasMany
    });

    it('does not partially match slug names', () => {
      const result = deriveTypeFromPath('/users/{id}/orders_archive', 'users', 'orders');
      expect(result).toBe('hasMany'); // No match, defaults to hasMany
    });
  });

  // Test requirement validation
  describe('requirement validation', () => {
    // Requirement 9.2: Path matches /{sourceSlug}/{id}/{targetSlug} → recommend hasMany
    it('validates Requirement 9.2', () => {
      expect(deriveTypeFromPath('/users/{id}/orders', 'users', 'orders')).toBe('hasMany');
      expect(deriveTypeFromPath('/projects/{projectId}/tasks', 'projects', 'tasks')).toBe('hasMany');
      expect(deriveTypeFromPath('/meetings/{meetingId}/templates', 'meetings', 'templates')).toBe('hasMany');
    });

    // Requirement 9.2: Path matches /{targetSlug}/{id}/{sourceSlug} → recommend belongsTo
    it('validates belongsTo pattern from Requirement 9.2', () => {
      expect(deriveTypeFromPath('/users/{id}/orders', 'orders', 'users')).toBe('belongsTo');
      expect(deriveTypeFromPath('/projects/{projectId}/tasks', 'tasks', 'projects')).toBe('belongsTo');
      expect(deriveTypeFromPath('/meetings/{meetingId}/templates', 'templates', 'meetings')).toBe('belongsTo');
    });

    // Requirement 9.2: No pattern match → default to hasMany
    it('validates default behavior from Requirement 9.2', () => {
      expect(deriveTypeFromPath('/custom/endpoint', 'users', 'orders')).toBe('hasMany');
      expect(deriveTypeFromPath('/api/v1/data', 'projects', 'tasks')).toBe('hasMany');
      expect(deriveTypeFromPath('/', 'meetings', 'templates')).toBe('hasMany');
    });
  });

  // Performance test (should complete in <1ms per call)
  describe('performance', () => {
    it('completes derivation quickly', () => {
      const start = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        deriveTypeFromPath('/users/{id}/orders', 'users', 'orders');
      }
      
      const end = performance.now();
      const avgTime = (end - start) / 1000;
      
      // Should average less than 1ms per call
      expect(avgTime).toBeLessThan(1);
    });
  });
});

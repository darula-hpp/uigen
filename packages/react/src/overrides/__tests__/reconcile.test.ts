import { describe, it, expect, beforeEach, vi } from 'vitest';
import { reconcile } from '../reconcile';
import { overrideRegistry } from '../registry';
import type { OverrideDefinition } from '../types';

describe('reconcile', () => {
  beforeEach(() => {
    overrideRegistry.clear();
  });

  describe('mode selection', () => {
    it('should return none mode when no override exists', () => {
      const result = reconcile('users.list');
      expect(result.mode).toBe('none');
      expect(result.overrideComponent).toBeUndefined();
      expect(result.renderFn).toBeUndefined();
    });

    it('should return component mode when component is defined', () => {
      const component = () => null;
      overrideRegistry.register({
        targetId: 'users.list',
        component,
      });

      const result = reconcile('users.list');
      expect(result.mode).toBe('component');
      expect(result.overrideComponent).toBe(component);
      expect(result.renderFn).toBeUndefined();
    });

    it('should return render mode when only render is defined', () => {
      const render = () => null;
      overrideRegistry.register({
        targetId: 'users.list',
        render,
      });

      const result = reconcile('users.list');
      expect(result.mode).toBe('render');
      expect(result.renderFn).toBe(render);
      expect(result.overrideComponent).toBeUndefined();
    });

    it('should return hooks mode when only useHooks is defined', () => {
      overrideRegistry.register({
        targetId: 'users.list',
        useHooks: () => {},
      });

      const result = reconcile('users.list');
      expect(result.mode).toBe('hooks');
      expect(result.overrideComponent).toBeUndefined();
      expect(result.renderFn).toBeUndefined();
    });
  });

  describe('priority rules', () => {
    it('should prioritize component over render', () => {
      const component = () => null;
      const render = () => null;
      overrideRegistry.register({
        targetId: 'users.list',
        component,
        render,
      });

      const result = reconcile('users.list');
      expect(result.mode).toBe('component');
      expect(result.overrideComponent).toBe(component);
    });

    it('should prioritize component over useHooks', () => {
      const component = () => null;
      overrideRegistry.register({
        targetId: 'users.list',
        component,
        useHooks: () => {},
      });

      const result = reconcile('users.list');
      expect(result.mode).toBe('component');
      expect(result.overrideComponent).toBe(component);
    });

    it('should prioritize render over useHooks', () => {
      const render = () => null;
      overrideRegistry.register({
        targetId: 'users.list',
        render,
        useHooks: () => {},
      });

      const result = reconcile('users.list');
      expect(result.mode).toBe('render');
      expect(result.renderFn).toBe(render);
    });

    it('should prioritize component when all modes defined', () => {
      const component = () => null;
      const render = () => null;
      overrideRegistry.register({
        targetId: 'users.list',
        component,
        render,
        useHooks: () => {},
      });

      const result = reconcile('users.list');
      expect(result.mode).toBe('component');
      expect(result.overrideComponent).toBe(component);
    });
  });

  describe('warnings', () => {
    it('should warn for non-existent uigenId with similar suggestion', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      overrideRegistry.register({
        targetId: 'users.list',
        component: () => null,
      });

      // "users" is contained in "users.list", so it should match
      reconcile('users'); 

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No override found for "users"')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Did you mean "users.list"?')
      );

      consoleSpy.mockRestore();
    });

    it('should warn for case-insensitive match', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      overrideRegistry.register({
        targetId: 'users.list',
        component: () => null,
      });

      reconcile('Users.List'); // Wrong case

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Did you mean "users.list"?')
      );

      consoleSpy.mockRestore();
    });

    it('should warn for partial match', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      overrideRegistry.register({
        targetId: 'users.list',
        component: () => null,
      });

      reconcile('users'); // Partial match

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Did you mean "users.list"?')
      );

      consoleSpy.mockRestore();
    });

    it('should not warn when no similar override exists', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      overrideRegistry.register({
        targetId: 'posts.list',
        component: () => null,
      });

      reconcile('users.list'); // Completely different

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('view-specific addressing', () => {
    it('should handle resource-level override', () => {
      overrideRegistry.register({
        targetId: 'users',
        component: () => null,
      });

      const result = reconcile('users');
      expect(result.mode).toBe('component');
    });

    it('should handle list view override', () => {
      overrideRegistry.register({
        targetId: 'users.list',
        component: () => null,
      });

      const result = reconcile('users.list');
      expect(result.mode).toBe('component');
    });

    it('should handle detail view override', () => {
      overrideRegistry.register({
        targetId: 'users.detail',
        component: () => null,
      });

      const result = reconcile('users.detail');
      expect(result.mode).toBe('component');
    });

    it('should handle create view override', () => {
      overrideRegistry.register({
        targetId: 'users.create',
        component: () => null,
      });

      const result = reconcile('users.create');
      expect(result.mode).toBe('component');
    });

    it('should handle edit view override', () => {
      overrideRegistry.register({
        targetId: 'users.edit',
        component: () => null,
      });

      const result = reconcile('users.edit');
      expect(result.mode).toBe('component');
    });

    it('should handle search view override', () => {
      overrideRegistry.register({
        targetId: 'users.search',
        component: () => null,
      });

      const result = reconcile('users.search');
      expect(result.mode).toBe('component');
    });
  });

  describe('multiple overrides', () => {
    it('should handle multiple independent overrides', () => {
      overrideRegistry.register({
        targetId: 'users.list',
        component: () => null,
      });
      overrideRegistry.register({
        targetId: 'posts.list',
        render: () => null,
      });
      overrideRegistry.register({
        targetId: 'comments.list',
        useHooks: () => {},
      });

      expect(reconcile('users.list').mode).toBe('component');
      expect(reconcile('posts.list').mode).toBe('render');
      expect(reconcile('comments.list').mode).toBe('hooks');
      expect(reconcile('tags.list').mode).toBe('none');
    });

    it('should handle view-specific overrides for same resource', () => {
      overrideRegistry.register({
        targetId: 'users.list',
        component: () => null,
      });
      overrideRegistry.register({
        targetId: 'users.detail',
        render: () => null,
      });
      overrideRegistry.register({
        targetId: 'users.create',
        useHooks: () => {},
      });

      expect(reconcile('users.list').mode).toBe('component');
      expect(reconcile('users.detail').mode).toBe('render');
      expect(reconcile('users.create').mode).toBe('hooks');
      expect(reconcile('users.edit').mode).toBe('none');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string uigenId', () => {
      const result = reconcile('');
      expect(result.mode).toBe('none');
    });

    it('should handle uigenId with special characters', () => {
      overrideRegistry.register({
        targetId: 'api-users.list',
        component: () => null,
      });

      const result = reconcile('api-users.list');
      expect(result.mode).toBe('component');
    });

    it('should handle deeply nested addressing', () => {
      overrideRegistry.register({
        targetId: 'api.v1.users.list',
        component: () => null,
      });

      const result = reconcile('api.v1.users.list');
      expect(result.mode).toBe('component');
    });

    it('should return none for override with no valid modes', () => {
      // This shouldn't happen due to validation, but test the fallback
      overrideRegistry.register({
        targetId: 'users.list',
        component: () => null,
      });

      // Manually clear the component to simulate invalid state
      const override = overrideRegistry.get('users.list');
      if (override) {
        delete override.component;
        delete override.render;
        delete override.useHooks;
      }

      const result = reconcile('users.list');
      expect(result.mode).toBe('none');
    });
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OverrideRegistry } from '../registry';
import type { OverrideDefinition } from '../types';

describe('OverrideRegistry', () => {
  let registry: OverrideRegistry;

  beforeEach(() => {
    registry = new OverrideRegistry();
  });

  describe('register and retrieve', () => {
    it('should register and retrieve overrides', () => {
      const override: OverrideDefinition = {
        targetId: 'users',
        component: () => null,
      };

      registry.register(override);
      expect(registry.get('users')).toEqual(override);
    });

    it('should return undefined for non-existent overrides', () => {
      expect(registry.get('nonexistent')).toBeUndefined();
    });

    it('should replace existing overrides', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const override1: OverrideDefinition = {
        targetId: 'users',
        component: () => null,
      };
      const override2: OverrideDefinition = {
        targetId: 'users',
        render: () => null,
      };

      registry.register(override1);
      registry.register(override2);

      expect(registry.get('users')).toEqual(override2);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Replacing existing override for "users"')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('has method', () => {
    it('should return true for registered overrides', () => {
      registry.register({
        targetId: 'users',
        component: () => null,
      });

      expect(registry.has('users')).toBe(true);
    });

    it('should return false for non-existent overrides', () => {
      expect(registry.has('nonexistent')).toBe(false);
    });

    it('should be consistent with get method', () => {
      registry.register({
        targetId: 'users',
        component: () => null,
      });

      expect(registry.has('users')).toBe(registry.get('users') !== undefined);
      expect(registry.has('posts')).toBe(registry.get('posts') !== undefined);
    });
  });

  describe('clear method', () => {
    it('should clear all overrides', () => {
      registry.register({ targetId: 'users', component: () => null });
      registry.register({ targetId: 'posts', component: () => null });

      registry.clear();

      expect(registry.get('users')).toBeUndefined();
      expect(registry.get('posts')).toBeUndefined();
    });

    it('should allow registering after clear', () => {
      registry.register({ targetId: 'users', component: () => null });
      registry.clear();
      registry.register({ targetId: 'posts', component: () => null });

      expect(registry.get('users')).toBeUndefined();
      expect(registry.get('posts')).toBeDefined();
    });
  });

  describe('validation', () => {
    it('should warn when registering override with empty targetId', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      registry.register({
        targetId: '',
        component: () => null,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('empty targetId')
      );
      expect(registry.get('')).toBeUndefined();

      consoleSpy.mockRestore();
    });

    it('should warn when registering override with whitespace-only targetId', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      registry.register({
        targetId: '   ',
        component: () => null,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('empty targetId')
      );

      consoleSpy.mockRestore();
    });

    it('should warn when registering override with no mode fields', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      registry.register({
        targetId: 'users',
      } as OverrideDefinition);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('no component, render, or useHooks')
      );
      expect(registry.get('users')).toBeUndefined();

      consoleSpy.mockRestore();
    });

    it('should accept override with only component field', () => {
      registry.register({
        targetId: 'users',
        component: () => null,
      });

      expect(registry.get('users')).toBeDefined();
    });

    it('should accept override with only render field', () => {
      registry.register({
        targetId: 'users',
        render: () => null,
      });

      expect(registry.get('users')).toBeDefined();
    });

    it('should accept override with only useHooks field', () => {
      registry.register({
        targetId: 'users',
        useHooks: () => {},
      });

      expect(registry.get('users')).toBeDefined();
    });

    it('should accept override with multiple mode fields', () => {
      registry.register({
        targetId: 'users',
        component: () => null,
        render: () => null,
        useHooks: () => {},
      });

      expect(registry.get('users')).toBeDefined();
    });
  });

  describe('getAllTargetIds', () => {
    it('should return empty array when no overrides registered', () => {
      expect(registry.getAllTargetIds()).toEqual([]);
    });

    it('should return all registered target IDs', () => {
      registry.register({ targetId: 'users', component: () => null });
      registry.register({ targetId: 'posts', component: () => null });
      registry.register({ targetId: 'comments', component: () => null });

      const targetIds = registry.getAllTargetIds();
      expect(targetIds).toHaveLength(3);
      expect(targetIds).toContain('users');
      expect(targetIds).toContain('posts');
      expect(targetIds).toContain('comments');
    });

    it('should not include cleared overrides', () => {
      registry.register({ targetId: 'users', component: () => null });
      registry.clear();

      expect(registry.getAllTargetIds()).toEqual([]);
    });
  });

  describe('round-trip preservation', () => {
    it('should preserve component override through register/get', () => {
      const component = () => null;
      const override: OverrideDefinition = {
        targetId: 'users',
        component,
      };

      registry.register(override);
      const retrieved = registry.get('users');

      expect(retrieved).toEqual(override);
      expect(retrieved?.component).toBe(component);
    });

    it('should preserve render override through register/get', () => {
      const render = () => null;
      const override: OverrideDefinition = {
        targetId: 'users',
        render,
      };

      registry.register(override);
      const retrieved = registry.get('users');

      expect(retrieved).toEqual(override);
      expect(retrieved?.render).toBe(render);
    });

    it('should preserve useHooks override through register/get', () => {
      const useHooks = () => {};
      const override: OverrideDefinition = {
        targetId: 'users',
        useHooks,
      };

      registry.register(override);
      const retrieved = registry.get('users');

      expect(retrieved).toEqual(override);
      expect(retrieved?.useHooks).toBe(useHooks);
    });

    it('should preserve all fields in complex override', () => {
      const component = () => null;
      const render = () => null;
      const useHooks = () => ({ data: 'test' });
      const override: OverrideDefinition = {
        targetId: 'users.list',
        component,
        render,
        useHooks,
      };

      registry.register(override);
      const retrieved = registry.get('users.list');

      expect(retrieved).toEqual(override);
      expect(retrieved?.component).toBe(component);
      expect(retrieved?.render).toBe(render);
      expect(retrieved?.useHooks).toBe(useHooks);
    });
  });
});

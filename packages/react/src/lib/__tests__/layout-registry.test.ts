import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LayoutRegistry, type LayoutStrategy } from '../layout-registry';
import type { LayoutType, LayoutMetadata } from '@uigen-dev/core';

describe('LayoutRegistry', () => {
  let registry: LayoutRegistry;

  // Mock strategy factory
  const createMockStrategy = (type: LayoutType): LayoutStrategy => ({
    type,
    render: vi.fn((children) => children),
    validate: vi.fn(() => true),
    getDefaults: vi.fn(() => ({})),
  });

  beforeEach(() => {
    // Get fresh instance and clear it
    registry = LayoutRegistry.getInstance();
    registry.clear();
  });

  describe('getInstance', () => {
    it('should return a singleton instance', () => {
      const instance1 = LayoutRegistry.getInstance();
      const instance2 = LayoutRegistry.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should return the same instance after clearing', () => {
      const instance1 = LayoutRegistry.getInstance();
      instance1.clear();
      const instance2 = LayoutRegistry.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('register', () => {
    it('should register a new strategy', () => {
      const strategy = createMockStrategy('sidebar');
      
      registry.register(strategy);
      
      const retrieved = registry.get('sidebar');
      expect(retrieved).toBe(strategy);
    });

    it('should register multiple strategies', () => {
      const sidebarStrategy = createMockStrategy('sidebar');
      const centeredStrategy = createMockStrategy('centered');
      const dashboardStrategy = createMockStrategy('dashboard-grid');
      
      registry.register(sidebarStrategy);
      registry.register(centeredStrategy);
      registry.register(dashboardStrategy);
      
      expect(registry.get('sidebar')).toBe(sidebarStrategy);
      expect(registry.get('centered')).toBe(centeredStrategy);
      expect(registry.get('dashboard-grid')).toBe(dashboardStrategy);
    });

    it('should overwrite existing strategy with warning', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const strategy1 = createMockStrategy('sidebar');
      const strategy2 = createMockStrategy('sidebar');
      
      registry.register(strategy1);
      registry.register(strategy2);
      
      expect(registry.get('sidebar')).toBe(strategy2);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[LayoutRegistry] Strategy "sidebar" already registered. Overwriting.'
      );
      
      consoleWarnSpy.mockRestore();
    });

    it('should register custom layout types', () => {
      const customStrategy = createMockStrategy('custom-layout' as LayoutType);
      
      registry.register(customStrategy);
      
      expect(registry.get('custom-layout' as LayoutType)).toBe(customStrategy);
    });
  });

  describe('get', () => {
    it('should retrieve a registered strategy', () => {
      const strategy = createMockStrategy('sidebar');
      registry.register(strategy);
      
      const retrieved = registry.get('sidebar');
      
      expect(retrieved).toBe(strategy);
    });

    it('should fall back to default strategy when type not found', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const sidebarStrategy = createMockStrategy('sidebar');
      registry.register(sidebarStrategy);
      registry.setDefault('sidebar');
      
      const retrieved = registry.get('nonexistent' as LayoutType);
      
      expect(retrieved).toBe(sidebarStrategy);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[LayoutRegistry] Layout strategy "nonexistent" not found. Falling back to "sidebar".'
      );
      
      consoleErrorSpy.mockRestore();
    });

    it('should throw error when default strategy is not registered', () => {
      expect(() => {
        registry.get('nonexistent' as LayoutType);
      }).toThrow('[LayoutRegistry] Default layout strategy "sidebar" not registered');
    });

    it('should throw error when requested type and default are both missing', () => {
      const centeredStrategy = createMockStrategy('centered');
      registry.register(centeredStrategy);
      // Default is still 'sidebar' but not registered
      
      expect(() => {
        registry.get('dashboard-grid');
      }).toThrow('[LayoutRegistry] Default layout strategy "sidebar" not registered');
    });
  });

  describe('setDefault', () => {
    it('should set a new default layout type', () => {
      const sidebarStrategy = createMockStrategy('sidebar');
      const centeredStrategy = createMockStrategy('centered');
      
      registry.register(sidebarStrategy);
      registry.register(centeredStrategy);
      
      registry.setDefault('centered');
      
      // Verify by requesting a non-existent type
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const fallback = registry.get('nonexistent' as LayoutType);
      
      expect(fallback).toBe(centeredStrategy);
      
      consoleErrorSpy.mockRestore();
    });

    it('should throw error when setting default to unregistered type', () => {
      expect(() => {
        registry.setDefault('nonexistent' as LayoutType);
      }).toThrow('[LayoutRegistry] Cannot set default to unregistered type "nonexistent"');
    });

    it('should allow setting default to custom layout type', () => {
      const customStrategy = createMockStrategy('custom-layout' as LayoutType);
      registry.register(customStrategy);
      
      registry.setDefault('custom-layout' as LayoutType);
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const fallback = registry.get('nonexistent' as LayoutType);
      
      expect(fallback).toBe(customStrategy);
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getRegisteredTypes', () => {
    it('should return empty array when no strategies registered', () => {
      const types = registry.getRegisteredTypes();
      
      expect(types).toEqual([]);
    });

    it('should return all registered strategy types', () => {
      const sidebarStrategy = createMockStrategy('sidebar');
      const centeredStrategy = createMockStrategy('centered');
      const dashboardStrategy = createMockStrategy('dashboard-grid');
      
      registry.register(sidebarStrategy);
      registry.register(centeredStrategy);
      registry.register(dashboardStrategy);
      
      const types = registry.getRegisteredTypes();
      
      expect(types).toHaveLength(3);
      expect(types).toContain('sidebar');
      expect(types).toContain('centered');
      expect(types).toContain('dashboard-grid');
    });

    it('should return types in insertion order', () => {
      const strategy1 = createMockStrategy('centered');
      const strategy2 = createMockStrategy('sidebar');
      const strategy3 = createMockStrategy('dashboard-grid');
      
      registry.register(strategy1);
      registry.register(strategy2);
      registry.register(strategy3);
      
      const types = registry.getRegisteredTypes();
      
      expect(types).toEqual(['centered', 'sidebar', 'dashboard-grid']);
    });

    it('should include custom layout types', () => {
      const sidebarStrategy = createMockStrategy('sidebar');
      const customStrategy = createMockStrategy('custom-layout' as LayoutType);
      
      registry.register(sidebarStrategy);
      registry.register(customStrategy);
      
      const types = registry.getRegisteredTypes();
      
      expect(types).toContain('sidebar');
      expect(types).toContain('custom-layout');
    });
  });

  describe('clear', () => {
    it('should remove all registered strategies', () => {
      const sidebarStrategy = createMockStrategy('sidebar');
      const centeredStrategy = createMockStrategy('centered');
      
      registry.register(sidebarStrategy);
      registry.register(centeredStrategy);
      
      registry.clear();
      
      expect(registry.getRegisteredTypes()).toEqual([]);
    });

    it('should allow re-registration after clearing', () => {
      const strategy1 = createMockStrategy('sidebar');
      registry.register(strategy1);
      
      registry.clear();
      
      const strategy2 = createMockStrategy('sidebar');
      registry.register(strategy2);
      
      expect(registry.get('sidebar')).toBe(strategy2);
    });

    it('should not affect singleton instance', () => {
      const instance1 = LayoutRegistry.getInstance();
      instance1.clear();
      const instance2 = LayoutRegistry.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('LayoutStrategy interface', () => {
    it('should have correct method signatures', () => {
      const strategy = createMockStrategy('sidebar');
      
      expect(strategy.type).toBe('sidebar');
      expect(typeof strategy.render).toBe('function');
      expect(typeof strategy.validate).toBe('function');
      expect(typeof strategy.getDefaults).toBe('function');
    });

    it('should call render method with children and metadata', () => {
      const strategy = createMockStrategy('sidebar');
      const children = 'test content';
      const metadata: LayoutMetadata = { sidebarWidth: 250 };
      
      registry.register(strategy);
      const retrieved = registry.get('sidebar');
      
      retrieved.render(children, metadata);
      
      expect(strategy.render).toHaveBeenCalledWith(children, metadata);
    });

    it('should call validate method with metadata', () => {
      const strategy = createMockStrategy('sidebar');
      const metadata: LayoutMetadata = { sidebarWidth: 250 };
      
      registry.register(strategy);
      const retrieved = registry.get('sidebar');
      
      retrieved.validate(metadata);
      
      expect(strategy.validate).toHaveBeenCalledWith(metadata);
    });

    it('should call getDefaults method', () => {
      const strategy = createMockStrategy('sidebar');
      
      registry.register(strategy);
      const retrieved = registry.get('sidebar');
      
      retrieved.getDefaults();
      
      expect(strategy.getDefaults).toHaveBeenCalled();
    });
  });
});

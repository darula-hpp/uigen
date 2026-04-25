/**
 * Tests for the plugin registry
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { pluginRegistry } from '../plugin-registry.js';
import type { UIGenPlugin, PluginContext } from '../../types/plugins.js';

describe('PluginRegistry', () => {
  // Mock plugin
  let mockPlugin: UIGenPlugin;
  
  // Mock context
  const mockContext: PluginContext = {
    state: {
      config: null,
      handlers: [],
      annotations: [],
      isLoading: false,
      error: null,
      configPath: '.uigen/config.yaml',
      specPath: null,
      specStructure: null
    },
    actions: {
      loadConfig: vi.fn(),
      saveConfig: vi.fn(),
      saveConfigImmediate: vi.fn(),
      updateConfig: vi.fn(),
      setError: vi.fn(),
      clearError: vi.fn()
    }
  };
  
  beforeEach(async () => {
    await pluginRegistry.clear();
    
    // Create fresh mock plugin for each test
    mockPlugin = {
      name: 'test-plugin',
      version: '1.0.0',
      description: 'Test plugin',
      onInit: vi.fn(),
      onDestroy: vi.fn(),
      components: {
        customTabs: [
          {
            id: 'test-tab',
            label: 'Test Tab',
            component: () => null,
            order: 1
          }
        ]
      }
    };
  });
  
  afterEach(async () => {
    await pluginRegistry.clear();
  });
  
  describe('register', () => {
    it('should register a plugin', () => {
      pluginRegistry.register(mockPlugin);
      
      expect(pluginRegistry.has('test-plugin')).toBe(true);
      expect(pluginRegistry.get('test-plugin')).toBe(mockPlugin);
    });
    
    it('should throw error if plugin already registered', () => {
      pluginRegistry.register(mockPlugin);
      
      expect(() => pluginRegistry.register(mockPlugin)).toThrow(
        'Plugin "test-plugin" is already registered'
      );
    });
  });
  
  describe('unregister', () => {
    it('should unregister a plugin', async () => {
      pluginRegistry.register(mockPlugin);
      
      const result = await pluginRegistry.unregister('test-plugin');
      
      expect(result).toBe(true);
      expect(pluginRegistry.has('test-plugin')).toBe(false);
    });
    
    it('should call onDestroy hook', async () => {
      pluginRegistry.register(mockPlugin);
      
      await pluginRegistry.unregister('test-plugin');
      
      expect(mockPlugin.onDestroy).toHaveBeenCalled();
    });
    
    it('should return false if plugin not found', async () => {
      const result = await pluginRegistry.unregister('non-existent');
      
      expect(result).toBe(false);
    });
  });
  
  describe('getAll', () => {
    it('should return all registered plugins', () => {
      const plugin2: UIGenPlugin = {
        name: 'test-plugin-2',
        version: '1.0.0'
      };
      
      pluginRegistry.register(mockPlugin);
      pluginRegistry.register(plugin2);
      
      const plugins = pluginRegistry.getAll();
      
      expect(plugins).toHaveLength(2);
      expect(plugins).toContain(mockPlugin);
      expect(plugins).toContain(plugin2);
    });
    
    it('should return empty array if no plugins', () => {
      const plugins = pluginRegistry.getAll();
      
      expect(plugins).toEqual([]);
    });
  });
  
  describe('getComponents', () => {
    it('should return components from all plugins', () => {
      pluginRegistry.register(mockPlugin);
      
      const tabs = pluginRegistry.getComponents('customTabs');
      
      expect(tabs).toHaveLength(1);
      expect(tabs[0]).toBe(mockPlugin.components?.customTabs);
    });
    
    it('should filter out undefined components', () => {
      const pluginWithoutTabs: UIGenPlugin = {
        name: 'no-tabs',
        version: '1.0.0'
      };
      
      pluginRegistry.register(mockPlugin);
      pluginRegistry.register(pluginWithoutTabs);
      
      const tabs = pluginRegistry.getComponents('customTabs');
      
      expect(tabs).toHaveLength(1);
    });
  });
  
  describe('getCustomTabs', () => {
    it('should return custom tabs sorted by order', () => {
      const plugin2: UIGenPlugin = {
        name: 'plugin-2',
        version: '1.0.0',
        components: {
          customTabs: [
            {
              id: 'tab-2',
              label: 'Tab 2',
              component: () => null,
              order: 2
            }
          ]
        }
      };
      
      pluginRegistry.register(mockPlugin);
      pluginRegistry.register(plugin2);
      
      const tabs = pluginRegistry.getCustomTabs();
      
      expect(tabs).toHaveLength(2);
      expect(tabs[0].id).toBe('test-tab');
      expect(tabs[1].id).toBe('tab-2');
    });
    
    it('should sort by label if order is same', () => {
      const plugin2: UIGenPlugin = {
        name: 'plugin-2',
        version: '1.0.0',
        components: {
          customTabs: [
            {
              id: 'tab-a',
              label: 'A Tab',
              component: () => null,
              order: 1
            }
          ]
        }
      };
      
      pluginRegistry.register(mockPlugin);
      pluginRegistry.register(plugin2);
      
      const tabs = pluginRegistry.getCustomTabs();
      
      expect(tabs[0].label).toBe('A Tab');
      expect(tabs[1].label).toBe('Test Tab');
    });
  });
  
  describe('initialize', () => {
    it('should call onInit on all plugins', async () => {
      pluginRegistry.register(mockPlugin);
      
      await pluginRegistry.initialize(mockContext);
      
      expect(mockPlugin.onInit).toHaveBeenCalledWith(mockContext);
    });
    
    it('should not initialize twice', async () => {
      pluginRegistry.register(mockPlugin);
      
      await pluginRegistry.initialize(mockContext);
      await pluginRegistry.initialize(mockContext);
      
      expect(mockPlugin.onInit).toHaveBeenCalledTimes(1);
    });
    
    it('should handle plugin initialization errors', async () => {
      const errorPlugin: UIGenPlugin = {
        name: 'error-plugin',
        version: '1.0.0',
        onInit: vi.fn().mockRejectedValue(new Error('Init failed'))
      };
      
      pluginRegistry.register(errorPlugin);
      
      // Should not throw
      await expect(pluginRegistry.initialize(mockContext)).resolves.not.toThrow();
    });
  });
  
  describe('executeConfigLoadHooks', () => {
    it('should execute onConfigLoad on all plugins', async () => {
      const config = { version: '1.0', enabled: {}, defaults: {}, annotations: {} };
      const pluginWithHook: UIGenPlugin = {
        name: 'hook-plugin',
        version: '1.0.0',
        onConfigLoad: vi.fn().mockResolvedValue(config)
      };
      
      pluginRegistry.register(pluginWithHook);
      
      await pluginRegistry.executeConfigLoadHooks(config, mockContext);
      
      expect(pluginWithHook.onConfigLoad).toHaveBeenCalledWith(config, mockContext);
    });
    
    it('should chain config modifications', async () => {
      const config = { version: '1.0', enabled: {}, defaults: {}, annotations: {} };
      
      const plugin1: UIGenPlugin = {
        name: 'plugin-1',
        version: '1.0.0',
        onConfigLoad: async (cfg) => ({ ...cfg, metadata: { plugin1: true } })
      };
      
      const plugin2: UIGenPlugin = {
        name: 'plugin-2',
        version: '1.0.0',
        onConfigLoad: async (cfg) => ({ ...cfg, metadata: { ...cfg.metadata, plugin2: true } })
      };
      
      pluginRegistry.register(plugin1);
      pluginRegistry.register(plugin2);
      
      const result = await pluginRegistry.executeConfigLoadHooks(config, mockContext);
      
      expect(result.metadata).toEqual({ plugin1: true, plugin2: true });
    });
  });
  
  describe('getStats', () => {
    it('should return registry statistics', () => {
      pluginRegistry.register(mockPlugin);
      
      const stats = pluginRegistry.getStats();
      
      expect(stats.totalPlugins).toBe(1);
      expect(stats.plugins).toHaveLength(1);
      expect(stats.plugins[0].name).toBe('test-plugin');
      expect(stats.plugins[0].customTabsCount).toBe(1);
    });
  });
  
  describe('event listeners', () => {
    it('should emit plugin:registered event', () => {
      const listener = vi.fn();
      pluginRegistry.addEventListener(listener);
      
      pluginRegistry.register(mockPlugin);
      
      expect(listener).toHaveBeenCalledWith({
        type: 'plugin:registered',
        plugin: mockPlugin
      });
    });
    
    it('should emit plugin:unregistered event', async () => {
      const listener = vi.fn();
      pluginRegistry.register(mockPlugin);
      pluginRegistry.addEventListener(listener);
      
      await pluginRegistry.unregister('test-plugin');
      
      expect(listener).toHaveBeenCalledWith({
        type: 'plugin:unregistered',
        pluginName: 'test-plugin'
      });
    });
    
    it('should remove event listener', () => {
      const listener = vi.fn();
      pluginRegistry.addEventListener(listener);
      pluginRegistry.removeEventListener(listener);
      
      pluginRegistry.register(mockPlugin);
      
      expect(listener).not.toHaveBeenCalled();
    });
  });
});

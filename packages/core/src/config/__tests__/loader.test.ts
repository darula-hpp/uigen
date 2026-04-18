import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { ConfigLoader } from '../loader.js';
import { AnnotationHandlerRegistry } from '../../adapter/annotations/registry.js';
import type { AnnotationHandler, AnnotationContext } from '../../adapter/annotations/types.js';

// Mock handler for testing
class MockHandler implements AnnotationHandler {
  constructor(public readonly name: string) {}
  
  extract(_context: AnnotationContext): any {
    return undefined;
  }
  
  validate(_value: any): boolean {
    return true;
  }
  
  apply(_value: any, _context: AnnotationContext): void {
    // No-op
  }
}

describe('ConfigLoader', () => {
  const testConfigDir = '.uigen-test';
  const testConfigPath = `${testConfigDir}/config.yaml`;
  
  beforeEach(() => {
    // Clean up test directory
    if (existsSync(testConfigDir)) {
      rmSync(testConfigDir, { recursive: true, force: true });
    }
  });
  
  afterEach(() => {
    // Clean up test directory
    if (existsSync(testConfigDir)) {
      rmSync(testConfigDir, { recursive: true, force: true });
    }
  });
  
  describe('load()', () => {
    it('should return null when config file does not exist', () => {
      const loader = new ConfigLoader({ configPath: testConfigPath });
      const config = loader.load();
      
      expect(config).toBeNull();
    });
    
    it('should load valid config file', () => {
      // Create test config
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: "1.0"
enabled:
  x-uigen-label: true
  x-uigen-ref: false
defaults:
  x-uigen-label:
    color: blue
annotations:
  User.email:
    x-uigen-label: "Email Address"
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      const config = loader.load();
      
      expect(config).not.toBeNull();
      expect(config?.version).toBe('1.0');
      expect(config?.enabled['x-uigen-label']).toBe(true);
      expect(config?.enabled['x-uigen-ref']).toBe(false);
      expect(config?.defaults['x-uigen-label']).toEqual({ color: 'blue' });
      expect(config?.annotations['User.email']).toEqual({ 'x-uigen-label': 'Email Address' });
    });
    
    it('should handle missing version field with warning', () => {
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
enabled:
  x-uigen-label: true
defaults: {}
annotations: {}
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      const config = loader.load();
      
      expect(config).not.toBeNull();
      expect(config?.version).toBe('1.0');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('missing version field')
      );
      
      consoleWarnSpy.mockRestore();
    });
    
    it('should handle missing enabled field with warning', () => {
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: "1.0"
defaults: {}
annotations: {}
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      const config = loader.load();
      
      expect(config).not.toBeNull();
      expect(config?.enabled).toEqual({});
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('missing or invalid "enabled" field')
      );
      
      consoleWarnSpy.mockRestore();
    });
    
    it('should throw error for malformed YAML', () => {
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: "1.0"
enabled:
  x-uigen-label: true
  invalid yaml here: [unclosed bracket
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      
      expect(() => loader.load()).toThrow('Failed to load config file');
    });
    
    it('should throw error for non-object YAML', () => {
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = 'just a string';
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      
      expect(() => loader.load()).toThrow('must contain a valid YAML object');
    });
  });
  
  describe('applyToRegistry()', () => {
    it('should warn about unknown annotations in config', () => {
      const config = {
        version: '1.0',
        enabled: {
          'x-uigen-label': true,
          'x-uigen-unknown': false
        },
        defaults: {},
        annotations: {}
      };
      
      const registry = AnnotationHandlerRegistry.getInstance();
      registry.clear();
      registry.register(new MockHandler('x-uigen-label'));
      
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const loader = new ConfigLoader();
      loader.applyToRegistry(config, registry);
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('unknown annotation "x-uigen-unknown"')
      );
      
      consoleWarnSpy.mockRestore();
    });
    
    it('should warn about multiple unknown annotations in config', () => {
      const config = {
        version: '1.0',
        enabled: {
          'x-uigen-label': true,
          'x-uigen-unknown-1': false,
          'x-uigen-unknown-2': true
        },
        defaults: {
          'x-uigen-unknown-3': {
            param: 'value'
          }
        },
        annotations: {}
      };
      
      const registry = AnnotationHandlerRegistry.getInstance();
      registry.clear();
      registry.register(new MockHandler('x-uigen-label'));
      
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const loader = new ConfigLoader();
      loader.applyToRegistry(config, registry);
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('unknown annotation "x-uigen-unknown-1"')
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('unknown annotation "x-uigen-unknown-2"')
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('unknown annotation "x-uigen-unknown-3"')
      );
      
      consoleWarnSpy.mockRestore();
    });
    
    it('should log applied config in verbose mode', () => {
      const config = {
        version: '1.0',
        enabled: {
          'x-uigen-label': false,
          'x-uigen-ref': false
        },
        defaults: {
          'x-uigen-label': { color: 'blue' }
        },
        annotations: {}
      };
      
      const registry = AnnotationHandlerRegistry.getInstance();
      registry.clear();
      registry.register(new MockHandler('x-uigen-label'));
      registry.register(new MockHandler('x-uigen-ref'));
      
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const loader = new ConfigLoader({ verbose: true });
      loader.applyToRegistry(config, registry);
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('2 annotations disabled')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('1 with defaults')
      );
      
      consoleLogSpy.mockRestore();
    });
  });
  
  describe('getAnnotationConfig()', () => {
    it('should return undefined when no config loaded', () => {
      const loader = new ConfigLoader();
      const result = loader.getAnnotationConfig('User.email', 'x-uigen-label');
      
      expect(result).toBeUndefined();
    });
    
    it('should return undefined when annotation is disabled', () => {
      const config = {
        version: '1.0',
        enabled: {
          'x-uigen-label': false
        },
        defaults: {},
        annotations: {
          'User.email': {
            'x-uigen-label': 'Email Address'
          }
        }
      };
      
      const loader = new ConfigLoader();
      const registry = AnnotationHandlerRegistry.getInstance();
      loader.applyToRegistry(config, registry);
      
      const result = loader.getAnnotationConfig('User.email', 'x-uigen-label');
      
      expect(result).toBeUndefined();
    });
    
    it('should return element-specific config', () => {
      const config = {
        version: '1.0',
        enabled: {
          'x-uigen-label': true
        },
        defaults: {},
        annotations: {
          'User.email': {
            'x-uigen-label': 'Email Address'
          }
        }
      };
      
      const loader = new ConfigLoader();
      const registry = AnnotationHandlerRegistry.getInstance();
      loader.applyToRegistry(config, registry);
      
      const result = loader.getAnnotationConfig('User.email', 'x-uigen-label');
      
      expect(result).toBe('Email Address');
    });
    
    it('should return defaults when no element-specific config', () => {
      const config = {
        version: '1.0',
        enabled: {},
        defaults: {
          'x-uigen-label': {
            color: 'blue',
            size: 'large'
          }
        },
        annotations: {}
      };
      
      const loader = new ConfigLoader();
      const registry = AnnotationHandlerRegistry.getInstance();
      loader.applyToRegistry(config, registry);
      
      const result = loader.getAnnotationConfig('User.email', 'x-uigen-label');
      
      expect(result).toEqual({ color: 'blue', size: 'large' });
    });
    
    it('should merge defaults with element-specific config', () => {
      const config = {
        version: '1.0',
        enabled: {},
        defaults: {
          'x-uigen-ref': {
            valueField: 'id',
            labelField: 'name'
          }
        },
        annotations: {
          'User.role': {
            'x-uigen-ref': {
              resource: 'Role',
              labelField: 'title' // Override default
            }
          }
        }
      };
      
      const loader = new ConfigLoader();
      const registry = AnnotationHandlerRegistry.getInstance();
      loader.applyToRegistry(config, registry);
      
      const result = loader.getAnnotationConfig('User.role', 'x-uigen-ref');
      
      expect(result).toEqual({
        valueField: 'id',
        labelField: 'title', // Overridden
        resource: 'Role'
      });
    });
    
    it('should return undefined when no config exists for element', () => {
      const config = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {}
      };
      
      const loader = new ConfigLoader();
      const registry = AnnotationHandlerRegistry.getInstance();
      loader.applyToRegistry(config, registry);
      
      const result = loader.getAnnotationConfig('User.email', 'x-uigen-label');
      
      expect(result).toBeUndefined();
    });
    
    it('should handle non-object element config', () => {
      const config = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          'InternalLog': {
            'x-uigen-ignore': true
          }
        }
      };
      
      const loader = new ConfigLoader();
      const registry = AnnotationHandlerRegistry.getInstance();
      loader.applyToRegistry(config, registry);
      
      const result = loader.getAnnotationConfig('InternalLog', 'x-uigen-ignore');
      
      expect(result).toBe(true);
    });
  });
  
  describe('isAnnotationDisabled()', () => {
    it('should return false when no config loaded', () => {
      const loader = new ConfigLoader();
      const result = loader.isAnnotationDisabled('x-uigen-label');
      
      expect(result).toBe(false);
    });
    
    it('should return true when annotation is explicitly disabled', () => {
      const config = {
        version: '1.0',
        enabled: {
          'x-uigen-label': false
        },
        defaults: {},
        annotations: {}
      };
      
      const loader = new ConfigLoader();
      const registry = AnnotationHandlerRegistry.getInstance();
      loader.applyToRegistry(config, registry);
      
      const result = loader.isAnnotationDisabled('x-uigen-label');
      
      expect(result).toBe(true);
    });
    
    it('should return false when annotation is explicitly enabled', () => {
      const config = {
        version: '1.0',
        enabled: {
          'x-uigen-label': true
        },
        defaults: {},
        annotations: {}
      };
      
      const loader = new ConfigLoader();
      const registry = AnnotationHandlerRegistry.getInstance();
      loader.applyToRegistry(config, registry);
      
      const result = loader.isAnnotationDisabled('x-uigen-label');
      
      expect(result).toBe(false);
    });
    
    it('should return false when annotation is not in config', () => {
      const config = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {}
      };
      
      const loader = new ConfigLoader();
      const registry = AnnotationHandlerRegistry.getInstance();
      loader.applyToRegistry(config, registry);
      
      const result = loader.isAnnotationDisabled('x-uigen-label');
      
      expect(result).toBe(false);
    });
  });
});

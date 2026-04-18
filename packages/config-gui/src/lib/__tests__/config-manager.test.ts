import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConfigManager } from '../config-manager.js';
import type { ConfigFile } from '@uigen-dev/core';

// Mock fetch globally
global.fetch = vi.fn();

describe('ConfigManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  describe('read()', () => {
    it('should return null when config file does not exist (404)', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });
      
      const manager = new ConfigManager();
      const result = await manager.read();
      
      expect(result).toBeNull();
      expect(global.fetch).toHaveBeenCalledWith('/api/config', {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
    });
    
    it('should read and parse valid config file', async () => {
      const mockConfig: ConfigFile = {
        version: '1.0',
        enabled: {
          'x-uigen-label': true,
          'x-uigen-ref': true
        },
        defaults: {
          'x-uigen-label': {}
        },
        annotations: {
          'User.email': {
            'x-uigen-label': 'Email Address'
          }
        }
      };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockConfig
      });
      
      const manager = new ConfigManager();
      const result = await manager.read();
      
      expect(result).toEqual(mockConfig);
    });
    
    it('should handle missing version field with warning', async () => {
      const mockConfig = {
        enabled: {},
        defaults: {},
        annotations: {}
      };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockConfig
      });
      
      const manager = new ConfigManager();
      const result = await manager.read();
      
      expect(result).not.toBeNull();
      expect(result?.version).toBe('1.0');
    });
    
    it('should throw error for API failure', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });
      
      const manager = new ConfigManager();
      
      await expect(manager.read()).rejects.toThrow('Failed to read config file');
    });
    
    it('should throw error for network failure', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));
      
      const manager = new ConfigManager();
      
      await expect(manager.read()).rejects.toThrow('Failed to read config file');
    });
  });
  
  describe('write()', () => {
    it('should write valid config file', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true })
      });
      
      const manager = new ConfigManager();
      const config: ConfigFile = {
        version: '1.0',
        enabled: {
          'x-uigen-label': true,
          'x-uigen-ref': false
        },
        defaults: {
          'x-uigen-label': {}
        },
        annotations: {
          'User.email': {
            'x-uigen-label': 'Email Address'
          }
        }
      };
      
      await manager.write(config);
      
      expect(global.fetch).toHaveBeenCalledWith('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });
    });
    
    it('should throw error for invalid config', async () => {
      const manager = new ConfigManager();
      const invalidConfig = {
        version: '1.0',
        enabled: 'not an object', // Invalid
        defaults: {},
        annotations: {}
      } as unknown as ConfigFile;
      
      await expect(manager.write(invalidConfig)).rejects.toThrow('Config validation failed');
      
      // Should not call API for invalid config
      expect(global.fetch).not.toHaveBeenCalled();
    });
    
    it('should throw error for API failure', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' })
      });
      
      const manager = new ConfigManager();
      const config: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {}
      };
      
      await expect(manager.write(config)).rejects.toThrow('Failed to write config file');
    });
    
    it('should throw error for network failure', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));
      
      const manager = new ConfigManager();
      const config: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {}
      };
      
      await expect(manager.write(config)).rejects.toThrow('Failed to write config file');
    });
  });
  
  describe('validate()', () => {
    it('should validate correct config', () => {
      const manager = new ConfigManager();
      const config: ConfigFile = {
        version: '1.0',
        enabled: {
          'x-uigen-label': true
        },
        defaults: {
          'x-uigen-label': {}
        },
        annotations: {
          'User.email': {
            'x-uigen-label': 'Email'
          }
        }
      };
      
      const result = manager.validate(config);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should reject missing version', () => {
      const manager = new ConfigManager();
      const config = {
        enabled: {},
        defaults: {},
        annotations: {}
      } as unknown as ConfigFile;
      
      const result = manager.validate(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: 'version',
          message: 'Version must be a string'
        })
      );
    });
    
    it('should reject non-object enabled field', () => {
      const manager = new ConfigManager();
      const config = {
        version: '1.0',
        enabled: 'not an object',
        defaults: {},
        annotations: {}
      } as unknown as ConfigFile;
      
      const result = manager.validate(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: 'enabled',
          message: 'Enabled must be an object'
        })
      );
    });
    
    it('should reject non-boolean enabled values', () => {
      const manager = new ConfigManager();
      const config = {
        version: '1.0',
        enabled: {
          'x-uigen-label': 'yes' // Should be boolean
        },
        defaults: {},
        annotations: {}
      } as unknown as ConfigFile;
      
      const result = manager.validate(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: 'enabled.x-uigen-label',
          message: 'Enabled values must be boolean'
        })
      );
    });
    
    it('should reject non-object defaults field', () => {
      const manager = new ConfigManager();
      const config = {
        version: '1.0',
        enabled: {},
        defaults: [],
        annotations: {}
      } as unknown as ConfigFile;
      
      const result = manager.validate(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: 'defaults',
          message: 'Defaults must be an object'
        })
      );
    });
    
    it('should reject non-object default values', () => {
      const manager = new ConfigManager();
      const config = {
        version: '1.0',
        enabled: {},
        defaults: {
          'x-uigen-label': 'not an object'
        },
        annotations: {}
      } as unknown as ConfigFile;
      
      const result = manager.validate(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: 'defaults.x-uigen-label',
          message: 'Default values must be objects'
        })
      );
    });
    
    it('should reject non-object annotations field', () => {
      const manager = new ConfigManager();
      const config = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: 'not an object'
      } as unknown as ConfigFile;
      
      const result = manager.validate(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: 'annotations',
          message: 'Annotations must be an object'
        })
      );
    });
    
    it('should reject non-object annotation configurations', () => {
      const manager = new ConfigManager();
      const config = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          'User.email': 'not an object'
        }
      } as unknown as ConfigFile;
      
      const result = manager.validate(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: 'annotations.User.email',
          message: 'Annotation configurations must be objects'
        })
      );
    });
    
    it('should collect multiple validation errors', () => {
      const manager = new ConfigManager();
      const config = {
        version: 123, // Should be string
        enabled: 'invalid', // Should be object
        defaults: {},
        annotations: {}
      } as unknown as ConfigFile;
      
      const result = manager.validate(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });
  });
});

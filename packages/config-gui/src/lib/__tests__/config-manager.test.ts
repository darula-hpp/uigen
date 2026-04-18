import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ConfigManager } from '../config-manager.js';
import type { ConfigFile } from '@uigen-dev/core';

describe('ConfigManager', () => {
  const testConfigDir = resolve(process.cwd(), '.test-config');
  const testConfigPath = resolve(testConfigDir, 'config.yaml');
  
  beforeEach(() => {
    // Clean up test directory before each test
    if (existsSync(testConfigDir)) {
      rmSync(testConfigDir, { recursive: true, force: true });
    }
  });
  
  afterEach(() => {
    // Clean up test directory after each test
    if (existsSync(testConfigDir)) {
      rmSync(testConfigDir, { recursive: true, force: true });
    }
  });
  
  describe('read()', () => {
    it('should return null when config file does not exist', () => {
      const manager = new ConfigManager({ configPath: testConfigPath });
      const result = manager.read();
      
      expect(result).toBeNull();
    });
    
    it('should read and parse valid config file', () => {
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: "1.0"
enabled:
  x-uigen-label: true
  x-uigen-ref: true
defaults:
  x-uigen-label: {}
annotations:
  "User.email":
    x-uigen-label: "Email Address"
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const manager = new ConfigManager({ configPath: testConfigPath });
      const result = manager.read();
      
      expect(result).not.toBeNull();
      expect(result?.version).toBe('1.0');
      expect(result?.enabled['x-uigen-label']).toBe(true);
      expect(result?.annotations['User.email']['x-uigen-label']).toBe('Email Address');
    });
    
    it('should handle missing version field with warning', () => {
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
enabled: {}
defaults: {}
annotations: {}
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const manager = new ConfigManager({ configPath: testConfigPath });
      const result = manager.read();
      
      expect(result).not.toBeNull();
      expect(result?.version).toBe('1.0');
    });
    
    it('should throw error for malformed YAML', () => {
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: "1.0"
enabled:
  invalid yaml here: [unclosed bracket
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const manager = new ConfigManager({ configPath: testConfigPath });
      
      expect(() => manager.read()).toThrow('Failed to read config file');
    });
    
    it('should throw error for non-object YAML', () => {
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = 'just a string';
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const manager = new ConfigManager({ configPath: testConfigPath });
      
      expect(() => manager.read()).toThrow('Config file must contain a valid YAML object');
    });
  });
  
  describe('write()', () => {
    it('should write valid config file', () => {
      const manager = new ConfigManager({ configPath: testConfigPath });
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
      
      manager.write(config);
      
      expect(existsSync(testConfigPath)).toBe(true);
      
      // Verify content
      const written = manager.read();
      expect(written).toEqual(config);
    });
    
    it('should create parent directory if it does not exist', () => {
      const manager = new ConfigManager({ configPath: testConfigPath });
      const config: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {}
      };
      
      expect(existsSync(testConfigDir)).toBe(false);
      
      manager.write(config);
      
      expect(existsSync(testConfigDir)).toBe(true);
      expect(existsSync(testConfigPath)).toBe(true);
    });
    
    it('should write atomically using temp file', () => {
      mkdirSync(testConfigDir, { recursive: true });
      const manager = new ConfigManager({ configPath: testConfigPath });
      const config: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {}
      };
      
      manager.write(config);
      
      // Temp file should not exist after successful write
      const tempPath = `${testConfigPath}.tmp`;
      expect(existsSync(tempPath)).toBe(false);
      
      // Config file should exist
      expect(existsSync(testConfigPath)).toBe(true);
    });
    
    it('should throw error for invalid config', () => {
      const manager = new ConfigManager({ configPath: testConfigPath });
      const invalidConfig = {
        version: '1.0',
        enabled: 'not an object', // Invalid
        defaults: {},
        annotations: {}
      } as unknown as ConfigFile;
      
      expect(() => manager.write(invalidConfig)).toThrow('Config validation failed');
    });
    
    it('should overwrite existing config file', () => {
      mkdirSync(testConfigDir, { recursive: true });
      const manager = new ConfigManager({ configPath: testConfigPath });
      
      const config1: ConfigFile = {
        version: '1.0',
        enabled: { 'x-uigen-label': true },
        defaults: {},
        annotations: {}
      };
      
      manager.write(config1);
      const read1 = manager.read();
      expect(read1?.enabled['x-uigen-label']).toBe(true);
      
      const config2: ConfigFile = {
        version: '1.0',
        enabled: { 'x-uigen-label': false },
        defaults: {},
        annotations: {}
      };
      
      manager.write(config2);
      const read2 = manager.read();
      expect(read2?.enabled['x-uigen-label']).toBe(false);
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
  
  describe('round-trip correctness', () => {
    it('should preserve config structure on read-write cycle', () => {
      const manager = new ConfigManager({ configPath: testConfigPath });
      const originalConfig: ConfigFile = {
        version: '1.0',
        enabled: {
          'x-uigen-label': true,
          'x-uigen-ref': false,
          'x-uigen-ignore': true
        },
        defaults: {
          'x-uigen-label': {},
          'x-uigen-ref': {
            valueField: 'id',
            labelField: 'name'
          }
        },
        annotations: {
          'User.email': {
            'x-uigen-label': 'Email Address'
          },
          'User.role': {
            'x-uigen-ref': {
              resource: 'Role',
              valueField: 'id',
              labelField: 'name'
            }
          }
        }
      };
      
      // Write original config
      manager.write(originalConfig);
      
      // Read it back
      const readConfig = manager.read();
      
      // Should be deeply equal
      expect(readConfig).toEqual(originalConfig);
    });
  });
});

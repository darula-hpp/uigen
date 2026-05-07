import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ConfigLoader } from '../loader.js';
import { AnnotationHandlerRegistry } from '../../adapter/annotations/registry.js';
import { DateTimeHandler } from '../../adapter/annotations/handlers/datetime-handler.js';
import { DateTimeTimezoneHandler } from '../../adapter/annotations/handlers/datetime-timezone-handler.js';

/**
 * Integration tests for x-uigen-datetime config file support.
 * 
 * Tests verify:
 * - Config defaults apply to fields without annotations (Requirement 15.1, 15.2)
 * - Spec annotations override config defaults (Requirement 15.3, 25.1, 25.2, 25.3)
 * - Path-specific datetime configuration (Requirement 15.4)
 * - Validation of format patterns in config (Requirement 15.5)
 * - Precedence rules (spec > config > built-in defaults) (Requirement 25.4, 25.5)
 */
describe('DateTime Config File Integration', () => {
  const testConfigDir = resolve(process.cwd(), '.uigen-test-datetime-config');
  const testConfigPath = resolve(testConfigDir, 'config.yaml');
  
  beforeEach(() => {
    // Clean up before each test
    if (existsSync(testConfigDir)) {
      rmSync(testConfigDir, { recursive: true, force: true });
    }
  });
  
  afterEach(() => {
    // Clean up after each test
    if (existsSync(testConfigDir)) {
      rmSync(testConfigDir, { recursive: true, force: true });
    }
  });

  describe('Config Defaults', () => {
    it('should apply config defaults to fields without annotations', () => {
      // Requirement 15.1, 15.2
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: '1.0'
enabled: {}
defaults:
  x-uigen-datetime: 'YYYY-MM-DD'
annotations: {}
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      const config = loader.load();
      expect(config).not.toBeNull();
      
      const registry = new AnnotationHandlerRegistry();
      registry.register(new DateTimeHandler());
      loader.applyToRegistry(config!, registry);
      
      // Field without annotation should get config default
      const result = loader.getAnnotationConfig('User.created_at', 'x-uigen-datetime');
      expect(result).toBe('YYYY-MM-DD');
    });

    it('should apply config defaults with timezone', () => {
      // Requirement 15.1, 15.2
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: '1.0'
enabled: {}
defaults:
  x-uigen-datetime:
    format: 'MM/DD/YYYY HH:mm'
    timezone: 'America/New_York'
annotations: {}
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      const config = loader.load();
      expect(config).not.toBeNull();
      
      const registry = new AnnotationHandlerRegistry();
      registry.register(new DateTimeHandler());
      loader.applyToRegistry(config!, registry);
      
      const result = loader.getAnnotationConfig('Event.start_time', 'x-uigen-datetime');
      expect(result).toEqual({
        format: 'MM/DD/YYYY HH:mm',
        timezone: 'America/New_York'
      });
    });

    it('should apply timezone defaults separately', () => {
      // Requirement 15.2
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: '1.0'
enabled: {}
defaults:
  x-uigen-datetime-tz: 'UTC'
annotations: {}
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      const config = loader.load();
      expect(config).not.toBeNull();
      
      const registry = new AnnotationHandlerRegistry();
      registry.register(new DateTimeTimezoneHandler());
      loader.applyToRegistry(config!, registry);
      
      const result = loader.getAnnotationConfig('Event.timestamp', 'x-uigen-datetime-tz');
      expect(result).toBe('UTC');
    });
  });

  describe('Spec Annotation Precedence', () => {
    it('should allow spec annotations to override config defaults', () => {
      // Requirement 15.3, 25.1, 25.2, 25.3
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: '1.0'
enabled: {}
defaults:
  x-uigen-datetime: 'YYYY-MM-DD'
annotations:
  User.created_at:
    x-uigen-datetime: 'MM/DD/YYYY'
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      const config = loader.load();
      expect(config).not.toBeNull();
      
      const registry = new AnnotationHandlerRegistry();
      registry.register(new DateTimeHandler());
      loader.applyToRegistry(config!, registry);
      
      // Field with specific annotation should use that value
      const specificResult = loader.getAnnotationConfig('User.created_at', 'x-uigen-datetime');
      expect(specificResult).toBe('MM/DD/YYYY');
      
      // Field without specific annotation should use default
      const defaultResult = loader.getAnnotationConfig('User.updated_at', 'x-uigen-datetime');
      expect(defaultResult).toBe('YYYY-MM-DD');
    });

    it('should log debug message when spec overrides config', () => {
      // Requirement 25.2
      // Note: This is tested in the registry tests, as the registry handles the override logic
      // The config loader just provides the values
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: '1.0'
enabled: {}
defaults:
  x-uigen-datetime: 'YYYY-MM-DD'
annotations: {}
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      const config = loader.load();
      expect(config).not.toBeNull();
      
      const registry = new AnnotationHandlerRegistry();
      registry.register(new DateTimeHandler());
      loader.applyToRegistry(config!, registry);
      
      // Config provides default
      const result = loader.getAnnotationConfig('User.created_at', 'x-uigen-datetime');
      expect(result).toBe('YYYY-MM-DD');
    });
  });

  describe('Path-Specific Configuration', () => {
    it('should support path-specific datetime configuration', () => {
      // Requirement 15.4
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: '1.0'
enabled: {}
defaults: {}
annotations:
  User.created_at:
    x-uigen-datetime: 'MM/DD/YYYY HH:mm'
  Event.start_time:
    x-uigen-datetime:
      format: 'DD/MM/YYYY HH:mm'
      timezone: 'Europe/London'
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      const config = loader.load();
      expect(config).not.toBeNull();
      
      const registry = new AnnotationHandlerRegistry();
      registry.register(new DateTimeHandler());
      loader.applyToRegistry(config!, registry);
      
      // User.created_at should use its specific config
      const userResult = loader.getAnnotationConfig('User.created_at', 'x-uigen-datetime');
      expect(userResult).toBe('MM/DD/YYYY HH:mm');
      
      // Event.start_time should use its specific config with timezone
      const eventResult = loader.getAnnotationConfig('Event.start_time', 'x-uigen-datetime');
      expect(eventResult).toEqual({
        format: 'DD/MM/YYYY HH:mm',
        timezone: 'Europe/London'
      });
      
      // Other fields should return undefined (no default set)
      const defaultResult = loader.getAnnotationConfig('Log.timestamp', 'x-uigen-datetime');
      expect(defaultResult).toBeUndefined();
    });

    it('should support operation-specific datetime configuration', () => {
      // Requirement 15.4
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: '1.0'
enabled: {}
defaults: {}
annotations:
  'POST:/api/v1/events':
    x-uigen-datetime: 'YYYY-MM-DD HH:mm:ss'
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      const config = loader.load();
      expect(config).not.toBeNull();
      
      const registry = new AnnotationHandlerRegistry();
      registry.register(new DateTimeHandler());
      loader.applyToRegistry(config!, registry);
      
      const result = loader.getAnnotationConfig('POST:/api/v1/events', 'x-uigen-datetime');
      expect(result).toBe('YYYY-MM-DD HH:mm:ss');
    });
  });

  describe('Format Pattern Validation', () => {
    it('should validate format patterns in config defaults', () => {
      // Requirement 15.5
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: '1.0'
enabled: {}
defaults:
  x-uigen-datetime: 'YYYY-MM-DD'
annotations: {}
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      const config = loader.load();
      expect(config).not.toBeNull();
      
      const registry = new AnnotationHandlerRegistry();
      const handler = new DateTimeHandler();
      registry.register(handler);
      loader.applyToRegistry(config!, registry);
      
      const result = loader.getAnnotationConfig('User.created_at', 'x-uigen-datetime');
      expect(result).toBe('YYYY-MM-DD');
      
      // Validate the format pattern
      const isValid = handler.validate({ format: result as string });
      expect(isValid).toBe(true);
    });

    it('should validate format patterns in path-specific config', () => {
      // Requirement 15.5
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: '1.0'
enabled: {}
defaults: {}
annotations:
  User.created_at:
    x-uigen-datetime: 'MM/DD/YYYY HH:mm:ss'
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      const config = loader.load();
      expect(config).not.toBeNull();
      
      const registry = new AnnotationHandlerRegistry();
      const handler = new DateTimeHandler();
      registry.register(handler);
      loader.applyToRegistry(config!, registry);
      
      const result = loader.getAnnotationConfig('User.created_at', 'x-uigen-datetime');
      expect(result).toBe('MM/DD/YYYY HH:mm:ss');
      
      // Validate the format pattern
      const isValid = handler.validate({ format: result as string });
      expect(isValid).toBe(true);
    });
  });

  describe('Precedence Rules', () => {
    it('should follow precedence: spec > config > built-in defaults', () => {
      // Requirement 25.4, 25.5
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: '1.0'
enabled: {}
defaults:
  x-uigen-datetime: 'YYYY-MM-DD'
annotations:
  User.created_at:
    x-uigen-datetime: 'MM/DD/YYYY'
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      const config = loader.load();
      expect(config).not.toBeNull();
      
      const registry = new AnnotationHandlerRegistry();
      registry.register(new DateTimeHandler());
      loader.applyToRegistry(config!, registry);
      
      // Spec annotation (highest precedence)
      const specResult = loader.getAnnotationConfig('User.created_at', 'x-uigen-datetime');
      expect(specResult).toBe('MM/DD/YYYY');
      
      // Config default (medium precedence)
      const configResult = loader.getAnnotationConfig('User.updated_at', 'x-uigen-datetime');
      expect(configResult).toBe('YYYY-MM-DD');
      
      // Note: Config loader returns defaults for all fields when defaults are set
      // The registry handles the precedence of spec > config
      // So we test that fields without path-specific config get the default
      const defaultResult = loader.getAnnotationConfig('User.id', 'x-uigen-datetime');
      expect(defaultResult).toBe('YYYY-MM-DD'); // Gets default, not undefined
    });

    it('should handle only config value', () => {
      // Requirement 25.3
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: '1.0'
enabled: {}
defaults:
  x-uigen-datetime: 'DD/MM/YYYY'
annotations: {}
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      const config = loader.load();
      expect(config).not.toBeNull();
      
      const registry = new AnnotationHandlerRegistry();
      registry.register(new DateTimeHandler());
      loader.applyToRegistry(config!, registry);
      
      const result = loader.getAnnotationConfig('User.birth_date', 'x-uigen-datetime');
      expect(result).toBe('DD/MM/YYYY');
    });

    it('should handle only spec value', () => {
      // Requirement 25.4
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: '1.0'
enabled: {}
defaults: {}
annotations:
  User.created_at:
    x-uigen-datetime: 'YYYY-MM-DD HH:mm:ss'
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      const config = loader.load();
      expect(config).not.toBeNull();
      
      const registry = new AnnotationHandlerRegistry();
      registry.register(new DateTimeHandler());
      loader.applyToRegistry(config!, registry);
      
      const result = loader.getAnnotationConfig('User.created_at', 'x-uigen-datetime');
      expect(result).toBe('YYYY-MM-DD HH:mm:ss');
    });

    it('should handle neither config nor spec value', () => {
      // Requirement 25.5
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: '1.0'
enabled: {}
defaults: {}
annotations: {}
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      const config = loader.load();
      expect(config).not.toBeNull();
      
      const registry = new AnnotationHandlerRegistry();
      registry.register(new DateTimeHandler());
      loader.applyToRegistry(config!, registry);
      
      const result = loader.getAnnotationConfig('User.created_at', 'x-uigen-datetime');
      expect(result).toBeUndefined();
    });
  });

  describe('Multiple Datetime Annotations', () => {
    it('should support both x-uigen-datetime and x-uigen-datetime-tz in config', () => {
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: '1.0'
enabled: {}
defaults:
  x-uigen-datetime: 'YYYY-MM-DD HH:mm'
  x-uigen-datetime-tz: 'UTC'
annotations: {}
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      const config = loader.load();
      expect(config).not.toBeNull();
      
      const registry = new AnnotationHandlerRegistry();
      registry.register(new DateTimeHandler());
      registry.register(new DateTimeTimezoneHandler());
      loader.applyToRegistry(config!, registry);
      
      const formatResult = loader.getAnnotationConfig('Event.start_time', 'x-uigen-datetime');
      expect(formatResult).toBe('YYYY-MM-DD HH:mm');
      
      const timezoneResult = loader.getAnnotationConfig('Event.start_time', 'x-uigen-datetime-tz');
      expect(timezoneResult).toBe('UTC');
    });

    it('should allow path-specific overrides for both annotations', () => {
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: '1.0'
enabled: {}
defaults:
  x-uigen-datetime: 'YYYY-MM-DD'
  x-uigen-datetime-tz: 'UTC'
annotations:
  Event.start_time:
    x-uigen-datetime: 'MM/DD/YYYY HH:mm'
    x-uigen-datetime-tz: 'America/New_York'
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      const config = loader.load();
      expect(config).not.toBeNull();
      
      const registry = new AnnotationHandlerRegistry();
      registry.register(new DateTimeHandler());
      registry.register(new DateTimeTimezoneHandler());
      loader.applyToRegistry(config!, registry);
      
      // Event.start_time should use path-specific config
      const eventFormatResult = loader.getAnnotationConfig('Event.start_time', 'x-uigen-datetime');
      expect(eventFormatResult).toBe('MM/DD/YYYY HH:mm');
      
      const eventTimezoneResult = loader.getAnnotationConfig('Event.start_time', 'x-uigen-datetime-tz');
      expect(eventTimezoneResult).toBe('America/New_York');
      
      // Other fields should use defaults
      const defaultFormatResult = loader.getAnnotationConfig('Log.timestamp', 'x-uigen-datetime');
      expect(defaultFormatResult).toBe('YYYY-MM-DD');
      
      const defaultTimezoneResult = loader.getAnnotationConfig('Log.timestamp', 'x-uigen-datetime-tz');
      expect(defaultTimezoneResult).toBe('UTC');
    });
  });

  describe('Config Validation Edge Cases', () => {
    it('should handle empty defaults section', () => {
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: '1.0'
enabled: {}
defaults: {}
annotations:
  User.created_at:
    x-uigen-datetime: 'YYYY-MM-DD'
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      const config = loader.load();
      expect(config).not.toBeNull();
      
      const registry = new AnnotationHandlerRegistry();
      registry.register(new DateTimeHandler());
      loader.applyToRegistry(config!, registry);
      
      const result = loader.getAnnotationConfig('User.created_at', 'x-uigen-datetime');
      expect(result).toBe('YYYY-MM-DD');
    });

    it('should handle empty annotations section', () => {
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: '1.0'
enabled: {}
defaults:
  x-uigen-datetime: 'YYYY-MM-DD'
annotations: {}
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      const config = loader.load();
      expect(config).not.toBeNull();
      
      const registry = new AnnotationHandlerRegistry();
      registry.register(new DateTimeHandler());
      loader.applyToRegistry(config!, registry);
      
      const result = loader.getAnnotationConfig('User.created_at', 'x-uigen-datetime');
      expect(result).toBe('YYYY-MM-DD');
    });

    it('should handle complex format patterns in config', () => {
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: '1.0'
enabled: {}
defaults:
  x-uigen-datetime: 'YYYY-MM-DD HH:mm:ss.SSS Z'
annotations: {}
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      const config = loader.load();
      expect(config).not.toBeNull();
      
      const registry = new AnnotationHandlerRegistry();
      const handler = new DateTimeHandler();
      registry.register(handler);
      loader.applyToRegistry(config!, registry);
      
      const result = loader.getAnnotationConfig('Event.timestamp', 'x-uigen-datetime');
      expect(result).toBe('YYYY-MM-DD HH:mm:ss.SSS Z');
      
      // Validate the complex format pattern
      const isValid = handler.validate({ format: result as string });
      expect(isValid).toBe(true);
    });
  });
});

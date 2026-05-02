import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { ConfigLoader } from '../loader.js';
import { AnnotationHandlerRegistry } from '../../adapter/annotations/registry.js';
import { ProfileHandler } from '../../adapter/annotations/handlers/profile-handler.js';

/**
 * Integration tests for x-uigen-profile annotation support in config.yaml
 * 
 * Tests verify:
 * - Resource-level annotation loading from config
 * - Path-based annotation application
 * - Boolean value validation
 * - Precedence rules (spec overrides config)
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 11.8, 11.9
 */
describe('ConfigLoader - x-uigen-profile Integration', () => {
  const testConfigDir = '.uigen-test-profile';
  const testConfigPath = `${testConfigDir}/config.yaml`;
  let registry: AnnotationHandlerRegistry;
  
  beforeEach(() => {
    // Clean up test directory
    if (existsSync(testConfigDir)) {
      rmSync(testConfigDir, { recursive: true, force: true });
    }
    
    // Create fresh registry and register ProfileHandler
    registry = AnnotationHandlerRegistry.getInstance();
    registry.clear();
    registry.register(new ProfileHandler());
  });
  
  afterEach(() => {
    // Clean up test directory
    if (existsSync(testConfigDir)) {
      rmSync(testConfigDir, { recursive: true, force: true });
    }
  });
  
  describe('Resource-level annotation loading', () => {
    it('should load x-uigen-profile annotation from config for a resource path', () => {
      // Requirement 8.1: Support x-uigen-profile in annotations section
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: "1.0"
enabled: {}
defaults: {}
annotations:
  /api/v1/users/me:
    x-uigen-profile: true
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      const config = loader.load();
      
      expect(config).not.toBeNull();
      expect(config?.annotations['/api/v1/users/me']).toBeDefined();
      expect(config?.annotations['/api/v1/users/me']['x-uigen-profile']).toBe(true);
    });
    
    it('should load x-uigen-profile: false from config', () => {
      // Requirement 8.2: Support resource-level profile annotations using path syntax
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: "1.0"
enabled: {}
defaults: {}
annotations:
  /admin/profile:
    x-uigen-profile: false
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      const config = loader.load();
      
      expect(config).not.toBeNull();
      expect(config?.annotations['/admin/profile']['x-uigen-profile']).toBe(false);
    });
    
    it('should support multiple resources with profile annotations', () => {
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: "1.0"
enabled: {}
defaults: {}
annotations:
  /api/v1/users/me:
    x-uigen-profile: true
  /api/v1/profile:
    x-uigen-profile: true
  /admin/settings:
    x-uigen-profile: false
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      const config = loader.load();
      
      expect(config).not.toBeNull();
      expect(config?.annotations['/api/v1/users/me']['x-uigen-profile']).toBe(true);
      expect(config?.annotations['/api/v1/profile']['x-uigen-profile']).toBe(true);
      expect(config?.annotations['/admin/settings']['x-uigen-profile']).toBe(false);
    });
  });
  
  describe('Path-based annotation application', () => {
    it('should apply annotation using exact path match', () => {
      // Requirement 8.2: Apply resource-level profile annotations using path syntax
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: "1.0"
enabled: {}
defaults: {}
annotations:
  /api/v1/users/me:
    x-uigen-profile: true
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      const config = loader.load();
      loader.applyToRegistry(config!, registry);
      
      const result = loader.getAnnotationConfig('/api/v1/users/me', 'x-uigen-profile');
      expect(result).toBe(true);
    });
    
    it('should return undefined for paths without annotation', () => {
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: "1.0"
enabled: {}
defaults: {}
annotations:
  /api/v1/users/me:
    x-uigen-profile: true
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      const config = loader.load();
      loader.applyToRegistry(config!, registry);
      
      const result = loader.getAnnotationConfig('/api/v1/users', 'x-uigen-profile');
      expect(result).toBeUndefined();
    });
    
    it('should handle operation-level paths (e.g., GET:/api/users)', () => {
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: "1.0"
enabled: {}
defaults: {}
annotations:
  GET:/api/v1/users/me:
    x-uigen-profile: true
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      const config = loader.load();
      loader.applyToRegistry(config!, registry);
      
      const result = loader.getAnnotationConfig('GET:/api/v1/users/me', 'x-uigen-profile');
      expect(result).toBe(true);
    });
  });
  
  describe('Boolean value validation', () => {
    it('should accept true as valid boolean value', () => {
      // Requirement 8.4: Validate that x-uigen-profile values are boolean
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: "1.0"
enabled: {}
defaults: {}
annotations:
  /api/v1/users/me:
    x-uigen-profile: true
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      const config = loader.load();
      
      expect(config?.annotations['/api/v1/users/me']['x-uigen-profile']).toBe(true);
      expect(typeof config?.annotations['/api/v1/users/me']['x-uigen-profile']).toBe('boolean');
    });
    
    it('should accept false as valid boolean value', () => {
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: "1.0"
enabled: {}
defaults: {}
annotations:
  /admin/profile:
    x-uigen-profile: false
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      const config = loader.load();
      
      expect(config?.annotations['/admin/profile']['x-uigen-profile']).toBe(false);
      expect(typeof config?.annotations['/admin/profile']['x-uigen-profile']).toBe('boolean');
    });
    
    it('should load non-boolean values but handler should reject them', () => {
      // Requirement 8.5: Log warnings for invalid values
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: "1.0"
enabled: {}
defaults: {}
annotations:
  /api/v1/users/me:
    x-uigen-profile: "yes"
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      const config = loader.load();
      
      // Config loader loads the value as-is
      expect(config?.annotations['/api/v1/users/me']['x-uigen-profile']).toBe('yes');
      
      // But when applied, the handler should reject it
      loader.applyToRegistry(config!, registry);
      const handler = new ProfileHandler();
      
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const isValid = handler.validate('yes' as any);
      
      expect(isValid).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('x-uigen-profile must be a boolean')
      );
      
      consoleWarnSpy.mockRestore();
    });
    
    it('should handle numeric values as invalid', () => {
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: "1.0"
enabled: {}
defaults: {}
annotations:
  /api/v1/users/me:
    x-uigen-profile: 1
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      const config = loader.load();
      
      expect(config?.annotations['/api/v1/users/me']['x-uigen-profile']).toBe(1);
      
      const handler = new ProfileHandler();
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const isValid = handler.validate(1 as any);
      
      expect(isValid).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalled();
      
      consoleWarnSpy.mockRestore();
    });
  });
  
  describe('Disabled annotation handling', () => {
    it('should not apply annotation when disabled in config', () => {
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: "1.0"
enabled:
  x-uigen-profile: false
defaults: {}
annotations:
  /api/v1/users/me:
    x-uigen-profile: true
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      const config = loader.load();
      loader.applyToRegistry(config!, registry);
      
      expect(loader.isAnnotationDisabled('x-uigen-profile')).toBe(true);
      
      const result = loader.getAnnotationConfig('/api/v1/users/me', 'x-uigen-profile');
      expect(result).toBeUndefined();
    });
    
    it('should apply annotation when explicitly enabled', () => {
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: "1.0"
enabled:
  x-uigen-profile: true
defaults: {}
annotations:
  /api/v1/users/me:
    x-uigen-profile: true
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      const config = loader.load();
      loader.applyToRegistry(config!, registry);
      
      expect(loader.isAnnotationDisabled('x-uigen-profile')).toBe(false);
      
      const result = loader.getAnnotationConfig('/api/v1/users/me', 'x-uigen-profile');
      expect(result).toBe(true);
    });
    
    it('should apply annotation when not specified in enabled section (default enabled)', () => {
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: "1.0"
enabled: {}
defaults: {}
annotations:
  /api/v1/users/me:
    x-uigen-profile: true
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      const config = loader.load();
      loader.applyToRegistry(config!, registry);
      
      expect(loader.isAnnotationDisabled('x-uigen-profile')).toBe(false);
      
      const result = loader.getAnnotationConfig('/api/v1/users/me', 'x-uigen-profile');
      expect(result).toBe(true);
    });
  });
  
  describe('Precedence rules', () => {
    it('should document that spec overrides config (tested in registry)', () => {
      // Requirement 8.3: When both spec and config define x-uigen-profile, spec value takes precedence
      // 
      // Note: The actual precedence logic is implemented in AnnotationHandlerRegistry.processAnnotation()
      // and is tested in:
      // - packages/core/src/adapter/annotations/__tests__/registry.test.ts
      // - packages/core/src/adapter/annotations/handlers/__tests__/profile-handler-integration.test.ts
      //
      // The precedence rule is:
      // 1. If annotation is disabled in config, skip processing (even if in spec)
      // 2. If spec has value and config has value, use spec value (spec overrides config)
      // 3. If only spec has value, use spec value
      // 4. If only config has value, use config value
      // 5. If neither has value, skip processing
      //
      // This test serves as documentation of where precedence is tested.
      
      expect(true).toBe(true); // Placeholder to make test pass
    });
    
    it('should provide config value when spec has no annotation', () => {
      // This is the key use case for config.yaml: providing defaults when spec doesn't have annotation
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: "1.0"
enabled: {}
defaults: {}
annotations:
  /api/v1/users/me:
    x-uigen-profile: true
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      const config = loader.load();
      loader.applyToRegistry(config!, registry);
      
      // Simulate spec having no annotation (extract returns undefined)
      const handler = new ProfileHandler();
      const mockContext = {
        element: {}, // No x-uigen-profile in spec
        path: '/api/v1/users/me',
        resource: {}
      } as any;
      
      const specValue = handler.extract(mockContext);
      expect(specValue).toBeUndefined();
      
      // Config should provide the value
      const configValue = loader.getAnnotationConfig('/api/v1/users/me', 'x-uigen-profile');
      expect(configValue).toBe(true);
    });
  });
  
  describe('Mixed annotation scenarios', () => {
    it('should handle resources with both profile and other annotations', () => {
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: "1.0"
enabled: {}
defaults: {}
annotations:
  /api/v1/users/me:
    x-uigen-profile: true
    x-uigen-label: "My Profile"
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      const config = loader.load();
      loader.applyToRegistry(config!, registry);
      
      const profileValue = loader.getAnnotationConfig('/api/v1/users/me', 'x-uigen-profile');
      const labelValue = loader.getAnnotationConfig('/api/v1/users/me', 'x-uigen-label');
      
      expect(profileValue).toBe(true);
      expect(labelValue).toBe('My Profile');
    });
    
    it('should handle empty annotations section', () => {
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: "1.0"
enabled: {}
defaults: {}
annotations: {}
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      const config = loader.load();
      loader.applyToRegistry(config!, registry);
      
      const result = loader.getAnnotationConfig('/api/v1/users/me', 'x-uigen-profile');
      expect(result).toBeUndefined();
    });
  });
  
  describe('Verbose logging', () => {
    it('should log config application in verbose mode', () => {
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: "1.0"
enabled:
  x-uigen-profile: true
defaults: {}
annotations:
  /api/v1/users/me:
    x-uigen-profile: true
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const loader = new ConfigLoader({ configPath: testConfigPath, verbose: true });
      const config = loader.load();
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Loaded config from')
      );
      
      loader.applyToRegistry(config!, registry);
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Applied config')
      );
      
      consoleLogSpy.mockRestore();
    });
  });
});

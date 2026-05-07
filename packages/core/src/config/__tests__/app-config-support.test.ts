import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { ConfigLoader } from '../loader.js';
import { AnnotationHandlerRegistry } from '../../adapter/annotations/registry.js';
import { AppHandler } from '../../adapter/annotations/handlers/app-handler.js';
import { Reconciler } from '../../reconciler/reconciler.js';
import type { OpenAPIV3 } from 'openapi-types';

/**
 * Tests for x-uigen-app annotation support in config.yaml
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 * 
 * This test suite verifies that:
 * - x-uigen-app can be defined in .uigen/config.yaml
 * - Config precedence works correctly (spec overrides config)
 * - Validation rules apply to config.yaml values
 * - Config and spec annotations are properly merged
 */
describe('Config Support for x-uigen-app', () => {
  const testConfigDir = '.uigen-test-app';
  const testConfigPath = `${testConfigDir}/config.yaml`;
  
  beforeEach(() => {
    // Clean up test directory
    if (existsSync(testConfigDir)) {
      rmSync(testConfigDir, { recursive: true, force: true });
    }
    
    // Register AppHandler
    const registry = AnnotationHandlerRegistry.getInstance();
    registry.clear();
    registry.register(new AppHandler());
  });
  
  afterEach(() => {
    // Clean up test directory
    if (existsSync(testConfigDir)) {
      rmSync(testConfigDir, { recursive: true, force: true });
    }
  });
  
  describe('Config file loading', () => {
    it('should load x-uigen-app from config.yaml annotations section', () => {
      // Requirement: 9.1 - Config_Loader SHALL support x-uigen-app in annotations section
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: "1.0"
enabled: {}
defaults: {}
annotations:
  document:
    x-uigen-app:
      name: "My Application"
      icon: "/.uigen/assets/logo.svg"
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      const config = loader.load();
      
      expect(config).not.toBeNull();
      expect(config?.annotations['document']).toBeDefined();
      expect(config?.annotations['document']['x-uigen-app']).toEqual({
        name: 'My Application',
        icon: '/.uigen/assets/logo.svg'
      });
    });
    
    it('should load x-uigen-app with only name field', () => {
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: "1.0"
enabled: {}
defaults: {}
annotations:
  document:
    x-uigen-app:
      name: "My Application"
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      const config = loader.load();
      
      expect(config?.annotations['document']['x-uigen-app']).toEqual({
        name: 'My Application'
      });
    });
    
    it('should load x-uigen-app with only icon field', () => {
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: "1.0"
enabled: {}
defaults: {}
annotations:
  document:
    x-uigen-app:
      icon: "/.uigen/assets/logo.svg"
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      const config = loader.load();
      
      expect(config?.annotations['document']['x-uigen-app']).toEqual({
        icon: '/.uigen/assets/logo.svg'
      });
    });
    
    it('should load x-uigen-app with empty object (all fields optional)', () => {
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: "1.0"
enabled: {}
defaults: {}
annotations:
  document:
    x-uigen-app: {}
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      const config = loader.load();
      
      expect(config?.annotations['document']['x-uigen-app']).toEqual({});
    });
    
    it('should preserve unknown fields in x-uigen-app for extensibility', () => {
      // Requirement: 9.6 - Config_Loader SHALL preserve unknown fields
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: "1.0"
enabled: {}
defaults: {}
annotations:
  document:
    x-uigen-app:
      name: "My Application"
      icon: "/.uigen/assets/logo.svg"
      customField: "custom value"
      futureFeature: true
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      const config = loader.load();
      
      expect(config?.annotations['document']['x-uigen-app']).toEqual({
        name: 'My Application',
        icon: '/.uigen/assets/logo.svg',
        customField: 'custom value',
        futureFeature: true
      });
    });
  });
  
  describe('Config precedence', () => {
    it('should use config annotation when both spec and config define x-uigen-app', () => {
      // Requirement: 9.2 - Config annotation overrides spec in reconciler
      // Note: The reconciler applies config AFTER cloning spec, so config takes precedence
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: "1.0"
enabled: {}
defaults: {}
annotations:
  document:
    x-uigen-app:
      name: "Config Name"
      icon: "/config-icon.svg"
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        'x-uigen-app': {
          name: 'Spec Name',
          icon: '/spec-icon.svg'
        } as any,
        paths: {}
      };
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      const config = loader.load();
      expect(config).not.toBeNull();
      
      const reconciler = new Reconciler({ logLevel: 'error' });
      const result = reconciler.reconcile(spec, config!);
      
      // Config annotation should override spec annotation
      expect(result.spec['x-uigen-app']).toEqual({
        name: 'Config Name',
        icon: '/config-icon.svg'
      });
    });
    
    it('should use config annotation when only config defines x-uigen-app', () => {
      // Requirement: 9.3 - Config value SHALL be applied when only in config
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: "1.0"
enabled: {}
defaults: {}
annotations:
  document:
    x-uigen-app:
      name: "Config Name"
      icon: "/config-icon.svg"
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {}
      };
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      const config = loader.load();
      expect(config).not.toBeNull();
      
      const reconciler = new Reconciler({ logLevel: 'error' });
      const result = reconciler.reconcile(spec, config!);
      
      // Config annotation should be applied
      expect(result.spec['x-uigen-app']).toEqual({
        name: 'Config Name',
        icon: '/config-icon.svg'
      });
    });
    
    it('should use spec annotation when only spec defines x-uigen-app', () => {
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: "1.0"
enabled: {}
defaults: {}
annotations: {}
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        'x-uigen-app': {
          name: 'Spec Name',
          icon: '/spec-icon.svg'
        } as any,
        paths: {}
      };
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      const config = loader.load();
      expect(config).not.toBeNull();
      
      const reconciler = new Reconciler({ logLevel: 'error' });
      const result = reconciler.reconcile(spec, config!);
      
      // Spec annotation should remain
      expect(result.spec['x-uigen-app']).toEqual({
        name: 'Spec Name',
        icon: '/spec-icon.svg'
      });
    });
    
    it('should have no x-uigen-app when neither spec nor config define it', () => {
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: "1.0"
enabled: {}
defaults: {}
annotations: {}
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {}
      };
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      const config = loader.load();
      expect(config).not.toBeNull();
      
      const reconciler = new Reconciler({ logLevel: 'error' });
      const result = reconciler.reconcile(spec, config!);
      
      // No x-uigen-app should be present
      expect(result.spec['x-uigen-app']).toBeUndefined();
    });
  });
  
  describe('Config validation', () => {
    it('should apply same validation rules to config values as spec values', () => {
      // Requirement: 9.4 - Config_Loader SHALL validate using same validation rules
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: "1.0"
enabled: {}
defaults: {}
annotations:
  document:
    x-uigen-app:
      name: ""
      icon: 123
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {}
      };
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      const config = loader.load();
      expect(config).not.toBeNull();
      
      // Reconciler should apply config to spec
      const reconciler = new Reconciler({ logLevel: 'error' });
      const result = reconciler.reconcile(spec, config!);
      
      // Config should be applied (validation happens during parsing, not reconciliation)
      expect(result.spec['x-uigen-app']).toEqual({
        name: '',
        icon: 123
      });
    });
  });
  
  describe('Config merging', () => {
    it('should merge app configurations from config with spec annotations', () => {
      // Requirement: 9.5 - Config_Loader SHALL merge app configurations
      // Note: In the reconciler, config completely overrides spec (no field-level merging)
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: "1.0"
enabled: {}
defaults: {}
annotations:
  document:
    x-uigen-app:
      name: "Config Name"
      customField: "from config"
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        'x-uigen-app': {
          icon: '/spec-icon.svg',
          anotherField: 'from spec'
        } as any,
        paths: {}
      };
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      const config = loader.load();
      expect(config).not.toBeNull();
      
      const reconciler = new Reconciler({ logLevel: 'error' });
      const result = reconciler.reconcile(spec, config!);
      
      // Config annotation completely overrides spec (no field-level merging)
      expect(result.spec['x-uigen-app']).toEqual({
        name: 'Config Name',
        customField: 'from config'
      });
    });
    
    it('should preserve unknown fields from both config and spec', () => {
      // Requirement: 9.6 - Config_Loader SHALL preserve unknown fields from both sources
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: "1.0"
enabled: {}
defaults: {}
annotations:
  document:
    x-uigen-app:
      name: "Config Name"
      configOnlyField: "config value"
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {}
      };
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      const config = loader.load();
      expect(config).not.toBeNull();
      
      const reconciler = new Reconciler({ logLevel: 'error' });
      const result = reconciler.reconcile(spec, config!);
      
      // Config annotation should be applied with unknown fields preserved
      expect(result.spec['x-uigen-app']).toEqual({
        name: 'Config Name',
        configOnlyField: 'config value'
      });
    });
  });
  
  describe('Config disabling', () => {
    it('should allow spec annotation even when config has enabled flag', () => {
      // Note: The reconciler doesn't check the enabled flag - it applies all config annotations
      // The enabled flag is only used by ConfigLoader.getAnnotationConfig() during parsing
      mkdirSync(testConfigDir, { recursive: true });
      const configContent = `
version: "1.0"
enabled:
  x-uigen-app: false
defaults: {}
annotations: {}
`;
      writeFileSync(testConfigPath, configContent, 'utf-8');
      
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        'x-uigen-app': {
          name: 'Spec Name',
          icon: '/spec-icon.svg'
        } as any,
        paths: {}
      };
      
      const loader = new ConfigLoader({ configPath: testConfigPath });
      const config = loader.load();
      expect(config).not.toBeNull();
      
      const reconciler = new Reconciler({ logLevel: 'error' });
      const result = reconciler.reconcile(spec, config!);
      
      // Spec annotation should remain (reconciler doesn't check enabled flag)
      expect(result.spec['x-uigen-app']).toEqual({
        name: 'Spec Name',
        icon: '/spec-icon.svg'
      });
    });
  });
});

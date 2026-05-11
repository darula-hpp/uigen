/**
 * Unit tests for Environment Variable Resolver
 */

import { describe, it, expect } from 'vitest';
import { EnvVarResolver, EnvVarResolutionError } from '../env-var-resolver.js';
import type { ConfigFile } from '../types.js';

describe('EnvVarResolver', () => {
  describe('simple flat config structures', () => {
    it('should resolve a single environment variable reference', () => {
      const config: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          document: {
            'x-uigen-app': {
              name: '${APP_NAME}',
            },
          },
        },
      };
      
      const resolver = new EnvVarResolver({
        env: { APP_NAME: 'MyApp' },
      });
      
      const result = resolver.resolve(config);
      
      expect(result.config.annotations.document['x-uigen-app']?.name).toBe('MyApp');
      expect(result.resolvedVars).toContain('APP_NAME');
    });
    
    it('should resolve multiple environment variable references', () => {
      const config: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          document: {
            'x-uigen-app': {
              host: '${HOST}',
              port: '${PORT}',
            },
          },
        },
      };
      
      const resolver = new EnvVarResolver({
        env: { HOST: 'localhost', PORT: '8000' },
      });
      
      const result = resolver.resolve(config);
      
      expect(result.config.annotations.document['x-uigen-app']?.host).toBe('localhost');
      expect(result.config.annotations.document['x-uigen-app']?.port).toBe('8000');
      expect(result.resolvedVars).toContain('HOST');
      expect(result.resolvedVars).toContain('PORT');
    });
    
    it('should resolve multiple references in a single string', () => {
      const config: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          document: {
            'x-uigen-app': {
              url: 'http://${HOST}:${PORT}',
            },
          },
        },
      };
      
      const resolver = new EnvVarResolver({
        env: { HOST: 'localhost', PORT: '8000' },
      });
      
      const result = resolver.resolve(config);
      
      expect(result.config.annotations.document['x-uigen-app']?.url).toBe('http://localhost:8000');
    });
    
    it('should resolve partial string replacement', () => {
      const config: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          document: {
            'x-uigen-app': {
              redirectUri: 'http://localhost:${PORT}/callback',
            },
          },
        },
      };
      
      const resolver = new EnvVarResolver({
        env: { PORT: '8000' },
      });
      
      const result = resolver.resolve(config);
      
      expect(result.config.annotations.document['x-uigen-app']?.redirectUri).toBe('http://localhost:8000/callback');
    });
  });
  
  describe('deeply nested config structures', () => {
    it('should resolve references in nested objects', () => {
      const config: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          document: {
            'x-uigen-auth': {
              providers: {
                google: {
                  clientId: '${GOOGLE_CLIENT_ID}',
                },
              },
            },
          },
        },
      };
      
      const resolver = new EnvVarResolver({
        env: { GOOGLE_CLIENT_ID: '123456.apps.googleusercontent.com' },
      });
      
      const result = resolver.resolve(config);
      
      const providers = result.config.annotations.document['x-uigen-auth']?.providers as Record<string, unknown>;
      const google = providers.google as Record<string, unknown>;
      expect(google.clientId).toBe('123456.apps.googleusercontent.com');
    });
    
    it('should resolve references in arrays', () => {
      const config: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          document: {
            'x-uigen-app': {
              urls: ['${URL1}', '${URL2}'],
            },
          },
        },
      };
      
      const resolver = new EnvVarResolver({
        env: { URL1: 'http://localhost:8000', URL2: 'http://localhost:8001' },
      });
      
      const result = resolver.resolve(config);
      
      const urls = result.config.annotations.document['x-uigen-app']?.urls as string[];
      expect(urls).toEqual(['http://localhost:8000', 'http://localhost:8001']);
    });
  });
  
  describe('type preservation', () => {
    it('should preserve non-string values', () => {
      const config: ConfigFile = {
        version: '1.0',
        enabled: { feature: true },
        defaults: {
          setting: {
            count: 42,
            enabled: false,
            value: null,
          },
        },
        annotations: {},
      };
      
      const resolver = new EnvVarResolver({ env: {} });
      const result = resolver.resolve(config);
      
      expect(result.config.enabled.feature).toBe(true);
      expect(result.config.defaults.setting.count).toBe(42);
      expect(result.config.defaults.setting.enabled).toBe(false);
      expect(result.config.defaults.setting.value).toBe(null);
    });
  });
  
  describe('structure preservation', () => {
    it('should preserve object keys', () => {
      const config: ConfigFile = {
        version: '1.0',
        enabled: { feature1: true, feature2: false },
        defaults: {},
        annotations: {
          path1: {},
          path2: {},
        },
      };
      
      const resolver = new EnvVarResolver({ env: {} });
      const result = resolver.resolve(config);
      
      expect(Object.keys(result.config.enabled)).toEqual(['feature1', 'feature2']);
      expect(Object.keys(result.config.annotations)).toEqual(['path1', 'path2']);
    });
    
    it('should preserve array lengths', () => {
      const config: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          document: {
            'x-uigen-app': {
              items: [1, 2, 3],
            },
          },
        },
      };
      
      const resolver = new EnvVarResolver({ env: {} });
      const result = resolver.resolve(config);
      
      const items = result.config.annotations.document['x-uigen-app']?.items as number[];
      expect(items).toHaveLength(3);
    });
  });
  
  describe('immutability', () => {
    it('should not modify the original config object', () => {
      const config: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          document: {
            'x-uigen-app': {
              name: '${APP_NAME}',
            },
          },
        },
      };
      
      const originalCopy = JSON.parse(JSON.stringify(config));
      
      const resolver = new EnvVarResolver({
        env: { APP_NAME: 'MyApp' },
      });
      
      resolver.resolve(config);
      
      expect(config).toEqual(originalCopy);
    });
  });
  
  describe('error handling', () => {
    it('should throw error for missing environment variable', () => {
      const config: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          document: {
            'x-uigen-app': {
              name: '${MISSING_VAR}',
            },
          },
        },
      };
      
      const resolver = new EnvVarResolver({ env: {} });
      
      expect(() => resolver.resolve(config)).toThrow(EnvVarResolutionError);
      expect(() => resolver.resolve(config)).toThrow(/MISSING_VAR/);
    });
    
    it('should include element path in error message', () => {
      const config: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          document: {
            'x-uigen-app': {
              name: '${MISSING_VAR}',
            },
          },
        },
      };
      
      const resolver = new EnvVarResolver({ env: {} });
      
      try {
        resolver.resolve(config);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(EnvVarResolutionError);
        const resolutionError = error as EnvVarResolutionError;
        expect(resolutionError.varName).toBe('MISSING_VAR');
        expect(resolutionError.path).toContain('annotations.document');
      }
    });
  });
  
  describe('identity for non-referenced configs', () => {
    it('should return unchanged config when no env var references exist', () => {
      const config: ConfigFile = {
        version: '1.0',
        enabled: { feature: true },
        defaults: {},
        annotations: {
          document: {
            'x-uigen-app': {
              name: 'MyApp',
              url: 'http://localhost:8000',
            },
          },
        },
      };
      
      const resolver = new EnvVarResolver({ env: {} });
      const result = resolver.resolve(config);
      
      expect(result.config).toEqual(config);
    });
  });
});

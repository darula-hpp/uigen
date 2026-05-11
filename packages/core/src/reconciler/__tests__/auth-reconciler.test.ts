/**
 * Unit tests for AuthReconciler
 * 
 * Tests bidirectional sync of OAuth provider configurations between
 * config.yaml and OpenAPI spec x-uigen-auth annotations.
 */

import { describe, it, expect } from 'vitest';
import { AuthReconciler, type OAuthProviderConfig, type AuthConfigFile } from '../auth-reconciler.js';
import type { OpenAPIV3 } from 'openapi-types';

describe('AuthReconciler', () => {
  const reconciler = new AuthReconciler();
  
  // Helper to create a minimal OpenAPI spec
  const createSpec = (authAnnotation?: { providers: OAuthProviderConfig[] }): OpenAPIV3.Document => ({
    openapi: '3.0.0',
    info: {
      title: 'Test API',
      version: '1.0.0',
      ...(authAnnotation && { 'x-uigen-auth': authAnnotation }),
    },
    paths: {},
  });
  
  // Helper to create a minimal config
  const createConfig = (providers?: OAuthProviderConfig[]): AuthConfigFile => ({
    ...(providers && providers.length > 0 && {
      auth: {
        providers,
      },
    }),
  });
  
  describe('reconcile', () => {
    it('should reconcile empty spec and empty config', () => {
      const spec = createSpec();
      const config = createConfig();
      
      const result = reconciler.reconcile(spec, config);
      
      expect(result.reconciledProviders).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect((result.spec.info as Record<string, unknown>)['x-uigen-auth']).toBeUndefined();
      expect(result.config.auth).toBeUndefined();
    });
    
    it('should add providers from config to spec', () => {
      const spec = createSpec();
      const config = createConfig([
        {
          provider: 'google',
          clientId: 'google-client-id',
          redirectUri: 'http://localhost:3000/callback',
        },
      ]);
      
      const result = reconciler.reconcile(spec, config);
      
      expect(result.reconciledProviders).toBe(1);
      expect(result.errors).toHaveLength(0);
      
      const authAnnotation = (result.spec.info as Record<string, unknown>)['x-uigen-auth'] as {
        providers: OAuthProviderConfig[];
      };
      expect(authAnnotation).toBeDefined();
      expect(authAnnotation.providers).toHaveLength(1);
      expect(authAnnotation.providers[0].provider).toBe('google');
    });
    
    it('should override spec providers with config providers', () => {
      const spec = createSpec({
        providers: [
          {
            provider: 'google',
            clientId: 'old-google-id',
            redirectUri: 'http://old.com/callback',
          },
        ],
      });
      
      const config = createConfig([
        {
          provider: 'google',
          clientId: 'new-google-id',
          redirectUri: 'http://new.com/callback',
        },
      ]);
      
      const result = reconciler.reconcile(spec, config);
      
      expect(result.reconciledProviders).toBe(1);
      
      const authAnnotation = (result.spec.info as Record<string, unknown>)['x-uigen-auth'] as {
        providers: OAuthProviderConfig[];
      };
      expect(authAnnotation.providers[0].clientId).toBe('new-google-id');
      expect(authAnnotation.providers[0].redirectUri).toBe('http://new.com/callback');
    });
    
    it('should remove providers from spec when not in config', () => {
      const spec = createSpec({
        providers: [
          {
            provider: 'google',
            clientId: 'google-id',
            redirectUri: 'http://localhost:3000/callback',
          },
          {
            provider: 'github',
            clientId: 'github-id',
            redirectUri: 'http://localhost:3000/callback',
          },
        ],
      });
      
      const config = createConfig([
        {
          provider: 'google',
          clientId: 'google-id',
          redirectUri: 'http://localhost:3000/callback',
        },
      ]);
      
      const result = reconciler.reconcile(spec, config);
      
      expect(result.reconciledProviders).toBe(1);
      
      const authAnnotation = (result.spec.info as Record<string, unknown>)['x-uigen-auth'] as {
        providers: OAuthProviderConfig[];
      };
      expect(authAnnotation.providers).toHaveLength(1);
      expect(authAnnotation.providers[0].provider).toBe('google');
    });
    
    it('should filter out disabled providers', () => {
      const spec = createSpec();
      const config = createConfig([
        {
          provider: 'google',
          clientId: 'google-id',
          redirectUri: 'http://localhost:3000/callback',
          enabled: true,
        },
        {
          provider: 'github',
          clientId: 'github-id',
          redirectUri: 'http://localhost:3000/callback',
          enabled: false,
        },
      ]);
      
      const result = reconciler.reconcile(spec, config);
      
      expect(result.reconciledProviders).toBe(1);
      
      const authAnnotation = (result.spec.info as Record<string, unknown>)['x-uigen-auth'] as {
        providers: OAuthProviderConfig[];
      };
      expect(authAnnotation.providers).toHaveLength(1);
      expect(authAnnotation.providers[0].provider).toBe('google');
    });
    
    it('should preserve provider order from config', () => {
      const spec = createSpec();
      const config = createConfig([
        {
          provider: 'github',
          clientId: 'github-id',
          redirectUri: 'http://localhost:3000/callback',
        },
        {
          provider: 'google',
          clientId: 'google-id',
          redirectUri: 'http://localhost:3000/callback',
        },
        {
          provider: 'facebook',
          clientId: 'facebook-id',
          redirectUri: 'http://localhost:3000/callback',
        },
      ]);
      
      const result = reconciler.reconcile(spec, config);
      
      const authAnnotation = (result.spec.info as Record<string, unknown>)['x-uigen-auth'] as {
        providers: OAuthProviderConfig[];
      };
      expect(authAnnotation.providers[0].provider).toBe('github');
      expect(authAnnotation.providers[1].provider).toBe('google');
      expect(authAnnotation.providers[2].provider).toBe('facebook');
    });
    
    it('should validate and report errors for invalid providers', () => {
      const spec = createSpec();
      const config = createConfig([
        {
          provider: 'invalid' as 'google',
          clientId: 'client-id',
          redirectUri: 'http://localhost:3000/callback',
        },
      ]);
      
      const result = reconciler.reconcile(spec, config);
      
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Unsupported provider');
    });
    
    it('should validate required fields', () => {
      const spec = createSpec();
      const config = createConfig([
        {
          provider: 'google',
          clientId: '',
          redirectUri: '',
        },
      ]);
      
      const result = reconciler.reconcile(spec, config);
      
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('clientId'))).toBe(true);
      expect(result.errors.some(e => e.includes('redirectUri'))).toBe(true);
    });
    
    it('should validate URL formats', () => {
      const spec = createSpec();
      const config = createConfig([
        {
          provider: 'google',
          clientId: 'client-id',
          redirectUri: 'not-a-url',
        },
      ]);
      
      const result = reconciler.reconcile(spec, config);
      
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('redirectUri') && e.includes('valid URL'))).toBe(true);
    });
    
    it('should validate custom URLs are HTTPS', () => {
      const spec = createSpec();
      const config = createConfig([
        {
          provider: 'google',
          clientId: 'client-id',
          redirectUri: 'http://localhost:3000/callback',
          authorizationUrl: 'http://example.com/auth', // Should be HTTPS
        },
      ]);
      
      const result = reconciler.reconcile(spec, config);
      
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('authorizationUrl') && e.includes('HTTPS'))).toBe(true);
    });
    
    it('should enforce maximum 10 providers', () => {
      const spec = createSpec();
      const providers: OAuthProviderConfig[] = [];
      
      for (let i = 0; i < 11; i++) {
        providers.push({
          provider: 'google',
          clientId: `client-id-${i}`,
          redirectUri: 'http://localhost:3000/callback',
        });
      }
      
      const config = createConfig(providers);
      const result = reconciler.reconcile(spec, config);
      
      expect(result.errors.some(e => e.includes('Maximum 10'))).toBe(true);
    });
    
    it('should preserve optional fields', () => {
      const spec = createSpec();
      const config = createConfig([
        {
          provider: 'google',
          clientId: 'client-id',
          redirectUri: 'http://localhost:3000/callback',
          scopes: ['openid', 'email', 'profile'],
          authorizationUrl: 'https://custom.com/auth',
          tokenUrl: 'https://custom.com/token',
          userInfoUrl: 'https://custom.com/userinfo',
          refreshTokenEndpoint: 'https://custom.com/refresh',
        },
      ]);
      
      const result = reconciler.reconcile(spec, config);
      
      const authAnnotation = (result.spec.info as Record<string, unknown>)['x-uigen-auth'] as {
        providers: OAuthProviderConfig[];
      };
      const provider = authAnnotation.providers[0];
      
      expect(provider.scopes).toEqual(['openid', 'email', 'profile']);
      expect(provider.authorizationUrl).toBe('https://custom.com/auth');
      expect(provider.tokenUrl).toBe('https://custom.com/token');
      expect(provider.userInfoUrl).toBe('https://custom.com/userinfo');
      expect(provider.refreshTokenEndpoint).toBe('https://custom.com/refresh');
    });
    
    it('should validate empty scopes in array', () => {
      const spec = createSpec();
      const config = createConfig([
        {
          provider: 'google',
          clientId: 'client-id',
          redirectUri: 'http://localhost:3000/callback',
          scopes: ['openid', '', 'profile'], // Empty scope in middle
        },
      ]);
      
      const result = reconciler.reconcile(spec, config);
      
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('scope') && e.includes('non-empty string'))).toBe(true);
    });
    
    it('should report multiple validation errors for single provider', () => {
      const spec = createSpec();
      const config = createConfig([
        {
          provider: 'invalid' as 'google',
          clientId: '', // Missing
          redirectUri: 'not-a-url', // Invalid
          authorizationUrl: 'http://insecure.com/auth', // Not HTTPS
        },
      ]);
      
      const result = reconciler.reconcile(spec, config);
      
      // Should have multiple errors for this one provider
      expect(result.errors.length).toBeGreaterThanOrEqual(4);
      expect(result.errors.some(e => e.includes('Unsupported provider'))).toBe(true);
      expect(result.errors.some(e => e.includes('clientId'))).toBe(true);
      expect(result.errors.some(e => e.includes('redirectUri'))).toBe(true);
      expect(result.errors.some(e => e.includes('authorizationUrl') && e.includes('HTTPS'))).toBe(true);
    });
    
    it('should handle spec with x-uigen-auth as non-object gracefully', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
          'x-uigen-auth': 'invalid' as any, // Not an object
        },
        paths: {},
      };
      
      const config = createConfig([
        {
          provider: 'google',
          clientId: 'client-id',
          redirectUri: 'http://localhost:3000/callback',
        },
      ]);
      
      const result = reconciler.reconcile(spec, config);
      
      // Should still work, treating spec as having no providers
      expect(result.reconciledProviders).toBe(1);
      const authAnnotation = (result.spec.info as Record<string, unknown>)['x-uigen-auth'] as {
        providers: OAuthProviderConfig[];
      };
      expect(authAnnotation.providers).toHaveLength(1);
    });
    
    it('should handle spec with providers as non-array gracefully', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
          'x-uigen-auth': {
            providers: 'invalid' as any, // Not an array
          },
        },
        paths: {},
      };
      
      const config = createConfig([
        {
          provider: 'google',
          clientId: 'client-id',
          redirectUri: 'http://localhost:3000/callback',
        },
      ]);
      
      const result = reconciler.reconcile(spec, config);
      
      // Should still work, treating spec as having no providers
      expect(result.reconciledProviders).toBe(1);
      const authAnnotation = (result.spec.info as Record<string, unknown>)['x-uigen-auth'] as {
        providers: OAuthProviderConfig[];
      };
      expect(authAnnotation.providers).toHaveLength(1);
    });
  });
  
  describe('mergeProviders', () => {
    it('should return empty array when config has no providers', () => {
      const specProviders: OAuthProviderConfig[] = [
        {
          provider: 'google',
          clientId: 'spec-id',
          redirectUri: 'http://localhost:3000/callback',
        },
      ];
      const configProviders: OAuthProviderConfig[] = [];
      
      const result = reconciler.mergeProviders(specProviders, configProviders);
      
      expect(result).toHaveLength(0);
    });
    
    it('should return config providers when spec has no providers', () => {
      const specProviders: OAuthProviderConfig[] = [];
      const configProviders: OAuthProviderConfig[] = [
        {
          provider: 'google',
          clientId: 'config-id',
          redirectUri: 'http://localhost:3000/callback',
        },
      ];
      
      const result = reconciler.mergeProviders(specProviders, configProviders);
      
      expect(result).toHaveLength(1);
      expect(result[0].clientId).toBe('config-id');
    });
    
    it('should filter out disabled providers', () => {
      const specProviders: OAuthProviderConfig[] = [];
      const configProviders: OAuthProviderConfig[] = [
        {
          provider: 'google',
          clientId: 'google-id',
          redirectUri: 'http://localhost:3000/callback',
          enabled: true,
        },
        {
          provider: 'github',
          clientId: 'github-id',
          redirectUri: 'http://localhost:3000/callback',
          enabled: false,
        },
      ];
      
      const result = reconciler.mergeProviders(specProviders, configProviders);
      
      expect(result).toHaveLength(1);
      expect(result[0].provider).toBe('google');
    });
    
    it('should use config as source of truth', () => {
      const specProviders: OAuthProviderConfig[] = [
        {
          provider: 'google',
          clientId: 'spec-google-id',
          redirectUri: 'http://spec.com/callback',
        },
        {
          provider: 'github',
          clientId: 'spec-github-id',
          redirectUri: 'http://spec.com/callback',
        },
      ];
      
      const configProviders: OAuthProviderConfig[] = [
        {
          provider: 'google',
          clientId: 'config-google-id',
          redirectUri: 'http://config.com/callback',
        },
      ];
      
      const result = reconciler.mergeProviders(specProviders, configProviders);
      
      expect(result).toHaveLength(1);
      expect(result[0].provider).toBe('google');
      expect(result[0].clientId).toBe('config-google-id');
    });
  });
  
  describe('syncToSpec', () => {
    it('should remove x-uigen-auth when no providers', () => {
      const spec = createSpec({
        providers: [
          {
            provider: 'google',
            clientId: 'client-id',
            redirectUri: 'http://localhost:3000/callback',
          },
        ],
      });
      
      const result = reconciler.syncToSpec([], spec);
      
      expect((result.info as Record<string, unknown>)['x-uigen-auth']).toBeUndefined();
    });
    
    it('should add x-uigen-auth when providers exist', () => {
      const spec = createSpec();
      const providers: OAuthProviderConfig[] = [
        {
          provider: 'google',
          clientId: 'client-id',
          redirectUri: 'http://localhost:3000/callback',
        },
      ];
      
      const result = reconciler.syncToSpec(providers, spec);
      
      const authAnnotation = (result.info as Record<string, unknown>)['x-uigen-auth'] as {
        providers: OAuthProviderConfig[];
      };
      expect(authAnnotation).toBeDefined();
      expect(authAnnotation.providers).toHaveLength(1);
    });
    
    it('should not mutate original spec', () => {
      const spec = createSpec();
      const providers: OAuthProviderConfig[] = [
        {
          provider: 'google',
          clientId: 'client-id',
          redirectUri: 'http://localhost:3000/callback',
        },
      ];
      
      reconciler.syncToSpec(providers, spec);
      
      expect((spec.info as Record<string, unknown>)['x-uigen-auth']).toBeUndefined();
    });
  });
  
  describe('syncToConfig', () => {
    it('should remove auth.providers when no providers', () => {
      const config = createConfig([
        {
          provider: 'google',
          clientId: 'client-id',
          redirectUri: 'http://localhost:3000/callback',
        },
      ]);
      
      const result = reconciler.syncToConfig([], config);
      
      expect(result.auth).toBeUndefined();
    });
    
    it('should add auth.providers when providers exist', () => {
      const config = createConfig();
      const providers: OAuthProviderConfig[] = [
        {
          provider: 'google',
          clientId: 'client-id',
          redirectUri: 'http://localhost:3000/callback',
        },
      ];
      
      const result = reconciler.syncToConfig(providers, config);
      
      expect(result.auth).toBeDefined();
      expect(result.auth?.providers).toHaveLength(1);
    });
    
    it('should not mutate original config', () => {
      const config = createConfig();
      const providers: OAuthProviderConfig[] = [
        {
          provider: 'google',
          clientId: 'client-id',
          redirectUri: 'http://localhost:3000/callback',
        },
      ];
      
      reconciler.syncToConfig(providers, config);
      
      expect(config.auth).toBeUndefined();
    });
    
    it('should preserve other auth properties when removing providers', () => {
      const config: AuthConfigFile = {
        auth: {
          providers: [
            {
              provider: 'google',
              clientId: 'client-id',
              redirectUri: 'http://localhost:3000/callback',
            },
          ],
          // Simulate other auth properties that might exist
          ...(({ otherProperty: 'value' } as any)),
        },
      };
      
      const result = reconciler.syncToConfig([], config);
      
      // Auth section should still exist if it has other properties
      expect(result.auth).toBeDefined();
      expect(result.auth?.providers).toBeUndefined();
      expect((result.auth as any).otherProperty).toBe('value');
    });
  });
  
  describe('Edge cases and error handling', () => {
    it('should handle config with undefined auth section', () => {
      const spec = createSpec();
      const config: AuthConfigFile = {}; // No auth section
      
      const result = reconciler.reconcile(spec, config);
      
      expect(result.reconciledProviders).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should handle config with null providers', () => {
      const spec = createSpec();
      const config: AuthConfigFile = {
        auth: {
          providers: undefined,
        },
      };
      
      const result = reconciler.reconcile(spec, config);
      
      expect(result.reconciledProviders).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should validate all custom URL fields', () => {
      const spec = createSpec();
      const config = createConfig([
        {
          provider: 'google',
          clientId: 'client-id',
          redirectUri: 'http://localhost:3000/callback',
          authorizationUrl: 'http://insecure.com/auth',
          tokenUrl: 'http://insecure.com/token',
          userInfoUrl: 'http://insecure.com/userinfo',
          refreshTokenEndpoint: 'http://insecure.com/refresh',
        },
      ]);
      
      const result = reconciler.reconcile(spec, config);
      
      // Should have 4 HTTPS validation errors
      expect(result.errors.filter(e => e.includes('HTTPS')).length).toBe(4);
    });
    
    it('should handle providers with all optional fields omitted', () => {
      const spec = createSpec();
      const config = createConfig([
        {
          provider: 'google',
          clientId: 'client-id',
          redirectUri: 'http://localhost:3000/callback',
          // All optional fields omitted
        },
      ]);
      
      const result = reconciler.reconcile(spec, config);
      
      expect(result.reconciledProviders).toBe(1);
      expect(result.errors).toHaveLength(0);
      
      const authAnnotation = (result.spec.info as Record<string, unknown>)['x-uigen-auth'] as {
        providers: OAuthProviderConfig[];
      };
      const provider = authAnnotation.providers[0];
      
      expect(provider.scopes).toBeUndefined();
      expect(provider.enabled).toBeUndefined();
      expect(provider.authorizationUrl).toBeUndefined();
    });
    
    it('should handle mixed enabled and undefined enabled values', () => {
      const spec = createSpec();
      const config = createConfig([
        {
          provider: 'google',
          clientId: 'google-id',
          redirectUri: 'http://localhost:3000/callback',
          enabled: true,
        },
        {
          provider: 'github',
          clientId: 'github-id',
          redirectUri: 'http://localhost:3000/callback',
          // enabled undefined (should be treated as enabled)
        },
        {
          provider: 'facebook',
          clientId: 'facebook-id',
          redirectUri: 'http://localhost:3000/callback',
          enabled: false,
        },
      ]);
      
      const result = reconciler.reconcile(spec, config);
      
      // Should have 2 providers (google and github, facebook is disabled)
      expect(result.reconciledProviders).toBe(2);
      
      const authAnnotation = (result.spec.info as Record<string, unknown>)['x-uigen-auth'] as {
        providers: OAuthProviderConfig[];
      };
      expect(authAnnotation.providers).toHaveLength(2);
      expect(authAnnotation.providers[0].provider).toBe('google');
      expect(authAnnotation.providers[1].provider).toBe('github');
    });
  });
});

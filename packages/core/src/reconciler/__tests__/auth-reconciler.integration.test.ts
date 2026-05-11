/**
 * Integration tests for AuthReconciler
 * 
 * Tests realistic end-to-end scenarios for bidirectional sync
 * of OAuth provider configurations between config.yaml and OpenAPI spec.
 */

import { describe, it, expect } from 'vitest';
import { AuthReconciler, type OAuthProviderConfig, type AuthConfigFile } from '../auth-reconciler.js';
import type { OpenAPIV3 } from 'openapi-types';

describe('AuthReconciler Integration Tests', () => {
  const reconciler = new AuthReconciler();
  
  // Helper to create a realistic OpenAPI spec
  const createRealisticSpec = (authAnnotation?: { providers: OAuthProviderConfig[] }): OpenAPIV3.Document => ({
    openapi: '3.0.0',
    info: {
      title: 'Meeting Minutes API',
      version: '1.0.0',
      description: 'API for managing meeting minutes',
      ...(authAnnotation && { 'x-uigen-auth': authAnnotation }),
    },
    paths: {
      '/meetings': {
        get: {
          summary: 'List meetings',
          responses: {
            '200': {
              description: 'Success',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      type: 'object',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  
  // Helper to create a realistic config
  const createRealisticConfig = (providers?: OAuthProviderConfig[]): AuthConfigFile => ({
    ...(providers && providers.length > 0 && {
      auth: {
        providers,
      },
    }),
  });
  
  describe('Scenario: Initial OAuth setup', () => {
    it('should add Google OAuth to empty spec from config', () => {
      const spec = createRealisticSpec();
      const config = createRealisticConfig([
        {
          provider: 'google',
          clientId: '${GOOGLE_CLIENT_ID}',
          redirectUri: 'http://localhost:3000/auth/callback',
          scopes: ['openid', 'email', 'profile'],
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
      expect(authAnnotation.providers[0]).toEqual({
        provider: 'google',
        clientId: '${GOOGLE_CLIENT_ID}',
        redirectUri: 'http://localhost:3000/auth/callback',
        scopes: ['openid', 'email', 'profile'],
      });
    });
  });
  
  describe('Scenario: Adding a second provider', () => {
    it('should add GitHub OAuth alongside existing Google OAuth', () => {
      const spec = createRealisticSpec({
        providers: [
          {
            provider: 'google',
            clientId: '${GOOGLE_CLIENT_ID}',
            redirectUri: 'http://localhost:3000/auth/callback',
            scopes: ['openid', 'email', 'profile'],
          },
        ],
      });
      
      const config = createRealisticConfig([
        {
          provider: 'google',
          clientId: '${GOOGLE_CLIENT_ID}',
          redirectUri: 'http://localhost:3000/auth/callback',
          scopes: ['openid', 'email', 'profile'],
        },
        {
          provider: 'github',
          clientId: '${GITHUB_CLIENT_ID}',
          redirectUri: 'http://localhost:3000/auth/callback',
          scopes: ['read:user', 'user:email'],
        },
      ]);
      
      const result = reconciler.reconcile(spec, config);
      
      expect(result.reconciledProviders).toBe(2);
      expect(result.errors).toHaveLength(0);
      
      const authAnnotation = (result.spec.info as Record<string, unknown>)['x-uigen-auth'] as {
        providers: OAuthProviderConfig[];
      };
      expect(authAnnotation.providers).toHaveLength(2);
      expect(authAnnotation.providers[0].provider).toBe('google');
      expect(authAnnotation.providers[1].provider).toBe('github');
    });
  });
  
  describe('Scenario: Temporarily disabling a provider', () => {
    it('should remove disabled provider from spec', () => {
      const spec = createRealisticSpec({
        providers: [
          {
            provider: 'google',
            clientId: '${GOOGLE_CLIENT_ID}',
            redirectUri: 'http://localhost:3000/auth/callback',
          },
          {
            provider: 'github',
            clientId: '${GITHUB_CLIENT_ID}',
            redirectUri: 'http://localhost:3000/auth/callback',
          },
        ],
      });
      
      const config = createRealisticConfig([
        {
          provider: 'google',
          clientId: '${GOOGLE_CLIENT_ID}',
          redirectUri: 'http://localhost:3000/auth/callback',
          enabled: true,
        },
        {
          provider: 'github',
          clientId: '${GITHUB_CLIENT_ID}',
          redirectUri: 'http://localhost:3000/auth/callback',
          enabled: false, // Temporarily disabled
        },
      ]);
      
      const result = reconciler.reconcile(spec, config);
      
      expect(result.reconciledProviders).toBe(1);
      
      const authAnnotation = (result.spec.info as Record<string, unknown>)['x-uigen-auth'] as {
        providers: OAuthProviderConfig[];
      };
      expect(authAnnotation.providers).toHaveLength(1);
      expect(authAnnotation.providers[0].provider).toBe('google');
      
      // Reconciled config only contains enabled providers
      expect(result.config.auth?.providers).toHaveLength(1);
      expect(result.config.auth?.providers?.[0].provider).toBe('google');
    });
  });
  
  describe('Scenario: Removing a provider permanently', () => {
    it('should remove provider from both spec and config', () => {
      const spec = createRealisticSpec({
        providers: [
          {
            provider: 'google',
            clientId: '${GOOGLE_CLIENT_ID}',
            redirectUri: 'http://localhost:3000/auth/callback',
          },
          {
            provider: 'github',
            clientId: '${GITHUB_CLIENT_ID}',
            redirectUri: 'http://localhost:3000/auth/callback',
          },
        ],
      });
      
      const config = createRealisticConfig([
        {
          provider: 'google',
          clientId: '${GOOGLE_CLIENT_ID}',
          redirectUri: 'http://localhost:3000/auth/callback',
        },
        // GitHub removed from config
      ]);
      
      const result = reconciler.reconcile(spec, config);
      
      expect(result.reconciledProviders).toBe(1);
      
      const authAnnotation = (result.spec.info as Record<string, unknown>)['x-uigen-auth'] as {
        providers: OAuthProviderConfig[];
      };
      expect(authAnnotation.providers).toHaveLength(1);
      expect(authAnnotation.providers[0].provider).toBe('google');
      
      expect(result.config.auth?.providers).toHaveLength(1);
      expect(result.config.auth?.providers?.[0].provider).toBe('google');
    });
  });
  
  describe('Scenario: Updating provider configuration', () => {
    it('should update clientId and redirectUri from config', () => {
      const spec = createRealisticSpec({
        providers: [
          {
            provider: 'google',
            clientId: 'old-client-id',
            redirectUri: 'http://localhost:3000/auth/callback',
          },
        ],
      });
      
      const config = createRealisticConfig([
        {
          provider: 'google',
          clientId: 'new-client-id',
          redirectUri: 'https://production.com/auth/callback',
          scopes: ['openid', 'email', 'profile'],
        },
      ]);
      
      const result = reconciler.reconcile(spec, config);
      
      const authAnnotation = (result.spec.info as Record<string, unknown>)['x-uigen-auth'] as {
        providers: OAuthProviderConfig[];
      };
      expect(authAnnotation.providers[0].clientId).toBe('new-client-id');
      expect(authAnnotation.providers[0].redirectUri).toBe('https://production.com/auth/callback');
      expect(authAnnotation.providers[0].scopes).toEqual(['openid', 'email', 'profile']);
    });
  });
  
  describe('Scenario: Custom OAuth provider endpoints', () => {
    it('should preserve custom authorization and token URLs', () => {
      const spec = createRealisticSpec();
      const config = createRealisticConfig([
        {
          provider: 'google',
          clientId: '${GOOGLE_CLIENT_ID}',
          redirectUri: 'http://localhost:3000/auth/callback',
          authorizationUrl: 'https://custom-auth.example.com/authorize',
          tokenUrl: 'https://custom-auth.example.com/token',
          userInfoUrl: 'https://custom-auth.example.com/userinfo',
          refreshTokenEndpoint: 'https://custom-auth.example.com/refresh',
        },
      ]);
      
      const result = reconciler.reconcile(spec, config);
      
      expect(result.errors).toHaveLength(0);
      
      const authAnnotation = (result.spec.info as Record<string, unknown>)['x-uigen-auth'] as {
        providers: OAuthProviderConfig[];
      };
      const provider = authAnnotation.providers[0];
      
      expect(provider.authorizationUrl).toBe('https://custom-auth.example.com/authorize');
      expect(provider.tokenUrl).toBe('https://custom-auth.example.com/token');
      expect(provider.userInfoUrl).toBe('https://custom-auth.example.com/userinfo');
      expect(provider.refreshTokenEndpoint).toBe('https://custom-auth.example.com/refresh');
    });
  });
  
  describe('Scenario: Multiple providers with different configurations', () => {
    it('should handle complex multi-provider setup', () => {
      const spec = createRealisticSpec();
      const config = createRealisticConfig([
        {
          provider: 'google',
          clientId: '${GOOGLE_CLIENT_ID}',
          redirectUri: 'http://localhost:3000/auth/callback',
          scopes: ['openid', 'email', 'profile'],
        },
        {
          provider: 'github',
          clientId: '${GITHUB_CLIENT_ID}',
          redirectUri: 'http://localhost:3000/auth/callback',
          scopes: ['read:user', 'user:email'],
        },
        {
          provider: 'microsoft',
          clientId: '${MICROSOFT_CLIENT_ID}',
          redirectUri: 'http://localhost:3000/auth/callback',
          scopes: ['openid', 'email', 'profile'],
        },
        {
          provider: 'facebook',
          clientId: '${FACEBOOK_CLIENT_ID}',
          redirectUri: 'http://localhost:3000/auth/callback',
          scopes: ['email', 'public_profile'],
          enabled: false, // Disabled
        },
      ]);
      
      const result = reconciler.reconcile(spec, config);
      
      expect(result.reconciledProviders).toBe(3); // Facebook is disabled
      expect(result.errors).toHaveLength(0);
      
      const authAnnotation = (result.spec.info as Record<string, unknown>)['x-uigen-auth'] as {
        providers: OAuthProviderConfig[];
      };
      expect(authAnnotation.providers).toHaveLength(3);
      expect(authAnnotation.providers.map(p => p.provider)).toEqual(['google', 'github', 'microsoft']);
    });
  });
  
  describe('Scenario: Removing all OAuth providers', () => {
    it('should remove x-uigen-auth annotation when all providers removed', () => {
      const spec = createRealisticSpec({
        providers: [
          {
            provider: 'google',
            clientId: '${GOOGLE_CLIENT_ID}',
            redirectUri: 'http://localhost:3000/auth/callback',
          },
        ],
      });
      
      const config = createRealisticConfig([]); // No providers
      
      const result = reconciler.reconcile(spec, config);
      
      expect(result.reconciledProviders).toBe(0);
      expect((result.spec.info as Record<string, unknown>)['x-uigen-auth']).toBeUndefined();
      expect(result.config.auth).toBeUndefined();
    });
  });
  
  describe('Scenario: Provider order preservation', () => {
    it('should maintain provider order from config when syncing to spec', () => {
      const spec = createRealisticSpec({
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
      
      // Config has different order
      const config = createRealisticConfig([
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
          provider: 'microsoft',
          clientId: 'microsoft-id',
          redirectUri: 'http://localhost:3000/callback',
        },
      ]);
      
      const result = reconciler.reconcile(spec, config);
      
      const authAnnotation = (result.spec.info as Record<string, unknown>)['x-uigen-auth'] as {
        providers: OAuthProviderConfig[];
      };
      
      // Should follow config order
      expect(authAnnotation.providers[0].provider).toBe('github');
      expect(authAnnotation.providers[1].provider).toBe('google');
      expect(authAnnotation.providers[2].provider).toBe('microsoft');
    });
  });
  
  describe('Scenario: Validation errors during reconciliation', () => {
    it('should report validation errors but still attempt reconciliation', () => {
      const spec = createRealisticSpec();
      const config = createRealisticConfig([
        {
          provider: 'google',
          clientId: '', // Invalid: empty
          redirectUri: 'not-a-valid-url', // Invalid: bad URL
        },
        {
          provider: 'invalid-provider' as 'google', // Invalid: unsupported provider
          clientId: 'client-id',
          redirectUri: 'http://localhost:3000/callback',
        },
      ]);
      
      const result = reconciler.reconcile(spec, config);
      
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('clientId'))).toBe(true);
      expect(result.errors.some(e => e.includes('redirectUri'))).toBe(true);
      expect(result.errors.some(e => e.includes('Unsupported provider'))).toBe(true);
    });
  });
  
  describe('Scenario: Environment variable placeholders', () => {
    it('should preserve environment variable placeholders in clientId', () => {
      const spec = createRealisticSpec();
      const config = createRealisticConfig([
        {
          provider: 'google',
          clientId: '${GOOGLE_CLIENT_ID}',
          redirectUri: '${OAUTH_REDIRECT_URI}',
          scopes: ['openid', 'email', 'profile'],
        },
      ]);
      
      const result = reconciler.reconcile(spec, config);
      
      const authAnnotation = (result.spec.info as Record<string, unknown>)['x-uigen-auth'] as {
        providers: OAuthProviderConfig[];
      };
      
      expect(authAnnotation.providers[0].clientId).toBe('${GOOGLE_CLIENT_ID}');
      expect(authAnnotation.providers[0].redirectUri).toBe('${OAUTH_REDIRECT_URI}');
    });
  });
  
  describe('Scenario: Round-trip consistency', () => {
    it('should maintain consistency through multiple reconciliation cycles', () => {
      const initialSpec = createRealisticSpec();
      const initialConfig = createRealisticConfig([
        {
          provider: 'google',
          clientId: 'google-id',
          redirectUri: 'http://localhost:3000/callback',
          scopes: ['openid', 'email'],
        },
      ]);
      
      // First reconciliation
      const result1 = reconciler.reconcile(initialSpec, initialConfig);
      
      // Second reconciliation with result from first
      const result2 = reconciler.reconcile(result1.spec, result1.config);
      
      // Third reconciliation
      const result3 = reconciler.reconcile(result2.spec, result2.config);
      
      // All should be identical
      expect(result1.reconciledProviders).toBe(result2.reconciledProviders);
      expect(result2.reconciledProviders).toBe(result3.reconciledProviders);
      
      const auth1 = (result1.spec.info as Record<string, unknown>)['x-uigen-auth'] as {
        providers: OAuthProviderConfig[];
      };
      const auth2 = (result2.spec.info as Record<string, unknown>)['x-uigen-auth'] as {
        providers: OAuthProviderConfig[];
      };
      const auth3 = (result3.spec.info as Record<string, unknown>)['x-uigen-auth'] as {
        providers: OAuthProviderConfig[];
      };
      
      expect(auth1.providers).toEqual(auth2.providers);
      expect(auth2.providers).toEqual(auth3.providers);
    });
  });
});

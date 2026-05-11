/**
 * Example-based tests for AuthReconciler
 * 
 * Demonstrates practical usage scenarios with realistic examples
 * showing how bidirectional sync works in real-world situations.
 */

import { describe, it, expect } from 'vitest';
import { AuthReconciler, type OAuthProviderConfig, type AuthConfigFile } from '../auth-reconciler.js';
import type { OpenAPIV3 } from 'openapi-types';

describe('AuthReconciler - Practical Examples', () => {
  const reconciler = new AuthReconciler();
  
  describe('Example 1: Developer adds OAuth to existing API', () => {
    it('should sync Google OAuth from config.yaml to OpenAPI spec', () => {
      // Starting point: Existing OpenAPI spec without OAuth
      const existingSpec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: {
          title: 'Meeting Minutes API',
          version: '1.0.0',
        },
        paths: {
          '/meetings': {
            get: {
              summary: 'List meetings',
              responses: {
                '200': {
                  description: 'Success',
                },
              },
            },
          },
        },
      };
      
      // Developer creates config.yaml with OAuth provider
      const config: AuthConfigFile = {
        auth: {
          providers: [
            {
              provider: 'google',
              clientId: '${GOOGLE_CLIENT_ID}',
              redirectUri: 'http://localhost:3000/auth/callback',
              scopes: ['openid', 'email', 'profile'],
            },
          ],
        },
      };
      
      // Reconcile
      const result = reconciler.reconcile(existingSpec, config);
      
      // Verify: OpenAPI spec now has x-uigen-auth annotation
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
      
      console.log('✅ Example 1: OAuth successfully added to spec from config');
    });
  });
  
  describe('Example 2: Developer switches from dev to production', () => {
    it('should update redirect URI when environment changes', () => {
      // Development spec
      const devSpec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: {
          title: 'Meeting Minutes API',
          version: '1.0.0',
          'x-uigen-auth': {
            providers: [
              {
                provider: 'google',
                clientId: 'dev-client-id',
                redirectUri: 'http://localhost:3000/auth/callback',
              },
            ],
          },
        },
        paths: {},
      };
      
      // Production config with updated redirect URI
      const prodConfig: AuthConfigFile = {
        auth: {
          providers: [
            {
              provider: 'google',
              clientId: '${GOOGLE_CLIENT_ID}', // Environment variable
              redirectUri: 'https://app.example.com/auth/callback', // Production URL
              scopes: ['openid', 'email', 'profile'],
            },
          ],
        },
      };
      
      // Reconcile
      const result = reconciler.reconcile(devSpec, prodConfig);
      
      // Verify: Spec updated with production values
      const authAnnotation = (result.spec.info as Record<string, unknown>)['x-uigen-auth'] as {
        providers: OAuthProviderConfig[];
      };
      
      expect(authAnnotation.providers[0].clientId).toBe('${GOOGLE_CLIENT_ID}');
      expect(authAnnotation.providers[0].redirectUri).toBe('https://app.example.com/auth/callback');
      
      console.log('✅ Example 2: Successfully switched from dev to production config');
    });
  });
  
  describe('Example 3: Developer adds multiple OAuth providers', () => {
    it('should sync multiple providers in correct order', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: {
          title: 'Meeting Minutes API',
          version: '1.0.0',
        },
        paths: {},
      };
      
      // Config with multiple providers in specific order
      const config: AuthConfigFile = {
        auth: {
          providers: [
            {
              provider: 'github',
              clientId: '${GITHUB_CLIENT_ID}',
              redirectUri: 'http://localhost:3000/auth/callback',
              scopes: ['read:user', 'user:email'],
            },
            {
              provider: 'google',
              clientId: '${GOOGLE_CLIENT_ID}',
              redirectUri: 'http://localhost:3000/auth/callback',
              scopes: ['openid', 'email', 'profile'],
            },
            {
              provider: 'microsoft',
              clientId: '${MICROSOFT_CLIENT_ID}',
              redirectUri: 'http://localhost:3000/auth/callback',
              scopes: ['openid', 'email', 'profile'],
            },
          ],
        },
      };
      
      // Reconcile
      const result = reconciler.reconcile(spec, config);
      
      // Verify: All providers added in correct order
      const authAnnotation = (result.spec.info as Record<string, unknown>)['x-uigen-auth'] as {
        providers: OAuthProviderConfig[];
      };
      
      expect(authAnnotation.providers).toHaveLength(3);
      expect(authAnnotation.providers[0].provider).toBe('github');
      expect(authAnnotation.providers[1].provider).toBe('google');
      expect(authAnnotation.providers[2].provider).toBe('microsoft');
      
      console.log('✅ Example 3: Multiple providers added in correct order');
    });
  });
  
  describe('Example 4: Developer temporarily disables a provider', () => {
    it('should remove disabled provider from spec', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: {
          title: 'Meeting Minutes API',
          version: '1.0.0',
          'x-uigen-auth': {
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
          },
        },
        paths: {},
      };
      
      // Config with GitHub temporarily disabled
      const config: AuthConfigFile = {
        auth: {
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
              enabled: false, // Temporarily disabled for testing
            },
          ],
        },
      };
      
      // Reconcile
      const result = reconciler.reconcile(spec, config);
      
      // Verify: Only Google provider in spec
      const authAnnotation = (result.spec.info as Record<string, unknown>)['x-uigen-auth'] as {
        providers: OAuthProviderConfig[];
      };
      
      expect(authAnnotation.providers).toHaveLength(1);
      expect(authAnnotation.providers[0].provider).toBe('google');
      
      console.log('✅ Example 4: Disabled provider removed from spec');
    });
  });
  
  describe('Example 5: Developer uses custom OAuth endpoints', () => {
    it('should preserve custom authorization and token URLs', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: {
          title: 'Enterprise API',
          version: '1.0.0',
        },
        paths: {},
      };
      
      // Config with custom OAuth endpoints (e.g., self-hosted GitLab)
      const config: AuthConfigFile = {
        auth: {
          providers: [
            {
              provider: 'github', // Using GitHub provider type but custom endpoints
              clientId: '${GITLAB_CLIENT_ID}',
              redirectUri: 'http://localhost:3000/auth/callback',
              authorizationUrl: 'https://gitlab.company.com/oauth/authorize',
              tokenUrl: 'https://gitlab.company.com/oauth/token',
              userInfoUrl: 'https://gitlab.company.com/api/v4/user',
              scopes: ['read_user', 'email'],
            },
          ],
        },
      };
      
      // Reconcile
      const result = reconciler.reconcile(spec, config);
      
      // Verify: Custom URLs preserved
      const authAnnotation = (result.spec.info as Record<string, unknown>)['x-uigen-auth'] as {
        providers: OAuthProviderConfig[];
      };
      
      const provider = authAnnotation.providers[0];
      expect(provider.authorizationUrl).toBe('https://gitlab.company.com/oauth/authorize');
      expect(provider.tokenUrl).toBe('https://gitlab.company.com/oauth/token');
      expect(provider.userInfoUrl).toBe('https://gitlab.company.com/api/v4/user');
      
      console.log('✅ Example 5: Custom OAuth endpoints preserved');
    });
  });
  
  describe('Example 6: Developer removes OAuth completely', () => {
    it('should clean up x-uigen-auth annotation when all providers removed', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: {
          title: 'Meeting Minutes API',
          version: '1.0.0',
          'x-uigen-auth': {
            providers: [
              {
                provider: 'google',
                clientId: '${GOOGLE_CLIENT_ID}',
                redirectUri: 'http://localhost:3000/auth/callback',
              },
            ],
          },
        },
        paths: {},
      };
      
      // Config with no providers (OAuth removed)
      const config: AuthConfigFile = {};
      
      // Reconcile
      const result = reconciler.reconcile(spec, config);
      
      // Verify: x-uigen-auth annotation removed
      expect((result.spec.info as Record<string, unknown>)['x-uigen-auth']).toBeUndefined();
      expect(result.config.auth).toBeUndefined();
      
      console.log('✅ Example 6: OAuth completely removed from spec');
    });
  });
  
  describe('Example 7: Config GUI workflow', () => {
    it('should handle typical Config GUI edit workflow', () => {
      // Step 1: User opens Config GUI, sees current spec
      const initialSpec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: {
          title: 'Meeting Minutes API',
          version: '1.0.0',
          'x-uigen-auth': {
            providers: [
              {
                provider: 'google',
                clientId: 'old-client-id',
                redirectUri: 'http://localhost:3000/auth/callback',
              },
            ],
          },
        },
        paths: {},
      };
      
      // Step 2: Config GUI extracts to config.yaml format
      const extractedConfig: AuthConfigFile = {
        auth: {
          providers: [
            {
              provider: 'google',
              clientId: 'old-client-id',
              redirectUri: 'http://localhost:3000/auth/callback',
            },
          ],
        },
      };
      
      // Step 3: User edits in GUI (updates client ID, adds GitHub)
      const editedConfig: AuthConfigFile = {
        auth: {
          providers: [
            {
              provider: 'google',
              clientId: '${GOOGLE_CLIENT_ID}', // Updated to env var
              redirectUri: 'http://localhost:3000/auth/callback',
              scopes: ['openid', 'email', 'profile'],
            },
            {
              provider: 'github',
              clientId: '${GITHUB_CLIENT_ID}', // New provider
              redirectUri: 'http://localhost:3000/auth/callback',
              scopes: ['read:user', 'user:email'],
            },
          ],
        },
      };
      
      // Step 4: Config GUI reconciles changes back to spec
      const result = reconciler.reconcile(initialSpec, editedConfig);
      
      // Verify: Spec updated with GUI changes
      const authAnnotation = (result.spec.info as Record<string, unknown>)['x-uigen-auth'] as {
        providers: OAuthProviderConfig[];
      };
      
      expect(authAnnotation.providers).toHaveLength(2);
      expect(authAnnotation.providers[0].clientId).toBe('${GOOGLE_CLIENT_ID}');
      expect(authAnnotation.providers[1].provider).toBe('github');
      
      console.log('✅ Example 7: Config GUI workflow completed successfully');
    });
  });
  
  describe('Example 8: Validation catches configuration errors', () => {
    it('should report validation errors for invalid configuration', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: {
          title: 'Meeting Minutes API',
          version: '1.0.0',
        },
        paths: {},
      };
      
      // Config with validation errors
      const invalidConfig: AuthConfigFile = {
        auth: {
          providers: [
            {
              provider: 'google',
              clientId: '', // ERROR: Empty client ID
              redirectUri: 'not-a-valid-url', // ERROR: Invalid URL
            },
            {
              provider: 'unsupported' as 'google', // ERROR: Unsupported provider
              clientId: 'client-id',
              redirectUri: 'http://localhost:3000/callback',
            },
          ],
        },
      };
      
      // Reconcile
      const result = reconciler.reconcile(spec, invalidConfig);
      
      // Verify: Validation errors reported
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('clientId'))).toBe(true);
      expect(result.errors.some(e => e.includes('redirectUri'))).toBe(true);
      expect(result.errors.some(e => e.includes('Unsupported provider'))).toBe(true);
      
      console.log('✅ Example 8: Validation errors caught:', result.errors);
    });
  });
});

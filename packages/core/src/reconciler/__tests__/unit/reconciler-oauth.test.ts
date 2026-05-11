/**
 * Unit tests for OAuth reconciliation integration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Reconciler } from '../../reconciler.js';
import type { OpenAPIV3 } from 'openapi-types';

describe('Reconciler - OAuth Integration', () => {
  let reconciler: Reconciler;

  beforeEach(() => {
    reconciler = new Reconciler({ logLevel: 'error' });
  });

  describe('OAuth Provider Reconciliation', () => {
    it('should reconcile OAuth providers from config to spec', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
      };

      const config = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {},
        auth: {
          providers: [
            {
              provider: 'google' as const,
              clientId: 'test-client-id',
              redirectUri: 'http://localhost:3000/callback',
              scopes: ['openid', 'email', 'profile'],
            },
          ],
        },
      };

      const result = reconciler.reconcile(spec, config);

      expect(result.spec.info).toHaveProperty('x-uigen-auth');
      const authAnnotation = (result.spec.info as any)['x-uigen-auth'];
      expect(authAnnotation).toBeDefined();
      expect(authAnnotation.providers).toHaveLength(1);
      expect(authAnnotation.providers[0]).toMatchObject({
        provider: 'google',
        clientId: 'test-client-id',
        redirectUri: 'http://localhost:3000/callback',
        scopes: ['openid', 'email', 'profile'],
      });
    });

    it('should add validation errors as warnings', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
      };

      const config = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {},
        auth: {
          providers: [
            {
              provider: 'google' as const,
              clientId: '', // Invalid: empty clientId
              redirectUri: 'http://localhost:3000/callback',
            },
          ],
        },
      };

      const result = reconciler.reconcile(spec, config);

      expect(result.warnings.length).toBeGreaterThan(0);
      const oauthWarnings = result.warnings.filter(
        (w) => w.elementPath === 'config.auth.providers'
      );
      expect(oauthWarnings.length).toBeGreaterThan(0);
      expect(oauthWarnings[0].message).toContain('clientId');
    });

    it('should handle multiple OAuth providers', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
      };

      const config = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {},
        auth: {
          providers: [
            {
              provider: 'google' as const,
              clientId: 'google-client-id',
              redirectUri: 'http://localhost:3000/callback',
            },
            {
              provider: 'github' as const,
              clientId: 'github-client-id',
              redirectUri: 'http://localhost:3000/callback',
            },
          ],
        },
      };

      const result = reconciler.reconcile(spec, config);

      const authAnnotation = (result.spec.info as any)['x-uigen-auth'];
      expect(authAnnotation.providers).toHaveLength(2);
      expect(authAnnotation.providers[0].provider).toBe('google');
      expect(authAnnotation.providers[1].provider).toBe('github');
    });

    it('should filter out disabled providers', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
      };

      const config = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {},
        auth: {
          providers: [
            {
              provider: 'google' as const,
              clientId: 'google-client-id',
              redirectUri: 'http://localhost:3000/callback',
              enabled: true,
            },
            {
              provider: 'github' as const,
              clientId: 'github-client-id',
              redirectUri: 'http://localhost:3000/callback',
              enabled: false,
            },
          ],
        },
      };

      const result = reconciler.reconcile(spec, config);

      const authAnnotation = (result.spec.info as any)['x-uigen-auth'];
      expect(authAnnotation.providers).toHaveLength(1);
      expect(authAnnotation.providers[0].provider).toBe('google');
    });

    it('should not add x-uigen-auth when no auth config exists', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
      };

      const config = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {},
      };

      const result = reconciler.reconcile(spec, config);

      expect((result.spec.info as any)['x-uigen-auth']).toBeUndefined();
    });

    it('should remove x-uigen-auth when all providers are disabled', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
          'x-uigen-auth': {
            providers: [
              {
                provider: 'google',
                clientId: 'old-client-id',
                redirectUri: 'http://localhost:3000/callback',
              },
            ],
          },
        },
        paths: {},
      };

      const config = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {},
        auth: {
          providers: [
            {
              provider: 'google' as const,
              clientId: 'google-client-id',
              redirectUri: 'http://localhost:3000/callback',
              enabled: false,
            },
          ],
        },
      };

      const result = reconciler.reconcile(spec, config);

      expect((result.spec.info as any)['x-uigen-auth']).toBeUndefined();
    });

    it('should work alongside annotation reconciliation', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {
          '/users': {
            get: {
              operationId: 'getUsers',
              responses: {
                '200': {
                  description: 'Success',
                },
              },
            },
          },
        },
      };

      const config = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          'GET:/users': {
            'x-custom': 'value',
          },
        },
        auth: {
          providers: [
            {
              provider: 'google' as const,
              clientId: 'google-client-id',
              redirectUri: 'http://localhost:3000/callback',
            },
          ],
        },
      };

      const result = reconciler.reconcile(spec, config);

      // Check annotation was applied
      const getUsersOp = (result.spec as OpenAPIV3.Document).paths['/users']?.get;
      expect(getUsersOp).toHaveProperty('x-custom', 'value');

      // Check OAuth was reconciled
      const authAnnotation = (result.spec.info as any)['x-uigen-auth'];
      expect(authAnnotation).toBeDefined();
      expect(authAnnotation.providers).toHaveLength(1);
    });
  });

  describe('OAuth Validation', () => {
    it('should validate provider field', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
      };

      const config = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {},
        auth: {
          providers: [
            {
              provider: 'invalid' as any,
              clientId: 'test-client-id',
              redirectUri: 'http://localhost:3000/callback',
            },
          ],
        },
      };

      const result = reconciler.reconcile(spec, config);

      const oauthWarnings = result.warnings.filter(
        (w) => w.elementPath === 'config.auth.providers'
      );
      expect(oauthWarnings.length).toBeGreaterThan(0);
      expect(oauthWarnings[0].message).toContain('Unsupported provider');
    });

    it('should validate redirectUri format', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
      };

      const config = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {},
        auth: {
          providers: [
            {
              provider: 'google' as const,
              clientId: 'test-client-id',
              redirectUri: 'not-a-url',
            },
          ],
        },
      };

      const result = reconciler.reconcile(spec, config);

      const oauthWarnings = result.warnings.filter(
        (w) => w.elementPath === 'config.auth.providers'
      );
      expect(oauthWarnings.length).toBeGreaterThan(0);
      expect(oauthWarnings[0].message).toContain('redirectUri');
    });

    it('should validate custom URLs are HTTPS', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
      };

      const config = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {},
        auth: {
          providers: [
            {
              provider: 'google' as const,
              clientId: 'test-client-id',
              redirectUri: 'http://localhost:3000/callback',
              authorizationUrl: 'http://example.com/auth', // Should be HTTPS
            },
          ],
        },
      };

      const result = reconciler.reconcile(spec, config);

      const oauthWarnings = result.warnings.filter(
        (w) => w.elementPath === 'config.auth.providers'
      );
      expect(oauthWarnings.length).toBeGreaterThan(0);
      expect(oauthWarnings[0].message).toContain('HTTPS');
    });

    it('should validate maximum provider limit', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
      };

      const providers = Array.from({ length: 11 }, (_, i) => ({
        provider: 'google' as const,
        clientId: `client-${i}`,
        redirectUri: 'http://localhost:3000/callback',
      }));

      const config = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {},
        auth: {
          providers,
        },
      };

      const result = reconciler.reconcile(spec, config);

      const oauthWarnings = result.warnings.filter(
        (w) => w.elementPath === 'config.auth.providers'
      );
      expect(oauthWarnings.length).toBeGreaterThan(0);
      expect(oauthWarnings[0].message).toContain('Maximum 10');
    });
  });
});

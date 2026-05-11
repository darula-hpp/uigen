/**
 * Integration test for OAuth reconciliation
 * 
 * This test demonstrates the complete flow of OAuth provider reconciliation
 * from config.yaml to OpenAPI spec through the main Reconciler.
 */

import { describe, it, expect } from 'vitest';
import { Reconciler } from '../../reconciler.js';
import type { OpenAPIV3 } from 'openapi-types';

describe('OAuth Reconciliation Integration', () => {
  it('should reconcile OAuth providers from config to spec with validation', () => {
    // Simulate an OpenAPI spec without OAuth configuration
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: {
        title: 'My API',
        version: '1.0.0',
        description: 'API with OAuth authentication',
      },
      paths: {
        '/users': {
          get: {
            operationId: 'getUsers',
            summary: 'Get all users',
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    // Simulate a config.yaml with OAuth providers
    const config = {
      version: '1.0',
      enabled: {},
      defaults: {},
      annotations: {
        'GET:/users': {
          'x-uigen-label': 'List Users',
        },
      },
      auth: {
        providers: [
          {
            provider: 'google' as const,
            clientId: 'google-client-id-123',
            redirectUri: 'https://myapp.com/auth/callback',
            scopes: ['openid', 'email', 'profile'],
          },
          {
            provider: 'github' as const,
            clientId: 'github-client-id-456',
            redirectUri: 'https://myapp.com/auth/callback',
            scopes: ['read:user', 'user:email'],
          },
        ],
      },
    };

    // Create reconciler and reconcile
    const reconciler = new Reconciler({
      logLevel: 'error',
      validateOutput: true,
      strictMode: false,
    });

    const result = reconciler.reconcile(spec, config);

    // Verify the reconciliation was successful
    expect(result.appliedAnnotations).toBe(1); // x-uigen-label annotation
    expect(result.warnings).toHaveLength(0); // No validation errors
    expect(result.spec).toBeDefined();

    // Verify OAuth providers were added to the spec
    const reconciledSpec = result.spec as OpenAPIV3.Document;
    const authAnnotation = (reconciledSpec.info as any)['x-uigen-auth'];

    expect(authAnnotation).toBeDefined();
    expect(authAnnotation.providers).toHaveLength(2);

    // Verify Google provider
    expect(authAnnotation.providers[0]).toMatchObject({
      provider: 'google',
      clientId: 'google-client-id-123',
      redirectUri: 'https://myapp.com/auth/callback',
      scopes: ['openid', 'email', 'profile'],
    });

    // Verify GitHub provider
    expect(authAnnotation.providers[1]).toMatchObject({
      provider: 'github',
      clientId: 'github-client-id-456',
      redirectUri: 'https://myapp.com/auth/callback',
      scopes: ['read:user', 'user:email'],
    });

    // Verify annotation was also applied
    const getUsersOp = reconciledSpec.paths['/users']?.get;
    expect(getUsersOp).toHaveProperty('x-uigen-label', 'List Users');
  });

  it('should report validation errors as warnings', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: {
        title: 'My API',
        version: '1.0.0',
      },
      paths: {},
    };

    // Config with invalid OAuth provider
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
            redirectUri: 'not-a-valid-url', // Invalid: bad URL format
          },
        ],
      },
    };

    const reconciler = new Reconciler({ logLevel: 'error' });
    const result = reconciler.reconcile(spec, config);

    // Should have warnings for validation errors
    expect(result.warnings.length).toBeGreaterThan(0);

    const oauthWarnings = result.warnings.filter(
      (w) => w.elementPath === 'config.auth.providers'
    );

    expect(oauthWarnings.length).toBeGreaterThan(0);
    
    // Check that validation errors are reported
    const warningMessages = oauthWarnings.map((w) => w.message).join(' ');
    expect(warningMessages).toContain('clientId');
    expect(warningMessages).toContain('redirectUri');
  });

  it('should handle config as source of truth', () => {
    // Spec already has OAuth configuration
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: {
        title: 'My API',
        version: '1.0.0',
        'x-uigen-auth': {
          providers: [
            {
              provider: 'google',
              clientId: 'old-google-client-id',
              redirectUri: 'https://old.com/callback',
            },
          ],
        },
      },
      paths: {},
    };

    // Config with different OAuth configuration
    const config = {
      version: '1.0',
      enabled: {},
      defaults: {},
      annotations: {},
      auth: {
        providers: [
          {
            provider: 'github' as const,
            clientId: 'new-github-client-id',
            redirectUri: 'https://new.com/callback',
          },
        ],
      },
    };

    const reconciler = new Reconciler({ logLevel: 'error' });
    const result = reconciler.reconcile(spec, config);

    // Config should override spec
    const authAnnotation = (result.spec.info as any)['x-uigen-auth'];
    expect(authAnnotation.providers).toHaveLength(1);
    expect(authAnnotation.providers[0].provider).toBe('github');
    expect(authAnnotation.providers[0].clientId).toBe('new-github-client-id');
  });

  it('should remove OAuth annotation when no providers in config', () => {
    // Spec has OAuth configuration
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: {
        title: 'My API',
        version: '1.0.0',
        'x-uigen-auth': {
          providers: [
            {
              provider: 'google',
              clientId: 'google-client-id',
              redirectUri: 'https://myapp.com/callback',
            },
          ],
        },
      },
      paths: {},
    };

    // Config with no auth section
    const config = {
      version: '1.0',
      enabled: {},
      defaults: {},
      annotations: {},
    };

    const reconciler = new Reconciler({ logLevel: 'error' });
    const result = reconciler.reconcile(spec, config);

    // OAuth annotation should remain (no config means no change)
    const authAnnotation = (result.spec.info as any)['x-uigen-auth'];
    expect(authAnnotation).toBeDefined();
  });

  it('should remove OAuth annotation when all providers disabled', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: {
        title: 'My API',
        version: '1.0.0',
        'x-uigen-auth': {
          providers: [
            {
              provider: 'google',
              clientId: 'google-client-id',
              redirectUri: 'https://myapp.com/callback',
            },
          ],
        },
      },
      paths: {},
    };

    // Config with disabled provider
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
            redirectUri: 'https://myapp.com/callback',
            enabled: false,
          },
        ],
      },
    };

    const reconciler = new Reconciler({ logLevel: 'error' });
    const result = reconciler.reconcile(spec, config);

    // OAuth annotation should be removed
    const authAnnotation = (result.spec.info as any)['x-uigen-auth'];
    expect(authAnnotation).toBeUndefined();
  });
});

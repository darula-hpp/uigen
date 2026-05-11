import { describe, it, expect } from 'vitest';
import { OpenAPI3Adapter } from '../openapi3.js';
import type { OpenAPIV3 } from 'openapi-types';
import { AnnotationHandlerRegistry } from '../annotations/registry.js';

describe('AuthHandler Registration - Task 4 Verification', () => {
  it('should have AuthHandler registered in the annotation registry', () => {
    const registry = AnnotationHandlerRegistry.getInstance();
    const authHandler = registry.get('x-uigen-auth');
    
    expect(authHandler).toBeDefined();
    expect(authHandler?.name).toBe('x-uigen-auth');
  });

  it('should process x-uigen-auth annotation from OpenAPI spec', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0',
        'x-uigen-auth': {
          providers: [
            {
              provider: 'google',
              clientId: 'test-client-id',
              redirectUri: 'http://localhost:3000/auth/callback',
              scopes: ['openid', 'email', 'profile']
            }
          ]
        }
      } as any,
      paths: {}
    };

    const adapter = new OpenAPI3Adapter(spec);
    const app = adapter.adapt();

    // Verify OAuth providers are extracted to IR
    expect(app.auth.oauthProviders).toBeDefined();
    expect(app.auth.oauthProviders?.length).toBe(1);
    expect(app.auth.oauthProviders?.[0].provider).toBe('google');
    expect(app.auth.oauthProviders?.[0].clientId).toBe('test-client-id');
    expect(app.auth.oauthProviders?.[0].redirectUri).toBe('http://localhost:3000/auth/callback');
    expect(app.auth.oauthProviders?.[0].scopes).toEqual(['openid', 'email', 'profile']);
  });

  it('should process multiple OAuth providers', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0',
        'x-uigen-auth': {
          providers: [
            {
              provider: 'google',
              clientId: 'google-client-id',
              redirectUri: 'http://localhost:3000/auth/callback'
            },
            {
              provider: 'github',
              clientId: 'github-client-id',
              redirectUri: 'http://localhost:3000/auth/callback'
            }
          ]
        }
      } as any,
      paths: {}
    };

    const adapter = new OpenAPI3Adapter(spec);
    const app = adapter.adapt();

    // Verify both providers are extracted
    expect(app.auth.oauthProviders?.length).toBe(2);
    expect(app.auth.oauthProviders?.[0].provider).toBe('google');
    expect(app.auth.oauthProviders?.[1].provider).toBe('github');
  });

  it('should apply default scopes when not provided', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0',
        'x-uigen-auth': {
          providers: [
            {
              provider: 'google',
              clientId: 'test-client-id',
              redirectUri: 'http://localhost:3000/auth/callback'
              // No scopes provided
            }
          ]
        }
      } as any,
      paths: {}
    };

    const adapter = new OpenAPI3Adapter(spec);
    const app = adapter.adapt();

    // Verify default scopes are applied
    expect(app.auth.oauthProviders?.[0].scopes).toEqual(['openid', 'email', 'profile']);
  });

  it('should filter out disabled providers', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0',
        'x-uigen-auth': {
          providers: [
            {
              provider: 'google',
              clientId: 'google-client-id',
              redirectUri: 'http://localhost:3000/auth/callback',
              enabled: true
            },
            {
              provider: 'github',
              clientId: 'github-client-id',
              redirectUri: 'http://localhost:3000/auth/callback',
              enabled: false
            }
          ]
        }
      } as any,
      paths: {}
    };

    const adapter = new OpenAPI3Adapter(spec);
    const app = adapter.adapt();

    // Verify only enabled provider is included
    expect(app.auth.oauthProviders?.length).toBe(1);
    expect(app.auth.oauthProviders?.[0].provider).toBe('google');
  });

  it('should handle missing x-uigen-auth annotation gracefully', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0'
        // No x-uigen-auth
      },
      paths: {}
    };

    const adapter = new OpenAPI3Adapter(spec);
    const app = adapter.adapt();

    // Should not crash, oauthProviders should be undefined or empty
    expect(app.auth.oauthProviders === undefined || app.auth.oauthProviders.length === 0).toBe(true);
  });
});

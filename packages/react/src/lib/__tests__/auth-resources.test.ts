import { describe, it, expect } from 'vitest';
import { isAuthResource, filterAuthResources } from '../auth-resources';
import type { UIGenApp, Resource } from '@uigen-dev/core';

describe('auth-resources', () => {
  const createMockResource = (slug: string, operationPaths: string[]): Resource => ({
    name: slug,
    slug,
    uigenId: `resource-${slug}`,
    operations: operationPaths.map((path, idx) => ({
      id: `${slug}-op-${idx}`,
      uigenId: `op-${slug}-${idx}`,
      method: 'POST' as const,
      path,
      viewHint: 'create' as const,
      parameters: [],
      responses: {},
    })),
    schema: {
      type: 'object',
      key: slug,
      children: [],
    },
    relationships: [],
  });

  const createMockConfig = (
    resources: Resource[],
    authEndpoints: {
      login?: string[];
      signUp?: string[];
      passwordReset?: string[];
      refresh?: string[];
    } = {}
  ): UIGenApp => ({
    meta: { title: 'Test API', version: '1.0.0' },
    resources,
    auth: {
      schemes: [],
      globalRequired: false,
      loginEndpoints: authEndpoints.login?.map(path => ({
        path,
        method: 'POST' as const,
        requestBodySchema: { type: 'object', key: 'login', children: [] },
        tokenPath: 'token',
      })),
      signUpEndpoints: authEndpoints.signUp?.map(path => ({
        path,
        method: 'POST' as const,
        requestBodySchema: { type: 'object', key: 'signup', children: [] },
      })),
      passwordResetEndpoints: authEndpoints.passwordReset?.map(path => ({
        path,
        method: 'POST' as const,
        requestBodySchema: { type: 'object', key: 'reset', children: [] },
      })),
      refreshEndpoints: authEndpoints.refresh?.map(path => ({
        path,
        method: 'POST' as const,
        requestBodySchema: { type: 'object', key: 'refresh', children: [] },
      })),
    },
    dashboard: { enabled: true, widgets: [] },
    servers: [{ url: 'http://localhost:3000' }],
  });

  describe('isAuthResource', () => {
    it('should identify login resources', () => {
      const loginResource = createMockResource('Login', ['/auth/login']);
      const config = createMockConfig([loginResource], { login: ['/auth/login'] });

      expect(isAuthResource(loginResource, config)).toBe(true);
    });

    it('should identify signup resources', () => {
      const signupResource = createMockResource('SignUp', ['/auth/signup']);
      const config = createMockConfig([signupResource], { signUp: ['/auth/signup'] });

      expect(isAuthResource(signupResource, config)).toBe(true);
    });

    it('should identify password reset resources', () => {
      const resetResource = createMockResource('PasswordReset', ['/auth/password-reset']);
      const config = createMockConfig([resetResource], { passwordReset: ['/auth/password-reset'] });

      expect(isAuthResource(resetResource, config)).toBe(true);
    });

    it('should identify refresh token resources', () => {
      const refreshResource = createMockResource('Refresh', ['/auth/refresh']);
      const config = createMockConfig([refreshResource], { refresh: ['/auth/refresh'] });

      expect(isAuthResource(refreshResource, config)).toBe(true);
    });

    it('should not identify regular resources as auth resources', () => {
      const userResource = createMockResource('Users', ['/users']);
      const config = createMockConfig([userResource], { login: ['/auth/login'] });

      expect(isAuthResource(userResource, config)).toBe(false);
    });

    it('should identify resources with multiple operations if any match auth endpoints', () => {
      const mixedResource = createMockResource('Auth', ['/auth/login', '/auth/logout']);
      const config = createMockConfig([mixedResource], { login: ['/auth/login'] });

      expect(isAuthResource(mixedResource, config)).toBe(true);
    });

    it('should handle resources with no auth endpoints configured', () => {
      const userResource = createMockResource('Users', ['/users']);
      const config = createMockConfig([userResource], {});

      expect(isAuthResource(userResource, config)).toBe(false);
    });
  });

  describe('filterAuthResources', () => {
    it('should filter out all auth resources', () => {
      const loginResource = createMockResource('Login', ['/auth/login']);
      const signupResource = createMockResource('SignUp', ['/auth/signup']);
      const userResource = createMockResource('Users', ['/users']);
      const postResource = createMockResource('Posts', ['/posts']);

      const config = createMockConfig(
        [loginResource, signupResource, userResource, postResource],
        {
          login: ['/auth/login'],
          signUp: ['/auth/signup'],
        }
      );

      const filtered = filterAuthResources(config.resources, config);

      expect(filtered).toHaveLength(2);
      expect(filtered.map(r => r.slug)).toEqual(['Users', 'Posts']);
    });

    it('should return all resources when no auth endpoints are configured', () => {
      const userResource = createMockResource('Users', ['/users']);
      const postResource = createMockResource('Posts', ['/posts']);

      const config = createMockConfig([userResource, postResource], {});

      const filtered = filterAuthResources(config.resources, config);

      expect(filtered).toHaveLength(2);
      expect(filtered.map(r => r.slug)).toEqual(['Users', 'Posts']);
    });

    it('should return empty array when all resources are auth resources', () => {
      const loginResource = createMockResource('Login', ['/auth/login']);
      const signupResource = createMockResource('SignUp', ['/auth/signup']);

      const config = createMockConfig([loginResource, signupResource], {
        login: ['/auth/login'],
        signUp: ['/auth/signup'],
      });

      const filtered = filterAuthResources(config.resources, config);

      expect(filtered).toHaveLength(0);
    });

    it('should handle empty resource array', () => {
      const config = createMockConfig([], { login: ['/auth/login'] });

      const filtered = filterAuthResources(config.resources, config);

      expect(filtered).toHaveLength(0);
    });
  });
});

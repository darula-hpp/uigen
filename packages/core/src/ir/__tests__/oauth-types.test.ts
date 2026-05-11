import { describe, it, expect } from 'vitest';
import type { AuthConfig, OAuthProvider } from '../types';

describe('OAuth Types', () => {
  describe('OAuthProvider interface', () => {
    it('should accept valid OAuth provider configuration', () => {
      const provider: OAuthProvider = {
        provider: 'google',
        clientId: 'test-client-id',
        redirectUri: 'http://localhost:3000/auth/callback',
        scopes: ['openid', 'email', 'profile'],
        enabled: true,
        authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
        refreshTokenEndpoint: 'https://oauth2.googleapis.com/token',
      };

      expect(provider.provider).toBe('google');
      expect(provider.clientId).toBe('test-client-id');
      expect(provider.scopes).toHaveLength(3);
    });

    it('should accept all supported provider types', () => {
      const providers: OAuthProvider['provider'][] = [
        'google',
        'github',
        'facebook',
        'microsoft',
      ];

      providers.forEach((providerType) => {
        const provider: OAuthProvider = {
          provider: providerType,
          clientId: 'test-client-id',
          redirectUri: 'http://localhost:3000/auth/callback',
          scopes: [],
          enabled: true,
          authorizationUrl: 'https://example.com/auth',
          tokenUrl: 'https://example.com/token',
          userInfoUrl: 'https://example.com/userinfo',
        };

        expect(provider.provider).toBe(providerType);
      });
    });

    it('should allow optional refreshTokenEndpoint', () => {
      const providerWithRefresh: OAuthProvider = {
        provider: 'google',
        clientId: 'test-client-id',
        redirectUri: 'http://localhost:3000/auth/callback',
        scopes: [],
        enabled: true,
        authorizationUrl: 'https://example.com/auth',
        tokenUrl: 'https://example.com/token',
        userInfoUrl: 'https://example.com/userinfo',
        refreshTokenEndpoint: 'https://example.com/refresh',
      };

      const providerWithoutRefresh: OAuthProvider = {
        provider: 'github',
        clientId: 'test-client-id',
        redirectUri: 'http://localhost:3000/auth/callback',
        scopes: [],
        enabled: true,
        authorizationUrl: 'https://example.com/auth',
        tokenUrl: 'https://example.com/token',
        userInfoUrl: 'https://example.com/userinfo',
      };

      expect(providerWithRefresh.refreshTokenEndpoint).toBeDefined();
      expect(providerWithoutRefresh.refreshTokenEndpoint).toBeUndefined();
    });
  });

  describe('AuthConfig with oauthProviders', () => {
    it('should accept AuthConfig with oauthProviders array', () => {
      const authConfig: AuthConfig = {
        schemes: [],
        globalRequired: false,
        oauthProviders: [
          {
            provider: 'google',
            clientId: 'google-client-id',
            redirectUri: 'http://localhost:3000/auth/callback',
            scopes: ['openid', 'email', 'profile'],
            enabled: true,
            authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
            tokenUrl: 'https://oauth2.googleapis.com/token',
            userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
          },
          {
            provider: 'github',
            clientId: 'github-client-id',
            redirectUri: 'http://localhost:3000/auth/callback',
            scopes: ['read:user', 'user:email'],
            enabled: true,
            authorizationUrl: 'https://github.com/login/oauth/authorize',
            tokenUrl: 'https://github.com/login/oauth/access_token',
            userInfoUrl: 'https://api.github.com/user',
          },
        ],
      };

      expect(authConfig.oauthProviders).toHaveLength(2);
      expect(authConfig.oauthProviders?.[0].provider).toBe('google');
      expect(authConfig.oauthProviders?.[1].provider).toBe('github');
    });

    it('should accept AuthConfig without oauthProviders (optional field)', () => {
      const authConfig: AuthConfig = {
        schemes: [],
        globalRequired: false,
      };

      expect(authConfig.oauthProviders).toBeUndefined();
    });

    it('should accept AuthConfig with empty oauthProviders array', () => {
      const authConfig: AuthConfig = {
        schemes: [],
        globalRequired: false,
        oauthProviders: [],
      };

      expect(authConfig.oauthProviders).toHaveLength(0);
    });

    it('should work with existing AuthConfig fields', () => {
      const authConfig: AuthConfig = {
        schemes: [
          {
            type: 'bearer',
            name: 'bearerAuth',
          },
        ],
        globalRequired: true,
        loginEndpoints: [
          {
            path: '/auth/login',
            method: 'POST',
            requestBodySchema: {
              type: 'object',
              key: 'loginRequest',
              label: 'Login Request',
              required: true,
            },
            tokenPath: 'token',
          },
        ],
        oauthProviders: [
          {
            provider: 'google',
            clientId: 'google-client-id',
            redirectUri: 'http://localhost:3000/auth/callback',
            scopes: ['openid', 'email'],
            enabled: true,
            authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
            tokenUrl: 'https://oauth2.googleapis.com/token',
            userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
          },
        ],
      };

      expect(authConfig.schemes).toHaveLength(1);
      expect(authConfig.loginEndpoints).toHaveLength(1);
      expect(authConfig.oauthProviders).toHaveLength(1);
      expect(authConfig.globalRequired).toBe(true);
    });
  });
});

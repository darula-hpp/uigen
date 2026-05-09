import { describe, it, expect } from 'vitest';
import {
  OAUTH_PROVIDERS,
  getProviderMetadata,
  getSupportedProviders,
  isProviderSupported,
  type ProviderMetadata
} from '../oauth-providers';

describe('oauth-providers', () => {
  describe('OAUTH_PROVIDERS constant', () => {
    it('should contain metadata for all supported providers', () => {
      expect(OAUTH_PROVIDERS).toHaveProperty('google');
      expect(OAUTH_PROVIDERS).toHaveProperty('github');
      expect(OAUTH_PROVIDERS).toHaveProperty('facebook');
      expect(OAUTH_PROVIDERS).toHaveProperty('microsoft');
    });

    it('should have exactly 4 providers', () => {
      expect(Object.keys(OAUTH_PROVIDERS)).toHaveLength(4);
    });

    describe('Google provider metadata', () => {
      const google = OAUTH_PROVIDERS.google;

      it('should have correct display information', () => {
        expect(google.name).toBe('google');
        expect(google.displayName).toBe('Google');
        expect(google.brandColor).toBe('#4285F4');
        expect(google.brandColorDark).toBe('#4285F4');
        expect(google.logoUrl).toBe('/oauth-logos/google.svg');
      });

      it('should have correct default OAuth endpoints', () => {
        expect(google.defaultAuthorizationUrl).toBe('https://accounts.google.com/o/oauth2/v2/auth');
        expect(google.defaultTokenUrl).toBe('https://oauth2.googleapis.com/token');
        expect(google.defaultUserInfoUrl).toBe('https://www.googleapis.com/oauth2/v2/userinfo');
      });

      it('should have correct default scopes', () => {
        expect(google.defaultScopes).toEqual(['openid', 'email', 'profile']);
      });

      it('should use space as scope separator', () => {
        expect(google.scopeSeparator).toBe(' ');
      });
    });

    describe('GitHub provider metadata', () => {
      const github = OAUTH_PROVIDERS.github;

      it('should have correct display information', () => {
        expect(github.name).toBe('github');
        expect(github.displayName).toBe('GitHub');
        expect(github.brandColor).toBe('#24292e');
        expect(github.brandColorDark).toBe('#ffffff');
        expect(github.logoUrl).toBe('/oauth-logos/github.svg');
      });

      it('should have correct default OAuth endpoints', () => {
        expect(github.defaultAuthorizationUrl).toBe('https://github.com/login/oauth/authorize');
        expect(github.defaultTokenUrl).toBe('https://github.com/login/oauth/access_token');
        expect(github.defaultUserInfoUrl).toBe('https://api.github.com/user');
      });

      it('should have correct default scopes', () => {
        expect(github.defaultScopes).toEqual(['read:user', 'user:email']);
      });

      it('should use space as scope separator', () => {
        expect(github.scopeSeparator).toBe(' ');
      });
    });

    describe('Facebook provider metadata', () => {
      const facebook = OAUTH_PROVIDERS.facebook;

      it('should have correct display information', () => {
        expect(facebook.name).toBe('facebook');
        expect(facebook.displayName).toBe('Facebook');
        expect(facebook.brandColor).toBe('#1877F2');
        expect(facebook.brandColorDark).toBe('#1877F2');
        expect(facebook.logoUrl).toBe('/oauth-logos/facebook.svg');
      });

      it('should have correct default OAuth endpoints', () => {
        expect(facebook.defaultAuthorizationUrl).toBe('https://www.facebook.com/v12.0/dialog/oauth');
        expect(facebook.defaultTokenUrl).toBe('https://graph.facebook.com/v12.0/oauth/access_token');
        expect(facebook.defaultUserInfoUrl).toBe('https://graph.facebook.com/me?fields=id,name,email,picture');
      });

      it('should have correct default scopes', () => {
        expect(facebook.defaultScopes).toEqual(['email', 'public_profile']);
      });

      it('should use comma as scope separator', () => {
        expect(facebook.scopeSeparator).toBe(',');
      });
    });

    describe('Microsoft provider metadata', () => {
      const microsoft = OAUTH_PROVIDERS.microsoft;

      it('should have correct display information', () => {
        expect(microsoft.name).toBe('microsoft');
        expect(microsoft.displayName).toBe('Microsoft');
        expect(microsoft.brandColor).toBe('#00A4EF');
        expect(microsoft.brandColorDark).toBe('#00A4EF');
        expect(microsoft.logoUrl).toBe('/oauth-logos/microsoft.svg');
      });

      it('should have correct default OAuth endpoints', () => {
        expect(microsoft.defaultAuthorizationUrl).toBe('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
        expect(microsoft.defaultTokenUrl).toBe('https://login.microsoftonline.com/common/oauth2/v2.0/token');
        expect(microsoft.defaultUserInfoUrl).toBe('https://graph.microsoft.com/v1.0/me');
      });

      it('should have correct default scopes', () => {
        expect(microsoft.defaultScopes).toEqual(['openid', 'email', 'profile']);
      });

      it('should use space as scope separator', () => {
        expect(microsoft.scopeSeparator).toBe(' ');
      });
    });

    it('should have all required fields for each provider', () => {
      const requiredFields: (keyof ProviderMetadata)[] = [
        'name',
        'displayName',
        'brandColor',
        'brandColorDark',
        'logoUrl',
        'defaultScopes',
        'defaultAuthorizationUrl',
        'defaultTokenUrl',
        'defaultUserInfoUrl',
        'scopeSeparator'
      ];

      Object.values(OAUTH_PROVIDERS).forEach(provider => {
        requiredFields.forEach(field => {
          expect(provider).toHaveProperty(field);
          expect(provider[field]).toBeDefined();
        });
      });
    });

    it('should have valid HTTPS URLs for all OAuth endpoints', () => {
      const httpsPattern = /^https:\/\/.+/;

      Object.values(OAUTH_PROVIDERS).forEach(provider => {
        expect(provider.defaultAuthorizationUrl).toMatch(httpsPattern);
        expect(provider.defaultTokenUrl).toMatch(httpsPattern);
        expect(provider.defaultUserInfoUrl).toMatch(httpsPattern);
      });
    });

    it('should have valid hex color codes', () => {
      const hexColorPattern = /^#[0-9A-Fa-f]{6}$/;

      Object.values(OAUTH_PROVIDERS).forEach(provider => {
        expect(provider.brandColor).toMatch(hexColorPattern);
        expect(provider.brandColorDark).toMatch(hexColorPattern);
      });
    });

    it('should have non-empty default scopes', () => {
      Object.values(OAUTH_PROVIDERS).forEach(provider => {
        expect(provider.defaultScopes).toBeInstanceOf(Array);
        expect(provider.defaultScopes.length).toBeGreaterThan(0);
        provider.defaultScopes.forEach(scope => {
          expect(scope).toBeTruthy();
          expect(typeof scope).toBe('string');
        });
      });
    });
  });

  describe('getProviderMetadata', () => {
    it('should return metadata for supported providers', () => {
      const google = getProviderMetadata('google');
      expect(google).toBeDefined();
      expect(google?.name).toBe('google');

      const github = getProviderMetadata('github');
      expect(github).toBeDefined();
      expect(github?.name).toBe('github');

      const facebook = getProviderMetadata('facebook');
      expect(facebook).toBeDefined();
      expect(facebook?.name).toBe('facebook');

      const microsoft = getProviderMetadata('microsoft');
      expect(microsoft).toBeDefined();
      expect(microsoft?.name).toBe('microsoft');
    });

    it('should return undefined for unsupported providers', () => {
      expect(getProviderMetadata('twitter')).toBeUndefined();
      expect(getProviderMetadata('linkedin')).toBeUndefined();
      expect(getProviderMetadata('invalid')).toBeUndefined();
    });

    it('should be case-sensitive', () => {
      expect(getProviderMetadata('Google')).toBeUndefined();
      expect(getProviderMetadata('GOOGLE')).toBeUndefined();
      expect(getProviderMetadata('google')).toBeDefined();
    });
  });

  describe('getSupportedProviders', () => {
    it('should return array of all supported provider names', () => {
      const providers = getSupportedProviders();
      expect(providers).toBeInstanceOf(Array);
      expect(providers).toHaveLength(4);
      expect(providers).toContain('google');
      expect(providers).toContain('github');
      expect(providers).toContain('facebook');
      expect(providers).toContain('microsoft');
    });

    it('should return the same array on multiple calls', () => {
      const providers1 = getSupportedProviders();
      const providers2 = getSupportedProviders();
      expect(providers1).toEqual(providers2);
    });
  });

  describe('isProviderSupported', () => {
    it('should return true for supported providers', () => {
      expect(isProviderSupported('google')).toBe(true);
      expect(isProviderSupported('github')).toBe(true);
      expect(isProviderSupported('facebook')).toBe(true);
      expect(isProviderSupported('microsoft')).toBe(true);
    });

    it('should return false for unsupported providers', () => {
      expect(isProviderSupported('twitter')).toBe(false);
      expect(isProviderSupported('linkedin')).toBe(false);
      expect(isProviderSupported('invalid')).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(isProviderSupported('Google')).toBe(false);
      expect(isProviderSupported('GOOGLE')).toBe(false);
      expect(isProviderSupported('google')).toBe(true);
    });

    it('should handle empty string', () => {
      expect(isProviderSupported('')).toBe(false);
    });
  });
});

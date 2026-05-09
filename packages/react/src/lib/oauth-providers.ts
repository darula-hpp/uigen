/**
 * OAuth Provider Metadata
 * 
 * Centralized configuration for OAuth 2.0 providers including display names,
 * brand colors, default URLs, and default scopes.
 * 
 * This metadata is used by:
 * - OAuthButton component for styling and display
 * - OAuthStrategy for constructing authorization URLs and token exchange
 * - AuthHandler for applying default values when custom URLs are omitted
 */

/**
 * Metadata for a single OAuth provider
 */
export interface ProviderMetadata {
  /** Internal provider identifier */
  name: string;
  /** Display name shown to users */
  displayName: string;
  /** Brand color for light theme (hex format) */
  brandColor: string;
  /** Brand color for dark theme (hex format) */
  brandColorDark: string;
  /** Path to provider logo SVG */
  logoUrl: string;
  /** Default OAuth scopes when none specified */
  defaultScopes: string[];
  /** Default authorization endpoint URL */
  defaultAuthorizationUrl: string;
  /** Default token exchange endpoint URL */
  defaultTokenUrl: string;
  /** Default user info endpoint URL */
  defaultUserInfoUrl: string;
  /** Separator character for joining multiple scopes (space or comma) */
  scopeSeparator: string;
}

/**
 * OAuth provider metadata registry
 * 
 * Contains configuration for Google, GitHub, Facebook, and Microsoft OAuth providers.
 * Each provider includes:
 * - Display information (name, colors, logo)
 * - Default OAuth endpoints (authorization, token, userInfo)
 * - Default scopes
 * - Scope separator for URL construction
 */
export const OAUTH_PROVIDERS: Record<string, ProviderMetadata> = {
  google: {
    name: 'google',
    displayName: 'Google',
    brandColor: '#4285F4',
    brandColorDark: '#4285F4',
    logoUrl: '/oauth-logos/google.svg',
    defaultScopes: ['openid', 'email', 'profile'],
    defaultAuthorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    defaultTokenUrl: 'https://oauth2.googleapis.com/token',
    defaultUserInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scopeSeparator: ' '
  },
  github: {
    name: 'github',
    displayName: 'GitHub',
    brandColor: '#24292e',
    brandColorDark: '#ffffff',
    logoUrl: '/oauth-logos/github.svg',
    defaultScopes: ['read:user', 'user:email'],
    defaultAuthorizationUrl: 'https://github.com/login/oauth/authorize',
    defaultTokenUrl: 'https://github.com/login/oauth/access_token',
    defaultUserInfoUrl: 'https://api.github.com/user',
    scopeSeparator: ' '
  },
  facebook: {
    name: 'facebook',
    displayName: 'Facebook',
    brandColor: '#1877F2',
    brandColorDark: '#1877F2',
    logoUrl: '/oauth-logos/facebook.svg',
    defaultScopes: ['email', 'public_profile'],
    defaultAuthorizationUrl: 'https://www.facebook.com/v12.0/dialog/oauth',
    defaultTokenUrl: 'https://graph.facebook.com/v12.0/oauth/access_token',
    defaultUserInfoUrl: 'https://graph.facebook.com/me?fields=id,name,email,picture',
    scopeSeparator: ','
  },
  microsoft: {
    name: 'microsoft',
    displayName: 'Microsoft',
    brandColor: '#00A4EF',
    brandColorDark: '#00A4EF',
    logoUrl: '/oauth-logos/microsoft.svg',
    defaultScopes: ['openid', 'email', 'profile'],
    defaultAuthorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    defaultTokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    defaultUserInfoUrl: 'https://graph.microsoft.com/v1.0/me',
    scopeSeparator: ' '
  }
};

/**
 * Get provider metadata by name
 * @param provider Provider identifier (google, github, facebook, microsoft)
 * @returns Provider metadata or undefined if not found
 */
export function getProviderMetadata(provider: string): ProviderMetadata | undefined {
  return OAUTH_PROVIDERS[provider];
}

/**
 * Get all supported provider names
 * @returns Array of provider identifiers
 */
export function getSupportedProviders(): string[] {
  return Object.keys(OAUTH_PROVIDERS);
}

/**
 * Check if a provider is supported
 * @param provider Provider identifier to check
 * @returns True if provider is supported
 */
export function isProviderSupported(provider: string): boolean {
  return provider in OAUTH_PROVIDERS;
}

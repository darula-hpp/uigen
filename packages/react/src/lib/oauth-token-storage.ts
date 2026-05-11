/**
 * OAuth Token Storage Utilities
 * 
 * Provides functions for storing and retrieving OAuth tokens and related data
 * in browser localStorage. Used by OAuthStrategy for token management.
 */

const ACCESS_TOKEN_KEY = 'oauth_access_token';
const REFRESH_TOKEN_KEY = 'oauth_refresh_token';
const AUTH_METHOD_KEY = 'auth_method';
const USER_PROFILE_KEY = 'oauth_user_profile';

/**
 * Store OAuth access token in localStorage
 */
export function storeAccessToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

/**
 * Retrieve OAuth access token from localStorage
 */
export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * Store OAuth refresh token in localStorage
 */
export function storeRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

/**
 * Retrieve OAuth refresh token from localStorage
 */
export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Store authentication method ('oauth' or 'credentials')
 */
export function storeAuthMethod(method: 'oauth' | 'credentials'): void {
  localStorage.setItem(AUTH_METHOD_KEY, method);
}

/**
 * Retrieve authentication method from localStorage
 */
export function getAuthMethod(): 'oauth' | 'credentials' | null {
  const method = localStorage.getItem(AUTH_METHOD_KEY);
  if (method === 'oauth' || method === 'credentials') {
    return method;
  }
  return null;
}

/**
 * Clear all OAuth tokens and related data from localStorage
 */
export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(AUTH_METHOD_KEY);
  localStorage.removeItem(USER_PROFILE_KEY);
}

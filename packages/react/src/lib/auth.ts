/**
 * Authentication utilities for managing credentials in session storage
 * Implements Requirements 16.3, 16.4, 16.5, 17.4, 17.5, 67.1-67.4
 */

export interface AuthCredentials {
  type: 'bearer' | 'apiKey' | 'none';
  token?: string;
  apiKey?: string;
  apiKeyName?: string;
  apiKeyIn?: 'header' | 'query';
}

const AUTH_STORAGE_KEY = 'uigen_auth';

/**
 * Store authentication credentials in session storage
 * Requirement 67.1: Store credentials in session storage
 */
export function storeAuthCredentials(credentials: AuthCredentials): void {
  sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(credentials));
}

/**
 * Retrieve authentication credentials from session storage
 * Requirement 67.2: Restore credentials on page load
 */
export function getAuthCredentials(): AuthCredentials | null {
  const stored = sessionStorage.getItem(AUTH_STORAGE_KEY);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored) as AuthCredentials;
  } catch {
    return null;
  }
}

/**
 * Clear authentication credentials from session storage
 * Requirement 67.3: Clear credentials on logout
 */
export function clearAuthCredentials(): void {
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
}

/**
 * Check if user is authenticated
 * Requirement 16.6: Display authentication status
 */
export function isAuthenticated(): boolean {
  const stored = sessionStorage.getItem('uigen_auth');
  if (!stored) return false;

  try {
    const data = JSON.parse(stored) as any;

    if (data.type === 'none') return true;
    if (data.type === 'bearer') return !!data.token;
    if (data.type === 'apiKey') return !!data.apiKey && !!data.apiKeyName;
    if (data.type === 'basic') return !!data.credentials;
    if (data.type === 'credential') return !!data.token;

    return false;
  } catch {
    return false;
  }
}

/**
 * Get authentication headers for API requests
 * Requirements 16.4, 17.5: Inject auth into requests
 */
export function getAuthHeaders(): Record<string, string> {
  const stored = sessionStorage.getItem('uigen_auth');
  if (!stored) return {};

  try {
    const data = JSON.parse(stored) as any;
    const headers: Record<string, string> = {};

    if (data.type === 'bearer' && data.token) {
      headers['x-uigen-auth'] = data.token;
    } else if (data.type === 'apiKey' && data.apiKey && data.apiKeyName && data.apiKeyIn) {
      headers['x-uigen-api-key'] = data.apiKey;
      headers['x-uigen-api-key-name'] = data.apiKeyName;
      headers['x-uigen-api-key-in'] = data.apiKeyIn;
    } else if (data.type === 'basic' && data.credentials) {
      headers['x-uigen-basic-auth'] = data.credentials;
    } else if (data.type === 'credential' && data.token) {
      headers['x-uigen-auth'] = data.token;
    }

    return headers;
  } catch {
    return {};
  }
}

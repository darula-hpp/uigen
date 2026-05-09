/**
 * API Client with OAuth Token Integration
 * 
 * Provides a fetch wrapper that automatically includes OAuth tokens in API requests.
 * Handles 401 responses by attempting token refresh.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.6, 4.8
 */

import { getAccessToken, getAuthMethod, clearTokens } from './oauth-token-storage';
import { OAuthStrategy } from './oauth-strategy';

/**
 * Track refresh attempts to prevent infinite loops
 */
let isRefreshing = false;

/**
 * Enhanced fetch that includes OAuth tokens and handles 401 responses
 * 
 * @param url - Request URL
 * @param options - Fetch options
 * @returns Promise resolving to Response
 * 
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.6, 4.8**
 */
export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  // Get OAuth access token if available
  const accessToken = getAccessToken();
  const authMethod = getAuthMethod();
  
  // Clone options to avoid mutating the original
  const enhancedOptions: RequestInit = { ...options };
  
  // Add Authorization header if OAuth token exists
  if (accessToken && authMethod === 'oauth') {
    enhancedOptions.headers = {
      ...enhancedOptions.headers,
      'Authorization': `Bearer ${accessToken}`
    };
  }
  
  // Make the request
  const response = await fetch(url, enhancedOptions);
  
  // Handle 401 Unauthorized - attempt token refresh
  if (response.status === 401 && accessToken && authMethod === 'oauth' && !isRefreshing) {
    // Try to refresh the token
    const refreshed = await attemptTokenRefresh();
    
    if (refreshed) {
      // Retry the original request with new token
      const newAccessToken = getAccessToken();
      if (newAccessToken) {
        enhancedOptions.headers = {
          ...enhancedOptions.headers,
          'Authorization': `Bearer ${newAccessToken}`
        };
        return fetch(url, enhancedOptions);
      }
    } else {
      // Refresh failed - redirect to login
      redirectToLogin();
    }
  }
  
  return response;
}

/**
 * Attempt to refresh the OAuth access token
 * 
 * @returns Promise resolving to true if refresh succeeded, false otherwise
 * 
 * **Validates: Requirements 4.3, 4.6, 13.1-13.11**
 */
async function attemptTokenRefresh(): Promise<boolean> {
  // Prevent multiple simultaneous refresh attempts
  if (isRefreshing) {
    return false;
  }
  
  isRefreshing = true;
  
  try {
    // Get stored provider configuration
    const providerJson = localStorage.getItem('oauth_last_provider');
    if (!providerJson) {
      return false;
    }
    
    const provider = JSON.parse(providerJson);
    const refreshToken = localStorage.getItem('oauth_refresh_token');
    
    if (!refreshToken) {
      return false;
    }
    
    // Attempt refresh using OAuth strategy
    const strategy = new OAuthStrategy();
    const result = await strategy.refresh(refreshToken, provider);
    
    return result.success;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return false;
  } finally {
    isRefreshing = false;
  }
}

/**
 * Redirect to login page after authentication failure
 * 
 * **Validates: Requirements 4.6, 4.8**
 */
function redirectToLogin(): void {
  // Clear all OAuth tokens
  clearTokens();
  
  // Redirect to login page
  window.location.href = '/login';
}

/**
 * Validate OAuth token on application load
 * 
 * Makes a test request to validate the stored token.
 * Removes invalid tokens from storage.
 * 
 * @param testEndpoint - Protected endpoint to test token validity
 * @returns Promise resolving to true if token is valid, false otherwise
 * 
 * **Validates: Requirements 4.6, 4.8**
 */
export async function validateTokenOnLoad(testEndpoint: string): Promise<boolean> {
  const accessToken = getAccessToken();
  const authMethod = getAuthMethod();
  
  // No OAuth token to validate
  if (!accessToken || authMethod !== 'oauth') {
    return false;
  }
  
  try {
    const response = await fetch(testEndpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (response.ok) {
      // Token is valid
      return true;
    } else {
      // Token is invalid - clear it
      clearTokens();
      return false;
    }
  } catch (error) {
    // Network error or other issue - assume token is invalid
    console.error('Token validation failed:', error);
    clearTokens();
    return false;
  }
}

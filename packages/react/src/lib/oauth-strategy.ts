/**
 * OAuth 2.0 Authentication Strategy
 * 
 * Implements OAuth 2.0 authorization code flow for social login providers.
 * Supports Google, GitHub, Facebook, and Microsoft OAuth providers.
 * 
 * Requirements: 3.1-3.9, 4.1-4.8, 13.1-13.11, 15.1-15.9
 */

import type { OAuthProvider } from '@uigen-dev/core';
import { generateState, storeState, validateState, clearState } from './oauth-state';
import { getProviderMetadata } from './oauth-providers';
import {
  storeAccessToken,
  getAccessToken as getStoredAccessToken,
  storeRefreshToken,
  getRefreshToken as getStoredRefreshToken,
  storeAuthMethod,
  clearTokens
} from './oauth-token-storage';
import { storeUserProfile, getUserProfile as getStoredUserProfile, type UserProfile } from './oauth-user-profile';

/**
 * OAuth credentials for initiating authorization flow
 */
export interface OAuthCredentials {
  provider: OAuthProvider;
}

/**
 * OAuth callback parameters from provider redirect
 */
export interface OAuthCallbackParams {
  code: string;
  state: string;
  provider: OAuthProvider;
}

// Re-export UserProfile from oauth-user-profile for convenience
export type { UserProfile } from './oauth-user-profile';

/**
 * Token exchange response from OAuth provider
 */
interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

/**
 * OAuth authentication result
 */
export interface OAuthAuthResult {
  success: boolean;
  error?: string;
  accessToken?: string;
  refreshToken?: string;
  profile?: UserProfile;
}

/**
 * OAuth 2.0 authentication strategy
 * 
 * Implements the authorization code flow:
 * 1. Generate state parameter for CSRF protection
 * 2. Redirect to provider authorization URL
 * 3. Handle callback with authorization code
 * 4. Exchange code for access token
 * 5. Fetch user profile
 * 6. Store tokens and profile
 * 
 * **Validates: Requirements 3.1-3.9, 4.1-4.8, 13.1-13.11, 15.1-15.9**
 */
export class OAuthStrategy {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private provider: OAuthProvider | null = null;
  private userProfile: UserProfile | null = null;

  /**
   * Initiate OAuth authorization flow
   * 
   * Generates a cryptographically secure state parameter, stores it in sessionStorage,
   * constructs the authorization URL with required parameters, and redirects the user
   * to the provider's authorization page.
   * 
   * @param credentials - OAuth credentials containing provider configuration
   * @returns Promise resolving to auth result (always success for redirect)
   * 
   * **Validates: Requirements 3.1, 3.2, 8.1, 8.7, 8.8, 12.1-12.3**
   */
  async login(credentials: OAuthCredentials): Promise<OAuthAuthResult> {
    const { provider } = credentials;
    
    // Get provider metadata for default values
    const metadata = getProviderMetadata(provider.provider);
    if (!metadata) {
      return {
        success: false,
        error: `Unsupported provider: ${provider.provider}`
      };
    }

    // Generate and store state parameter for CSRF protection
    const state = generateState();
    storeState(provider.provider, state);

    // Store provider configuration in sessionStorage for callback handling
    try {
      sessionStorage.setItem(`oauth_provider_${provider.provider}`, JSON.stringify(provider));
      // Also store in localStorage as fallback
      localStorage.setItem('oauth_last_provider', JSON.stringify(provider));
    } catch (error) {
      console.error('Failed to store provider configuration:', error);
    }

    // Determine which scopes to use (custom or defaults)
    const scopes = provider.scopes && provider.scopes.length > 0
      ? provider.scopes
      : metadata.defaultScopes;

    // Join scopes with provider-specific separator
    const scopeString = scopes.join(metadata.scopeSeparator);

    // Construct authorization URL
    const authUrl = provider.authorizationUrl || metadata.defaultAuthorizationUrl;
    const params = new URLSearchParams({
      client_id: provider.clientId,
      redirect_uri: provider.redirectUri,
      response_type: 'code',
      scope: scopeString,
      state: state
    });

    const authorizationUrl = `${authUrl}?${params.toString()}`;

    // Redirect to provider authorization page
    window.location.href = authorizationUrl;

    // Return success (actual auth happens after redirect)
    return { success: true };
  }

  /**
   * Handle OAuth callback and exchange authorization code for access token
   * 
   * Validates the state parameter, exchanges the authorization code for an access token,
   * fetches the user profile, and stores all data in localStorage.
   * 
   * @param params - Callback parameters including code, state, and provider
   * @returns Promise resolving to auth result with tokens and profile
   * 
   * **Validates: Requirements 3.3-3.9, 4.1-4.5, 6.3, 7.1-7.10, 12.4-12.9**
   */
  async loginWithCallback(params: OAuthCallbackParams): Promise<OAuthAuthResult> {
    const { code, state, provider } = params;

    // Validate state parameter for CSRF protection
    const isValidState = validateState(provider.provider, state);
    if (!isValidState) {
      clearState(provider.provider);
      return {
        success: false,
        error: 'Invalid authentication state. Please try again.'
      };
    }

    // Clear state after successful validation (single-use)
    clearState(provider.provider);

    try {
      // Exchange authorization code for access token
      const tokenResult = await this.exchangeCodeForToken(code, provider);
      if (!tokenResult.success) {
        return tokenResult;
      }

      // Store tokens
      this.accessToken = tokenResult.accessToken!;
      this.refreshToken = tokenResult.refreshToken || null;
      this.provider = provider;

      // Store tokens in localStorage using token storage utilities
      storeAccessToken(this.accessToken);
      if (this.refreshToken) {
        storeRefreshToken(this.refreshToken);
      }

      // Store auth method as "oauth"
      storeAuthMethod('oauth');

      // Fetch user profile (errors handled gracefully within getUserProfile)
      const profile = await this.getUserProfile(this.accessToken, provider);
      this.userProfile = profile;

      // Store user profile using utility function
      if (profile) {
        storeUserProfile(profile);
      }

      return {
        success: true,
        accessToken: this.accessToken,
        refreshToken: this.refreshToken || undefined,
        profile: this.userProfile || undefined
      };
    } catch (error) {
      console.error('OAuth callback error:', error);
      return {
        success: false,
        error: 'Authentication failed. Please try again.'
      };
    }
  }

  /**
   * Exchange authorization code for access token
   * 
   * Makes a POST request to the provider's token endpoint with the authorization code.
   * Handles timeouts (30 seconds) and various error responses.
   * 
   * @param code - Authorization code from provider
   * @param provider - OAuth provider configuration
   * @returns Promise resolving to auth result with tokens
   * 
   * **Validates: Requirements 3.3, 3.4, 3.5, 3.6**
   */
  private async exchangeCodeForToken(
    code: string,
    provider: OAuthProvider
  ): Promise<OAuthAuthResult> {
    const metadata = getProviderMetadata(provider.provider);
    if (!metadata) {
      return {
        success: false,
        error: `Unsupported provider: ${provider.provider}`
      };
    }

    const tokenUrl = provider.tokenUrl || metadata.defaultTokenUrl;

    // Create abort controller for 30-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: provider.redirectUri,
          client_id: provider.clientId
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Handle HTTP error responses
        if (response.status === 400) {
          const errorData = await response.json().catch(() => ({}));
          if (errorData.error === 'invalid_grant') {
            return {
              success: false,
              error: 'Authentication failed. Please try again.'
            };
          }
        }
        
        if (response.status === 401) {
          return {
            success: false,
            error: 'Authentication failed. Please try again.'
          };
        }

        return {
          success: false,
          error: 'Authentication failed. Please try again.'
        };
      }

      const tokenData: TokenResponse = await response.json();

      if (!tokenData.access_token) {
        return {
          success: false,
          error: 'Invalid token response from provider.'
        };
      }

      return {
        success: true,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: 'Unable to connect to authentication provider. Please check your internet connection.'
        };
      }

      return {
        success: false,
        error: 'Unable to connect to authentication provider. Please check your internet connection.'
      };
    }
  }

  /**
   * Fetch user profile from OAuth provider
   * 
   * Makes a GET request to the provider's userInfo endpoint with the access token.
   * Extracts email, name, and picture from the response.
   * Handles errors gracefully by logging to console and returning null instead of throwing.
   * 
   * @param accessToken - OAuth access token
   * @param provider - OAuth provider configuration
   * @returns Promise resolving to user profile or null on error
   * 
   * **Validates: Requirements 15.1-15.9**
   */
  async getUserProfile(accessToken: string, provider: OAuthProvider): Promise<UserProfile | null> {
    try {
      const metadata = getProviderMetadata(provider.provider);
      if (!metadata) {
        console.error(`[OAuth] Unsupported provider: ${provider.provider}`);
        return null;
      }

      const userInfoUrl = provider.userInfoUrl || metadata.defaultUserInfoUrl;

      const response = await fetch(userInfoUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        console.error(`[OAuth] Failed to fetch user profile: HTTP ${response.status}`);
        return null;
      }

      const userData = await response.json();

      // Extract profile information (field names vary by provider)
      const profile: UserProfile = {
        email: userData.email || '',
        name: userData.name || userData.login || userData.displayName || '',
        picture: userData.picture || userData.avatar_url || userData.photo || undefined
      };

      // Store user profile using utility function
      storeUserProfile(profile);

      return profile;
    } catch (error) {
      // Log error and continue without profile - don't throw
      console.error('[OAuth] Error fetching user profile:', error);
      return null;
    }
  }

  /**
   * Refresh access token using refresh token
   * 
   * Makes a POST request to the refresh token endpoint with the refresh token.
   * Updates the stored access token on success. Clears all tokens on failure.
   * 
   * @param refreshToken - OAuth refresh token
   * @param provider - OAuth provider configuration
   * @returns Promise resolving to auth result with new access token
   * 
   * **Validates: Requirements 4.3, 4.6, 13.1-13.11**
   */
  async refresh(refreshToken: string, provider: OAuthProvider): Promise<OAuthAuthResult> {
    const metadata = getProviderMetadata(provider.provider);
    if (!metadata) {
      return {
        success: false,
        error: `Unsupported provider: ${provider.provider}`
      };
    }

    const tokenUrl = provider.refreshTokenEndpoint || provider.tokenUrl || metadata.defaultTokenUrl;

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: provider.clientId
        })
      });

      if (!response.ok) {
        // Clear tokens on refresh failure
        this.clear();
        return {
          success: false,
          error: 'Token refresh failed. Please log in again.'
        };
      }

      const tokenData: TokenResponse = await response.json();

      if (!tokenData.access_token) {
        this.clear();
        return {
          success: false,
          error: 'Invalid token response from provider.'
        };
      }

      // Update stored access token
      this.accessToken = tokenData.access_token;
      storeAccessToken(this.accessToken);

      // Update refresh token if new one provided
      if (tokenData.refresh_token) {
        this.refreshToken = tokenData.refresh_token;
        storeRefreshToken(this.refreshToken);
      }

      return {
        success: true,
        accessToken: this.accessToken,
        refreshToken: this.refreshToken || undefined
      };
    } catch (error) {
      console.error('Token refresh error:', error);
      this.clear();
      return {
        success: false,
        error: 'Token refresh failed. Please log in again.'
      };
    }
  }

  /**
   * Get current access token
   * @returns Access token or null if not authenticated
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Get current refresh token
   * @returns Refresh token or null if not available
   */
  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  /**
   * Get current user profile
   * @returns User profile or null if not available
   */
  getCurrentUserProfile(): UserProfile | null {
    return this.userProfile;
  }

  /**
   * Check if currently authenticated
   * @returns True if access token exists
   */
  isAuthenticated(): boolean {
    return this.accessToken !== null;
  }

  /**
   * Clear all OAuth authentication state
   * 
   * Removes tokens, user profile, and auth method from storage.
   * 
   * **Validates: Requirements 4.4**
   */
  clear(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.provider = null;
    this.userProfile = null;
    
    // Clear from localStorage using token storage utilities
    clearTokens();
  }
}

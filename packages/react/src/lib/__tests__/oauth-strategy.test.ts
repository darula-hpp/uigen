/**
 * Unit tests for OAuthStrategy
 * 
 * Tests OAuth 2.0 authorization code flow implementation including:
 * - Authorization URL construction
 * - State generation and storage
 * - Token exchange with mocked HTTP responses
 * - User profile fetching
 * - Token refresh
 * - Error handling
 * 
 * **Validates: Requirements 3.1-3.9, 4.1-4.8, 13.1-13.11, 15.1-15.9**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OAuthStrategy } from '../oauth-strategy';
import type { OAuthProvider } from '@uigen-dev/core';
import * as oauthState from '../oauth-state';

// Mock the oauth-state module
vi.mock('../oauth-state', () => ({
  generateState: vi.fn(),
  storeState: vi.fn(),
  validateState: vi.fn(),
  clearState: vi.fn()
}));

describe('OAuthStrategy', () => {
  let strategy: OAuthStrategy;
  let mockProvider: OAuthProvider;
  let originalFetch: typeof global.fetch;
  let originalLocation: Location;

  beforeEach(() => {
    strategy = new OAuthStrategy();
    
    // Mock provider configuration
    mockProvider = {
      provider: 'google',
      clientId: 'test-client-id',
      redirectUri: 'http://localhost:3000/auth/callback',
      scopes: ['openid', 'email', 'profile'],
      enabled: true,
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo'
    };

    // Mock fetch
    originalFetch = global.fetch;
    global.fetch = vi.fn();

    // Mock window.location
    originalLocation = window.location;
    delete (window as any).location;
    window.location = { href: '' } as any;

    // Mock localStorage
    vi.spyOn(Storage.prototype, 'setItem');
    vi.spyOn(Storage.prototype, 'getItem');
    vi.spyOn(Storage.prototype, 'removeItem');

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    window.location = originalLocation;
    vi.restoreAllMocks();
  });

  describe('login', () => {
    it('should generate and store state parameter', async () => {
      const mockState = 'mock-state-123456789abcdef0';
      vi.mocked(oauthState.generateState).mockReturnValue(mockState);

      await strategy.login({ provider: mockProvider });

      expect(oauthState.generateState).toHaveBeenCalledTimes(1);
      expect(oauthState.storeState).toHaveBeenCalledWith('google', mockState);
    });

    it('should construct authorization URL with correct parameters', async () => {
      const mockState = 'mock-state-123456789abcdef0';
      vi.mocked(oauthState.generateState).mockReturnValue(mockState);

      await strategy.login({ provider: mockProvider });

      const expectedUrl = new URL(window.location.href);
      expect(expectedUrl.origin + expectedUrl.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
      
      const params = expectedUrl.searchParams;
      expect(params.get('client_id')).toBe('test-client-id');
      expect(params.get('redirect_uri')).toBe('http://localhost:3000/auth/callback');
      expect(params.get('response_type')).toBe('code');
      expect(params.get('scope')).toBe('openid email profile');
      expect(params.get('state')).toBe(mockState);
    });

    it('should use custom scopes when provided', async () => {
      const mockState = 'mock-state-123456789abcdef0';
      vi.mocked(oauthState.generateState).mockReturnValue(mockState);

      const customProvider = {
        ...mockProvider,
        scopes: ['custom:scope1', 'custom:scope2']
      };

      await strategy.login({ provider: customProvider });

      const expectedUrl = new URL(window.location.href);
      const params = expectedUrl.searchParams;
      expect(params.get('scope')).toBe('custom:scope1 custom:scope2');
    });

    it('should use default scopes when scopes array is empty', async () => {
      const mockState = 'mock-state-123456789abcdef0';
      vi.mocked(oauthState.generateState).mockReturnValue(mockState);

      const providerWithoutScopes = {
        ...mockProvider,
        scopes: []
      };

      await strategy.login({ provider: providerWithoutScopes });

      const expectedUrl = new URL(window.location.href);
      const params = expectedUrl.searchParams;
      // Default Google scopes
      expect(params.get('scope')).toBe('openid email profile');
    });

    it('should use default authorization URL when custom URL not provided', async () => {
      const mockState = 'mock-state-123456789abcdef0';
      vi.mocked(oauthState.generateState).mockReturnValue(mockState);

      const providerWithoutAuthUrl = {
        ...mockProvider,
        authorizationUrl: ''
      };

      await strategy.login({ provider: providerWithoutAuthUrl });

      const expectedUrl = new URL(window.location.href);
      expect(expectedUrl.origin + expectedUrl.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    });

    it('should return error for unsupported provider', async () => {
      const invalidProvider = {
        ...mockProvider,
        provider: 'invalid' as any
      };

      const result = await strategy.login({ provider: invalidProvider });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported provider');
    });

    it('should join GitHub scopes with space separator', async () => {
      const mockState = 'mock-state-123456789abcdef0';
      vi.mocked(oauthState.generateState).mockReturnValue(mockState);

      const githubProvider: OAuthProvider = {
        provider: 'github',
        clientId: 'github-client-id',
        redirectUri: 'http://localhost:3000/auth/callback',
        scopes: ['read:user', 'user:email'],
        enabled: true,
        authorizationUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        userInfoUrl: 'https://api.github.com/user'
      };

      await strategy.login({ provider: githubProvider });

      const expectedUrl = new URL(window.location.href);
      const params = expectedUrl.searchParams;
      expect(params.get('scope')).toBe('read:user user:email');
    });

    it('should join Facebook scopes with comma separator', async () => {
      const mockState = 'mock-state-123456789abcdef0';
      vi.mocked(oauthState.generateState).mockReturnValue(mockState);

      const facebookProvider: OAuthProvider = {
        provider: 'facebook',
        clientId: 'facebook-client-id',
        redirectUri: 'http://localhost:3000/auth/callback',
        scopes: ['email', 'public_profile'],
        enabled: true,
        authorizationUrl: 'https://www.facebook.com/v12.0/dialog/oauth',
        tokenUrl: 'https://graph.facebook.com/v12.0/oauth/access_token',
        userInfoUrl: 'https://graph.facebook.com/me?fields=id,name,email,picture'
      };

      await strategy.login({ provider: facebookProvider });

      const expectedUrl = new URL(window.location.href);
      const params = expectedUrl.searchParams;
      expect(params.get('scope')).toBe('email,public_profile');
    });
  });

  describe('loginWithCallback', () => {
    const mockCode = 'mock-authorization-code';
    const mockState = 'mock-state-123456789abcdef0';

    it('should validate state parameter', async () => {
      vi.mocked(oauthState.validateState).mockReturnValue(false);

      const result = await strategy.loginWithCallback({
        code: mockCode,
        state: mockState,
        provider: mockProvider
      });

      expect(oauthState.validateState).toHaveBeenCalledWith('google', mockState);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid authentication state');
    });

    it('should clear state after validation', async () => {
      vi.mocked(oauthState.validateState).mockReturnValue(false);

      await strategy.loginWithCallback({
        code: mockCode,
        state: mockState,
        provider: mockProvider
      });

      expect(oauthState.clearState).toHaveBeenCalledWith('google');
    });

    it('should exchange code for token on successful state validation', async () => {
      vi.mocked(oauthState.validateState).mockReturnValue(true);
      
      const mockTokenResponse = {
        access_token: 'mock-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'mock-refresh-token'
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse
      } as Response);

      // Mock user profile fetch
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          email: 'user@example.com',
          name: 'Test User',
          picture: 'https://example.com/avatar.jpg'
        })
      } as Response);

      const result = await strategy.loginWithCallback({
        code: mockCode,
        state: mockState,
        provider: mockProvider
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded'
          })
        })
      );

      expect(result.success).toBe(true);
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
    });

    it('should store tokens and auth method in localStorage', async () => {
      vi.mocked(oauthState.validateState).mockReturnValue(true);
      
      const mockTokenResponse = {
        access_token: 'mock-access-token',
        token_type: 'Bearer',
        refresh_token: 'mock-refresh-token'
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse
      } as Response);

      // Mock user profile fetch
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          email: 'user@example.com',
          name: 'Test User'
        })
      } as Response);

      await strategy.loginWithCallback({
        code: mockCode,
        state: mockState,
        provider: mockProvider
      });

      expect(localStorage.setItem).toHaveBeenCalledWith('oauth_access_token', 'mock-access-token');
      expect(localStorage.setItem).toHaveBeenCalledWith('oauth_refresh_token', 'mock-refresh-token');
      expect(localStorage.setItem).toHaveBeenCalledWith('auth_method', 'oauth');
    });

    it('should store access token even when refresh token is not provided', async () => {
      vi.mocked(oauthState.validateState).mockReturnValue(true);
      
      const mockTokenResponse = {
        access_token: 'mock-access-token',
        token_type: 'Bearer'
        // No refresh_token
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse
      } as Response);

      // Mock user profile fetch
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          email: 'user@example.com',
          name: 'Test User'
        })
      } as Response);

      await strategy.loginWithCallback({
        code: mockCode,
        state: mockState,
        provider: mockProvider
      });

      expect(localStorage.setItem).toHaveBeenCalledWith('oauth_access_token', 'mock-access-token');
      expect(localStorage.setItem).toHaveBeenCalledWith('auth_method', 'oauth');
      // Should not store refresh token if not provided
      const refreshTokenCalls = vi.mocked(localStorage.setItem).mock.calls.filter(
        call => call[0] === 'oauth_refresh_token'
      );
      expect(refreshTokenCalls.length).toBe(0);
    });

    it('should fetch and store user profile', async () => {
      vi.mocked(oauthState.validateState).mockReturnValue(true);
      
      const mockTokenResponse = {
        access_token: 'mock-access-token',
        token_type: 'Bearer'
      };

      const mockUserProfile = {
        email: 'user@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg'
      };

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserProfile
        } as Response);

      const result = await strategy.loginWithCallback({
        code: mockCode,
        state: mockState,
        provider: mockProvider
      });

      expect(result.profile).toEqual(mockUserProfile);
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'oauth_user_profile',
        JSON.stringify(mockUserProfile)
      );
    });

    it('should handle token exchange failure with 400 invalid_grant', async () => {
      vi.mocked(oauthState.validateState).mockReturnValue(true);
      
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'invalid_grant' })
      } as Response);

      const result = await strategy.loginWithCallback({
        code: mockCode,
        state: mockState,
        provider: mockProvider
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Authentication failed');
    });

    it('should handle token exchange failure with 401', async () => {
      vi.mocked(oauthState.validateState).mockReturnValue(true);
      
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 401
      } as Response);

      const result = await strategy.loginWithCallback({
        code: mockCode,
        state: mockState,
        provider: mockProvider
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Authentication failed');
    });

    it('should handle network timeout (30 seconds)', async () => {
      vi.mocked(oauthState.validateState).mockReturnValue(true);
      
      vi.mocked(global.fetch).mockRejectedValueOnce(
        Object.assign(new Error('Aborted'), { name: 'AbortError' })
      );

      const result = await strategy.loginWithCallback({
        code: mockCode,
        state: mockState,
        provider: mockProvider
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unable to connect to authentication provider');
    });

    it('should handle network errors', async () => {
      vi.mocked(oauthState.validateState).mockReturnValue(true);
      
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'));

      const result = await strategy.loginWithCallback({
        code: mockCode,
        state: mockState,
        provider: mockProvider
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unable to connect to authentication provider');
    });

    it('should continue authentication if user profile fetch fails', async () => {
      vi.mocked(oauthState.validateState).mockReturnValue(true);
      
      const mockTokenResponse = {
        access_token: 'mock-access-token',
        token_type: 'Bearer'
      };

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 500
        } as Response);

      const result = await strategy.loginWithCallback({
        code: mockCode,
        state: mockState,
        provider: mockProvider
      });

      // Should still succeed even if profile fetch fails
      expect(result.success).toBe(true);
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.profile).toBeUndefined();
    });

    it('should handle missing access_token in response', async () => {
      vi.mocked(oauthState.validateState).mockReturnValue(true);
      
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token_type: 'Bearer' }) // Missing access_token
      } as Response);

      const result = await strategy.loginWithCallback({
        code: mockCode,
        state: mockState,
        provider: mockProvider
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid token response');
    });
  });

  describe('getUserProfile', () => {
    const mockAccessToken = 'mock-access-token';
    let consoleErrorSpy: any;

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    it('should fetch user profile with Bearer token', async () => {
      const mockUserProfile = {
        email: 'user@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg'
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUserProfile
      } as Response);

      const profile = await strategy.getUserProfile(mockAccessToken, mockProvider);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockAccessToken}`
          })
        })
      );

      expect(profile).toEqual(mockUserProfile);
    });

    it('should store user profile in localStorage', async () => {
      const mockUserProfile = {
        email: 'user@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg'
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUserProfile
      } as Response);

      await strategy.getUserProfile(mockAccessToken, mockProvider);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'oauth_user_profile',
        JSON.stringify(mockUserProfile)
      );
    });

    it('should extract email from GitHub response', async () => {
      const githubProvider: OAuthProvider = {
        ...mockProvider,
        provider: 'github'
      };

      const mockGitHubProfile = {
        login: 'testuser',
        email: 'user@example.com',
        avatar_url: 'https://github.com/avatar.jpg'
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockGitHubProfile
      } as Response);

      const profile = await strategy.getUserProfile(mockAccessToken, githubProvider);

      expect(profile.email).toBe('user@example.com');
      expect(profile.name).toBe('testuser');
      expect(profile.picture).toBe('https://github.com/avatar.jpg');
    });

    it('should handle missing optional fields', async () => {
      const mockUserProfile = {
        email: 'user@example.com',
        name: 'Test User'
        // No picture field
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUserProfile
      } as Response);

      const profile = await strategy.getUserProfile(mockAccessToken, mockProvider);

      expect(profile.email).toBe('user@example.com');
      expect(profile.name).toBe('Test User');
      expect(profile.picture).toBeUndefined();
    });

    it('should return null on failed profile fetch', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 401
      } as Response);

      const profile = await strategy.getUserProfile(mockAccessToken, mockProvider);

      expect(profile).toBeNull();
    });

    it('should return null for unsupported provider', async () => {
      const invalidProvider = {
        ...mockProvider,
        provider: 'invalid' as any
      };

      const profile = await strategy.getUserProfile(mockAccessToken, invalidProvider);

      expect(profile).toBeNull();
    });

    it('should return null on network error', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'));

      const profile = await strategy.getUserProfile(mockAccessToken, mockProvider);

      expect(profile).toBeNull();
    });

    it('should return null on JSON parsing error', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        }
      } as Response);

      const profile = await strategy.getUserProfile(mockAccessToken, mockProvider);

      expect(profile).toBeNull();
    });

    it('should log error to console on failed profile fetch', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 401
      } as Response);

      await strategy.getUserProfile(mockAccessToken, mockProvider);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[OAuth] Failed to fetch user profile')
      );
    });

    it('should log error to console on network error', async () => {
      const networkError = new Error('Network error');
      vi.mocked(global.fetch).mockRejectedValueOnce(networkError);

      await strategy.getUserProfile(mockAccessToken, mockProvider);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[OAuth] Error fetching user profile:',
        networkError
      );
    });

    it('should log error to console for unsupported provider', async () => {
      const invalidProvider = {
        ...mockProvider,
        provider: 'invalid' as any
      };

      await strategy.getUserProfile(mockAccessToken, invalidProvider);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[OAuth] Unsupported provider')
      );
    });
  });

  describe('refresh', () => {
    const mockRefreshToken = 'mock-refresh-token';

    it('should refresh access token successfully', async () => {
      const mockTokenResponse = {
        access_token: 'new-access-token',
        token_type: 'Bearer',
        expires_in: 3600
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse
      } as Response);

      const result = await strategy.refresh(mockRefreshToken, mockProvider);

      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      expect(fetchCall[0]).toBe('https://oauth2.googleapis.com/token');
      expect(fetchCall[1]?.method).toBe('POST');
      
      const body = fetchCall[1]?.body as URLSearchParams;
      expect(body.get('grant_type')).toBe('refresh_token');
      expect(body.get('refresh_token')).toBe(mockRefreshToken);
      expect(body.get('client_id')).toBe('test-client-id');

      expect(result.success).toBe(true);
      expect(result.accessToken).toBe('new-access-token');
      expect(localStorage.setItem).toHaveBeenCalledWith('oauth_access_token', 'new-access-token');
    });

    it('should update refresh token if new one provided', async () => {
      const mockTokenResponse = {
        access_token: 'new-access-token',
        token_type: 'Bearer',
        refresh_token: 'new-refresh-token'
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse
      } as Response);

      const result = await strategy.refresh(mockRefreshToken, mockProvider);

      expect(result.success).toBe(true);
      expect(result.refreshToken).toBe('new-refresh-token');
      expect(localStorage.setItem).toHaveBeenCalledWith('oauth_access_token', 'new-access-token');
      expect(localStorage.setItem).toHaveBeenCalledWith('oauth_refresh_token', 'new-refresh-token');
    });

    it('should use custom refresh token endpoint if provided', async () => {
      const providerWithCustomRefreshEndpoint = {
        ...mockProvider,
        refreshTokenEndpoint: 'https://custom.example.com/refresh'
      };

      const mockTokenResponse = {
        access_token: 'new-access-token',
        token_type: 'Bearer'
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse
      } as Response);

      await strategy.refresh(mockRefreshToken, providerWithCustomRefreshEndpoint);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://custom.example.com/refresh',
        expect.any(Object)
      );
    });

    it('should clear tokens on refresh failure', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 400
      } as Response);

      const result = await strategy.refresh(mockRefreshToken, mockProvider);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Token refresh failed');
      expect(strategy.isAuthenticated()).toBe(false);
    });

    it('should handle network errors during refresh', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'));

      const result = await strategy.refresh(mockRefreshToken, mockProvider);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Token refresh failed');
      expect(strategy.isAuthenticated()).toBe(false);
    });

    it('should return error for unsupported provider', async () => {
      const invalidProvider = {
        ...mockProvider,
        provider: 'invalid' as any
      };

      const result = await strategy.refresh(mockRefreshToken, invalidProvider);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported provider');
    });
  });

  describe('getAccessToken', () => {
    it('should return null when not authenticated', () => {
      expect(strategy.getAccessToken()).toBeNull();
    });

    it('should return access token after successful login', async () => {
      vi.mocked(oauthState.validateState).mockReturnValue(true);
      
      const mockTokenResponse = {
        access_token: 'mock-access-token',
        token_type: 'Bearer'
      };

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ email: 'user@example.com', name: 'Test User' })
        } as Response);

      await strategy.loginWithCallback({
        code: 'mock-code',
        state: 'mock-state',
        provider: mockProvider
      });

      expect(strategy.getAccessToken()).toBe('mock-access-token');
    });
  });

  describe('getRefreshToken', () => {
    it('should return null when not authenticated', () => {
      expect(strategy.getRefreshToken()).toBeNull();
    });

    it('should return refresh token after successful login', async () => {
      vi.mocked(oauthState.validateState).mockReturnValue(true);
      
      const mockTokenResponse = {
        access_token: 'mock-access-token',
        token_type: 'Bearer',
        refresh_token: 'mock-refresh-token'
      };

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ email: 'user@example.com', name: 'Test User' })
        } as Response);

      await strategy.loginWithCallback({
        code: 'mock-code',
        state: 'mock-state',
        provider: mockProvider
      });

      expect(strategy.getRefreshToken()).toBe('mock-refresh-token');
    });
  });

  describe('getCurrentUserProfile', () => {
    it('should return null when not authenticated', () => {
      expect(strategy.getCurrentUserProfile()).toBeNull();
    });

    it('should return user profile after successful login', async () => {
      vi.mocked(oauthState.validateState).mockReturnValue(true);
      
      const mockTokenResponse = {
        access_token: 'mock-access-token',
        token_type: 'Bearer'
      };

      const mockUserProfile = {
        email: 'user@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg'
      };

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserProfile
        } as Response);

      await strategy.loginWithCallback({
        code: 'mock-code',
        state: 'mock-state',
        provider: mockProvider
      });

      expect(strategy.getCurrentUserProfile()).toEqual(mockUserProfile);
    });
  });

  describe('isAuthenticated', () => {
    it('should return false when not authenticated', () => {
      expect(strategy.isAuthenticated()).toBe(false);
    });

    it('should return true after successful login', async () => {
      vi.mocked(oauthState.validateState).mockReturnValue(true);
      
      const mockTokenResponse = {
        access_token: 'mock-access-token',
        token_type: 'Bearer'
      };

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ email: 'user@example.com', name: 'Test User' })
        } as Response);

      await strategy.loginWithCallback({
        code: 'mock-code',
        state: 'mock-state',
        provider: mockProvider
      });

      expect(strategy.isAuthenticated()).toBe(true);
    });

    it('should return false after clear', async () => {
      vi.mocked(oauthState.validateState).mockReturnValue(true);
      
      const mockTokenResponse = {
        access_token: 'mock-access-token',
        token_type: 'Bearer'
      };

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ email: 'user@example.com', name: 'Test User' })
        } as Response);

      await strategy.loginWithCallback({
        code: 'mock-code',
        state: 'mock-state',
        provider: mockProvider
      });

      strategy.clear();

      expect(strategy.isAuthenticated()).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all OAuth state and localStorage', async () => {
      vi.mocked(oauthState.validateState).mockReturnValue(true);
      
      const mockTokenResponse = {
        access_token: 'mock-access-token',
        token_type: 'Bearer',
        refresh_token: 'mock-refresh-token'
      };

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ email: 'user@example.com', name: 'Test User' })
        } as Response);

      await strategy.loginWithCallback({
        code: 'mock-code',
        state: 'mock-state',
        provider: mockProvider
      });

      strategy.clear();

      expect(strategy.getAccessToken()).toBeNull();
      expect(strategy.getRefreshToken()).toBeNull();
      expect(strategy.getCurrentUserProfile()).toBeNull();
      expect(strategy.isAuthenticated()).toBe(false);
      expect(localStorage.removeItem).toHaveBeenCalledWith('oauth_access_token');
      expect(localStorage.removeItem).toHaveBeenCalledWith('oauth_refresh_token');
      expect(localStorage.removeItem).toHaveBeenCalledWith('oauth_user_profile');
      expect(localStorage.removeItem).toHaveBeenCalledWith('auth_method');
    });
  });
});

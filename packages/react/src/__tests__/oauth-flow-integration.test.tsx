/**
 * Integration tests for complete OAuth authentication flows
 * 
 * Tests the full OAuth flow from button click through callback handling
 * to authenticated state with mocked OAuth providers.
 * 
 * Requirements: 3.1-3.9, 4.1-4.8, 5.1-5.9, 6.1-6.8, 13.1-13.11, 15.1-15.9
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { OAuthProvider } from '@uigen-dev/core';
import { LoginView } from '../components/views/LoginView';
import { OAuthCallback } from '../components/auth/OAuthCallback';
import { storeState, getAccessToken, getRefreshToken, getAuthMethod } from '../lib/oauth-token-storage';
import { getUserProfile } from '../lib/oauth-user-profile';
import type { AuthConfig } from '@uigen-dev/core';

// Mock window.location.href for redirect testing
const mockLocationHref = vi.fn();
Object.defineProperty(window, 'location', {
  value: {
    ...window.location,
    href: '',
    get href() {
      return this._href || '';
    },
    set href(value) {
      this._href = value;
      mockLocationHref(value);
    }
  },
  writable: true
});

describe('OAuth Flow Integration Tests', () => {
  beforeEach(() => {
    // Clear all storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Reset mocks
    mockLocationHref.mockClear();
    
    // Mock fetch for token exchange and user profile
    global.fetch = vi.fn();
  });

  describe('Google OAuth Flow', () => {
    const googleProvider: OAuthProvider = {
      provider: 'google',
      clientId: 'test-google-client-id',
      redirectUri: 'http://localhost:3000/auth/callback',
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
      scopes: ['openid', 'email', 'profile'],
      enabled: true
    };

    const authConfig: AuthConfig = {
      schemes: [],
      globalRequired: false,
      oauthProviders: [googleProvider]
    };

    it('should complete full Google OAuth flow', async () => {
      // Step 1: Render LoginView with Google OAuth
      const { rerender } = render(
        <MemoryRouter>
          <LoginView
            config={authConfig}
            appTitle="Test App"
            landingPageEnabled={false}
          />
        </MemoryRouter>
      );

      // Step 2: Click Google OAuth button
      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      fireEvent.click(googleButton);

      // Step 3: Verify redirect to Google authorization URL
      await waitFor(() => {
        expect(mockLocationHref).toHaveBeenCalled();
        const redirectUrl = mockLocationHref.mock.calls[0][0];
        expect(redirectUrl).toContain('accounts.google.com/o/oauth2/v2/auth');
        expect(redirectUrl).toContain('client_id=test-google-client-id');
        expect(redirectUrl).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fcallback');
        expect(redirectUrl).toContain('response_type=code');
        // Scopes can be joined with either %20 (space) or + (plus sign) - both are valid URL encoding
        expect(redirectUrl).toMatch(/scope=(openid(%20|\+)email(%20|\+)profile|openid\+email\+profile)/);
        expect(redirectUrl).toContain('state=');
      });

      // Extract state from redirect URL
      const redirectUrl = mockLocationHref.mock.calls[0][0];
      const stateMatch = redirectUrl.match(/state=([^&]+)/);
      const state = stateMatch ? decodeURIComponent(stateMatch[1]) : '';

      // Step 4: Simulate OAuth callback with authorization code
      const code = 'test-authorization-code';

      // Mock token exchange response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          token_type: 'Bearer',
          expires_in: 3600
        })
      });

      // Mock user profile response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          email: 'user@example.com',
          name: 'Test User',
          picture: 'https://example.com/avatar.jpg'
        })
      });

      // Render OAuthCallback component
      rerender(
        <MemoryRouter initialEntries={[`/auth/callback?code=${code}&state=${state}`]}>
          <OAuthCallback />
        </MemoryRouter>
      );

      // Step 5: Verify tokens and profile are stored
      await waitFor(() => {
        expect(getAccessToken()).toBe('test-access-token');
        expect(getRefreshToken()).toBe('test-refresh-token');
        expect(getAuthMethod()).toBe('oauth');
        
        const profile = getUserProfile();
        expect(profile).toEqual({
          email: 'user@example.com',
          name: 'Test User',
          picture: 'https://example.com/avatar.jpg'
        });
      });
    });

    it('should handle token exchange failure', async () => {
      render(
        <MemoryRouter>
          <LoginView
            config={authConfig}
            appTitle="Test App"
            landingPageEnabled={false}
          />
        </MemoryRouter>
      );

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      fireEvent.click(googleButton);

      await waitFor(() => {
        expect(mockLocationHref).toHaveBeenCalled();
      });

      const redirectUrl = mockLocationHref.mock.calls[0][0];
      const stateMatch = redirectUrl.match(/state=([^&]+)/);
      const state = stateMatch ? decodeURIComponent(stateMatch[1]) : '';
      const code = 'invalid-code';

      // Mock failed token exchange
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'invalid_grant',
          error_description: 'Invalid authorization code'
        })
      });

      const { rerender } = render(
        <MemoryRouter initialEntries={[`/auth/callback?code=${code}&state=${state}`]}>
          <OAuthCallback />
        </MemoryRouter>
      );

      // Verify error is displayed
      await waitFor(() => {
        expect(screen.getByText(/authentication failed/i)).toBeInTheDocument();
      });

      // Verify no tokens stored
      expect(getAccessToken()).toBeNull();
      expect(getRefreshToken()).toBeNull();
    });
  });

  describe('GitHub OAuth Flow', () => {
    const githubProvider: OAuthProvider = {
      provider: 'github',
      clientId: 'test-github-client-id',
      redirectUri: 'http://localhost:3000/auth/callback',
      authorizationUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      userInfoUrl: 'https://api.github.com/user',
      scopes: ['read:user', 'user:email'],
      enabled: true
    };

    const authConfig: AuthConfig = {
      schemes: [],
      globalRequired: false,
      oauthProviders: [githubProvider]
    };

    it('should complete full GitHub OAuth flow', async () => {
      render(
        <MemoryRouter>
          <LoginView
            config={authConfig}
            appTitle="Test App"
            landingPageEnabled={false}
          />
        </MemoryRouter>
      );

      const githubButton = screen.getByRole('button', { name: /continue with github/i });
      fireEvent.click(githubButton);

      await waitFor(() => {
        expect(mockLocationHref).toHaveBeenCalled();
        const redirectUrl = mockLocationHref.mock.calls[0][0];
        expect(redirectUrl).toContain('github.com/login/oauth/authorize');
        // GitHub uses comma-separated scopes, which can be URL-encoded as %2C or left as comma
        expect(redirectUrl).toMatch(/scope=(read%3Auser(%2C|,)user%3Aemail|read:user,user:email)/);
      });

      const redirectUrl = mockLocationHref.mock.calls[0][0];
      const stateMatch = redirectUrl.match(/state=([^&]+)/);
      const state = stateMatch ? decodeURIComponent(stateMatch[1]) : '';
      const code = 'github-auth-code';

      // Mock token exchange
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'github-access-token',
          token_type: 'bearer',
          scope: 'read:user,user:email'
        })
      });

      // Mock user profile (GitHub format)
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          login: 'testuser',
          email: 'testuser@github.com',
          avatar_url: 'https://github.com/avatar.jpg'
        })
      });

      const { rerender } = render(
        <MemoryRouter initialEntries={[`/auth/callback?code=${code}&state=${state}`]}>
          <OAuthCallback />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(getAccessToken()).toBe('github-access-token');
        expect(getAuthMethod()).toBe('oauth');
        
        const profile = getUserProfile();
        expect(profile?.email).toBe('testuser@github.com');
        expect(profile?.name).toBe('testuser');
      });
    });
  });

  describe('Multiple OAuth Providers', () => {
    const authConfig: AuthConfig = {
      schemes: [],
      globalRequired: false,
      oauthProviders: [
        {
          provider: 'google',
          clientId: 'google-client-id',
          redirectUri: 'http://localhost:3000/auth/callback',
          authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
          tokenUrl: 'https://oauth2.googleapis.com/token',
          userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
          scopes: ['openid', 'email'],
          enabled: true
        },
        {
          provider: 'github',
          clientId: 'github-client-id',
          redirectUri: 'http://localhost:3000/auth/callback',
          authorizationUrl: 'https://github.com/login/oauth/authorize',
          tokenUrl: 'https://github.com/login/oauth/access_token',
          userInfoUrl: 'https://api.github.com/user',
          scopes: ['read:user'],
          enabled: true
        }
      ]
    };

    it('should render multiple OAuth buttons', () => {
      render(
        <MemoryRouter>
          <LoginView
            config={authConfig}
            appTitle="Test App"
            landingPageEnabled={false}
          />
        </MemoryRouter>
      );

      expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continue with github/i })).toBeInTheDocument();
    });

    it('should handle provider-specific flows independently', async () => {
      render(
        <MemoryRouter>
          <LoginView
            config={authConfig}
            appTitle="Test App"
            landingPageEnabled={false}
          />
        </MemoryRouter>
      );

      // Click Google button
      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      fireEvent.click(googleButton);

      await waitFor(() => {
        const redirectUrl = mockLocationHref.mock.calls[0][0];
        expect(redirectUrl).toContain('accounts.google.com');
        expect(redirectUrl).toContain('client_id=google-client-id');
      });

      mockLocationHref.mockClear();

      // Click GitHub button
      const githubButton = screen.getByRole('button', { name: /continue with github/i });
      fireEvent.click(githubButton);

      await waitFor(() => {
        const redirectUrl = mockLocationHref.mock.calls[0][0];
        expect(redirectUrl).toContain('github.com');
        expect(redirectUrl).toContain('client_id=github-client-id');
      });
    });
  });

  describe('OAuth with Credential Auth Coexistence', () => {
    const authConfig: AuthConfig = {
      schemes: [{ type: 'bearer', name: 'bearerAuth' }],
      globalRequired: false,
      loginEndpoints: [{
        path: '/auth/login',
        method: 'POST',
        requestBodySchema: {
          type: 'object',
          key: 'body',
          label: 'Body',
          required: true,
          children: [
            { type: 'string', key: 'username', label: 'Username', required: true },
            { type: 'string', key: 'password', label: 'Password', required: true }
          ]
        },
        tokenPath: 'token'
      }],
      oauthProviders: [{
        provider: 'google',
        clientId: 'google-client-id',
        redirectUri: 'http://localhost:3000/auth/callback',
        authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
        scopes: ['openid', 'email'],
        enabled: true
      }]
    };

    it('should render both OAuth and credential login options', () => {
      render(
        <MemoryRouter>
          <LoginView
            config={authConfig}
            appTitle="Test App"
            landingPageEnabled={false}
          />
        </MemoryRouter>
      );

      // OAuth button
      expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();

      // Divider
      expect(screen.getByText('OR')).toBeInTheDocument();

      // Credential form
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });
  });

  describe('OAuth-Only Mode', () => {
    const authConfig: AuthConfig = {
      schemes: [],
      globalRequired: false,
      oauthProviders: [{
        provider: 'google',
        clientId: 'google-client-id',
        redirectUri: 'http://localhost:3000/auth/callback',
        authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
        scopes: ['openid', 'email'],
        enabled: true
      }]
    };

    it('should only render OAuth buttons without credential form', () => {
      render(
        <MemoryRouter>
          <LoginView
            config={authConfig}
            appTitle="Test App"
            landingPageEnabled={false}
          />
        </MemoryRouter>
      );

      // OAuth button present
      expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();

      // No divider
      expect(screen.queryByText('OR')).not.toBeInTheDocument();

      // No credential form
      expect(screen.queryByLabelText(/username/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
    });
  });
});

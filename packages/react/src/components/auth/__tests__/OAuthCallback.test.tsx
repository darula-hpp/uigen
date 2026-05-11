/**
 * Unit tests for OAuthCallback component
 * 
 * Tests:
 * - Code and state extraction from URL
 * - State validation success path
 * - State validation failure path
 * - Error parameter handling
 * - Token exchange success with mocked strategy
 * - Token exchange failure with mocked strategy
 * - Redirect to dashboard on success
 * - Redirect to login on failure
 * - URL cleanup after processing
 * 
 * Requirements: 7.1-7.10, 10.1-10.10
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { OAuthCallback } from '../OAuthCallback';
import * as OAuthStrategyModule from '@/lib/oauth-strategy';
import type { OAuthProvider } from '@uigen-dev/core';

// Mock the navigate function
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock OAuthStrategy
vi.mock('@/lib/oauth-strategy', () => ({
  OAuthStrategy: vi.fn(),
}));

// Mock LoadingSpinner
vi.mock('@/components/LoadingSpinner', () => ({
  LoadingSpinner: ({ size }: { size: string }) => (
    <div data-testid="loading-spinner" data-size={size}>Loading...</div>
  ),
}));

// Mock provider metadata
vi.mock('@/lib/oauth-providers', () => ({
  getProviderMetadata: (provider: string) => {
    const metadata: Record<string, any> = {
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
      }
    };
    return metadata[provider];
  }
}));

describe('OAuthCallback', () => {
  const mockProvider: OAuthProvider = {
    provider: 'google',
    clientId: 'test-client-id',
    redirectUri: 'http://localhost:3000/auth/callback',
    scopes: ['openid', 'email', 'profile'],
    enabled: true,
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    
    // Reset window.history.replaceState mock
    vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Code and state extraction', () => {
    it('should extract code and state from URL query parameters', async () => {
      const code = 'test-auth-code';
      const state = 'test-state-123';
      
      // Store provider config and state in sessionStorage
      sessionStorage.setItem('oauth_state_google', state);
      sessionStorage.setItem('oauth_provider_google', JSON.stringify(mockProvider));

      // Mock successful token exchange
      const mockLoginWithCallback = vi.fn().mockResolvedValue({
        success: true,
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token'
      });

      vi.mocked(OAuthStrategyModule.OAuthStrategy).mockImplementation(() => ({
        loginWithCallback: mockLoginWithCallback,
      } as any));

      render(
        <MemoryRouter initialEntries={[`/auth/callback?code=${code}&state=${state}`]}>
          <OAuthCallback />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockLoginWithCallback).toHaveBeenCalledWith({
          code,
          state,
          provider: mockProvider
        });
      });
    });
  });

  describe('State validation', () => {
    it('should proceed with token exchange when state is valid', async () => {
      const code = 'test-auth-code';
      const state = 'valid-state-456';
      
      sessionStorage.setItem('oauth_state_google', state);
      sessionStorage.setItem('oauth_provider_google', JSON.stringify(mockProvider));

      const mockLoginWithCallback = vi.fn().mockResolvedValue({
        success: true,
        accessToken: 'test-access-token'
      });

      vi.mocked(OAuthStrategyModule.OAuthStrategy).mockImplementation(() => ({
        loginWithCallback: mockLoginWithCallback,
      } as any));

      render(
        <MemoryRouter initialEntries={[`/auth/callback?code=${code}&state=${state}`]}>
          <OAuthCallback />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockLoginWithCallback).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
      });
    });

    it('should display error and redirect to login when state is invalid', async () => {
      const code = 'test-auth-code';
      const state = 'invalid-state';
      
      // Don't store state in sessionStorage (simulates invalid state)

      render(
        <MemoryRouter initialEntries={[`/auth/callback?code=${code}&state=${state}`]}>
          <OAuthCallback />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Authentication Failed')).toBeInTheDocument();
        expect(screen.getByText(/Invalid authentication state/)).toBeInTheDocument();
      });

      // Wait for redirect timeout
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
      }, { timeout: 4000 });
    });

    it('should display error when state parameter is missing', async () => {
      const code = 'test-auth-code';

      render(
        <MemoryRouter initialEntries={[`/auth/callback?code=${code}`]}>
          <OAuthCallback />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Authentication Failed')).toBeInTheDocument();
        expect(screen.getByText(/Missing authentication parameters/)).toBeInTheDocument();
      });
    });
  });

  describe('Error parameter handling', () => {
    it('should display error message when provider returns access_denied', async () => {
      render(
        <MemoryRouter initialEntries={['/auth/callback?error=access_denied']}>
          <OAuthCallback />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Authentication Failed')).toBeInTheDocument();
        expect(screen.getByText('Authorization was denied. Please try again.')).toBeInTheDocument();
      });

      // Should redirect to login after timeout
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
      }, { timeout: 4000 });
    });

    it('should display error message with description when provided', async () => {
      const errorDescription = 'User cancelled the authorization';

      render(
        <MemoryRouter initialEntries={[`/auth/callback?error=access_denied&error_description=${encodeURIComponent(errorDescription)}`]}>
          <OAuthCallback />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Authentication Failed')).toBeInTheDocument();
        expect(screen.getByText('Authorization was denied. Please try again.')).toBeInTheDocument();
      });
    });

    it('should not attempt token exchange when error parameter is present', async () => {
      const mockLoginWithCallback = vi.fn();

      vi.mocked(OAuthStrategyModule.OAuthStrategy).mockImplementation(() => ({
        loginWithCallback: mockLoginWithCallback,
      } as any));

      render(
        <MemoryRouter initialEntries={['/auth/callback?error=access_denied&code=test-code&state=test-state']}>
          <OAuthCallback />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Authentication Failed')).toBeInTheDocument();
      });

      // Should not call loginWithCallback
      expect(mockLoginWithCallback).not.toHaveBeenCalled();
    });

    it('should handle server_error from provider', async () => {
      render(
        <MemoryRouter initialEntries={['/auth/callback?error=server_error']}>
          <OAuthCallback />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Authentication provider error/)).toBeInTheDocument();
      });
    });

    it('should handle temporarily_unavailable from provider', async () => {
      render(
        <MemoryRouter initialEntries={['/auth/callback?error=temporarily_unavailable']}>
          <OAuthCallback />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/temporarily unavailable/)).toBeInTheDocument();
      });
    });
  });

  describe('Token exchange', () => {
    it('should call OAuthStrategy.loginWithCallback with correct parameters', async () => {
      const code = 'test-auth-code';
      const state = 'test-state-789';
      
      sessionStorage.setItem('oauth_state_google', state);
      sessionStorage.setItem('oauth_provider_google', JSON.stringify(mockProvider));

      const mockLoginWithCallback = vi.fn().mockResolvedValue({
        success: true,
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        profile: {
          email: 'user@example.com',
          name: 'Test User'
        }
      });

      vi.mocked(OAuthStrategyModule.OAuthStrategy).mockImplementation(() => ({
        loginWithCallback: mockLoginWithCallback,
      } as any));

      render(
        <MemoryRouter initialEntries={[`/auth/callback?code=${code}&state=${state}`]}>
          <OAuthCallback />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockLoginWithCallback).toHaveBeenCalledWith({
          code,
          state,
          provider: mockProvider
        });
      });
    });

    it('should display loading indicator during token exchange', async () => {
      const code = 'test-auth-code';
      const state = 'test-state-loading';
      
      sessionStorage.setItem('oauth_state_google', state);
      sessionStorage.setItem('oauth_provider_google', JSON.stringify(mockProvider));

      // Mock slow token exchange
      const mockLoginWithCallback = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 1000))
      );

      vi.mocked(OAuthStrategyModule.OAuthStrategy).mockImplementation(() => ({
        loginWithCallback: mockLoginWithCallback,
      } as any));

      render(
        <MemoryRouter initialEntries={[`/auth/callback?code=${code}&state=${state}`]}>
          <OAuthCallback />
        </MemoryRouter>
      );

      // Should show loading spinner
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText('Completing sign in...')).toBeInTheDocument();
    });

    it('should handle token exchange failure', async () => {
      const code = 'test-auth-code';
      const state = 'test-state-fail';
      
      sessionStorage.setItem('oauth_state_google', state);
      sessionStorage.setItem('oauth_provider_google', JSON.stringify(mockProvider));

      const mockLoginWithCallback = vi.fn().mockResolvedValue({
        success: false,
        error: 'Token exchange failed'
      });

      vi.mocked(OAuthStrategyModule.OAuthStrategy).mockImplementation(() => ({
        loginWithCallback: mockLoginWithCallback,
      } as any));

      render(
        <MemoryRouter initialEntries={[`/auth/callback?code=${code}&state=${state}`]}>
          <OAuthCallback />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Authentication Failed')).toBeInTheDocument();
        expect(screen.getByText('Token exchange failed')).toBeInTheDocument();
      });

      // Should redirect to login after timeout
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
      }, { timeout: 4000 });
    });

    it('should handle unexpected errors during token exchange', async () => {
      const code = 'test-auth-code';
      const state = 'test-state-error';
      
      sessionStorage.setItem('oauth_state_google', state);
      sessionStorage.setItem('oauth_provider_google', JSON.stringify(mockProvider));

      const mockLoginWithCallback = vi.fn().mockRejectedValue(new Error('Network error'));

      vi.mocked(OAuthStrategyModule.OAuthStrategy).mockImplementation(() => ({
        loginWithCallback: mockLoginWithCallback,
      } as any));

      render(
        <MemoryRouter initialEntries={[`/auth/callback?code=${code}&state=${state}`]}>
          <OAuthCallback />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Authentication Failed')).toBeInTheDocument();
        expect(screen.getByText(/unexpected error occurred/)).toBeInTheDocument();
      });
    });
  });

  describe('Redirects', () => {
    it('should redirect to dashboard on successful authentication', async () => {
      const code = 'test-auth-code';
      const state = 'test-state-success';
      
      sessionStorage.setItem('oauth_state_google', state);
      sessionStorage.setItem('oauth_provider_google', JSON.stringify(mockProvider));

      const mockLoginWithCallback = vi.fn().mockResolvedValue({
        success: true,
        accessToken: 'test-access-token'
      });

      vi.mocked(OAuthStrategyModule.OAuthStrategy).mockImplementation(() => ({
        loginWithCallback: mockLoginWithCallback,
      } as any));

      render(
        <MemoryRouter initialEntries={[`/auth/callback?code=${code}&state=${state}`]}>
          <OAuthCallback />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
      });
    });

    it('should redirect to login on authentication failure', async () => {
      const code = 'test-auth-code';
      const state = 'test-state-redirect';
      
      sessionStorage.setItem('oauth_state_google', state);
      sessionStorage.setItem('oauth_provider_google', JSON.stringify(mockProvider));

      const mockLoginWithCallback = vi.fn().mockResolvedValue({
        success: false,
        error: 'Authentication failed'
      });

      vi.mocked(OAuthStrategyModule.OAuthStrategy).mockImplementation(() => ({
        loginWithCallback: mockLoginWithCallback,
      } as any));

      render(
        <MemoryRouter initialEntries={[`/auth/callback?code=${code}&state=${state}`]}>
          <OAuthCallback />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
      }, { timeout: 4000 });
    });
  });

  describe('URL cleanup', () => {
    it('should remove code and state parameters from URL after successful processing', async () => {
      const code = 'test-auth-code';
      const state = 'test-state-cleanup';
      
      sessionStorage.setItem('oauth_state_google', state);
      sessionStorage.setItem('oauth_provider_google', JSON.stringify(mockProvider));

      const mockLoginWithCallback = vi.fn().mockResolvedValue({
        success: true,
        accessToken: 'test-access-token'
      });

      vi.mocked(OAuthStrategyModule.OAuthStrategy).mockImplementation(() => ({
        loginWithCallback: mockLoginWithCallback,
      } as any));

      const replaceStateSpy = vi.spyOn(window.history, 'replaceState');

      render(
        <MemoryRouter initialEntries={[`/auth/callback?code=${code}&state=${state}`]}>
          <OAuthCallback />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(replaceStateSpy).toHaveBeenCalled();
      });
    });
  });

  describe('Provider determination', () => {
    it('should determine provider from sessionStorage using state parameter', async () => {
      const code = 'test-auth-code';
      const state = 'test-state-provider';
      
      const githubProvider: OAuthProvider = {
        ...mockProvider,
        provider: 'github',
        clientId: 'github-client-id'
      };
      
      sessionStorage.setItem('oauth_state_github', state);
      sessionStorage.setItem('oauth_provider_github', JSON.stringify(githubProvider));

      const mockLoginWithCallback = vi.fn().mockResolvedValue({
        success: true,
        accessToken: 'test-access-token'
      });

      vi.mocked(OAuthStrategyModule.OAuthStrategy).mockImplementation(() => ({
        loginWithCallback: mockLoginWithCallback,
      } as any));

      render(
        <MemoryRouter initialEntries={[`/auth/callback?code=${code}&state=${state}`]}>
          <OAuthCallback />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockLoginWithCallback).toHaveBeenCalledWith({
          code,
          state,
          provider: githubProvider
        });
      });
    });

    it('should fallback to localStorage when sessionStorage provider config is missing', async () => {
      const code = 'test-auth-code';
      const state = 'test-state-fallback';
      
      // Store state but not provider config in sessionStorage
      sessionStorage.setItem('oauth_state_google', state);
      
      // Store provider config in localStorage as fallback
      localStorage.setItem('oauth_last_provider', JSON.stringify(mockProvider));

      const mockLoginWithCallback = vi.fn().mockResolvedValue({
        success: true,
        accessToken: 'test-access-token'
      });

      vi.mocked(OAuthStrategyModule.OAuthStrategy).mockImplementation(() => ({
        loginWithCallback: mockLoginWithCallback,
      } as any));

      render(
        <MemoryRouter initialEntries={[`/auth/callback?code=${code}&state=${state}`]}>
          <OAuthCallback />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockLoginWithCallback).toHaveBeenCalledWith({
          code,
          state,
          provider: mockProvider
        });
      });
    });
  });
});

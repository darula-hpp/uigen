import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LoginView } from '../LoginView';
import type { AuthConfig, OAuthProvider } from '@uigen-dev/core';
import { OAuthStrategy } from '@/lib/oauth-strategy';

// Mock the auth strategies
vi.mock('@/lib/strategies', () => ({
  CredentialStrategy: vi.fn(),
  BearerStrategy: vi.fn(),
  ApiKeyStrategy: vi.fn(),
  SessionStorageStrategy: vi.fn(),
  AuthManager: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  storeAuthCredentials: vi.fn(),
}));

// Mock OAuthStrategy
vi.mock('@/lib/oauth-strategy', () => ({
  OAuthStrategy: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('LoginView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('should render login form when credential login endpoint exists', () => {
    const config: AuthConfig = {
      schemes: [],
      globalRequired: false,
      loginEndpoints: [
        {
          path: '/user/login',
          method: 'GET',
          requestBodySchema: {
            type: 'object',
            key: 'credentials',
            label: 'Credentials',
            required: false,
            children: [
              { type: 'string', key: 'username', label: 'Username', required: false },
              { type: 'string', key: 'password', label: 'Password', required: false },
            ],
          },
          tokenPath: 'token',
          description: 'Logs user into the system',
        },
      ],
    };

    render(
      <BrowserRouter>
        <LoginView config={config} appTitle="Test App" />
      </BrowserRouter>
    );

    expect(screen.getByText('Test App')).toBeInTheDocument();
    expect(screen.getByText('Sign in to access the dashboard')).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should render bearer token form when bearer scheme exists', () => {
    const config: AuthConfig = {
      schemes: [{ type: 'bearer', name: 'bearerAuth', scheme: 'bearer' }],
      globalRequired: false,
      loginEndpoints: [],
    };

    render(
      <BrowserRouter>
        <LoginView config={config} appTitle="Test App" />
      </BrowserRouter>
    );

    expect(screen.getByLabelText('Bearer Token')).toBeInTheDocument();
  });

  it('should render API key form when apiKey scheme exists', () => {
    const config: AuthConfig = {
      schemes: [{ type: 'apiKey', name: 'api_key', in: 'header' }],
      globalRequired: false,
      loginEndpoints: [],
    };

    render(
      <BrowserRouter>
        <LoginView config={config} appTitle="Test App" />
      </BrowserRouter>
    );

    expect(screen.getByLabelText('API Key')).toBeInTheDocument();
  });

  it('should show tabs when multiple auth methods exist', () => {
    const config: AuthConfig = {
      schemes: [
        { type: 'bearer', name: 'bearerAuth', scheme: 'bearer' },
        { type: 'apiKey', name: 'api_key', in: 'header' },
      ],
      globalRequired: false,
      loginEndpoints: [
        {
          path: '/login',
          method: 'POST',
          requestBodySchema: {
            type: 'object',
            key: 'credentials',
            label: 'Credentials',
            required: false,
            children: [],
          },
          tokenPath: 'token',
        },
      ],
    };

    render(
      <BrowserRouter>
        <LoginView config={config} appTitle="Test App" />
      </BrowserRouter>
    );

    // Should show tab buttons (using getAllByRole to handle multiple "Sign In" buttons)
    const buttons = screen.getAllByRole('button');
    const tabButtons = buttons.filter(btn => 
      btn.textContent === 'Sign In' || 
      btn.textContent === 'Bearer Token' || 
      btn.textContent === 'API Key'
    );
    
    expect(tabButtons.length).toBeGreaterThanOrEqual(3);
    expect(screen.getByRole('button', { name: 'Bearer Token' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'API Key' })).toBeInTheDocument();
  });

  it('should show "Forgot password?" link when password reset endpoints exist', () => {
    const config: AuthConfig = {
      schemes: [],
      globalRequired: false,
      loginEndpoints: [
        {
          path: '/user/login',
          method: 'POST',
          requestBodySchema: {
            type: 'object',
            key: 'body',
            label: 'Body',
            required: true,
          },
          tokenPath: 'token',
        },
      ],
      passwordResetEndpoints: [
        {
          path: '/auth/reset-password',
          method: 'POST',
        },
      ],
    };

    render(
      <BrowserRouter>
        <LoginView config={config} appTitle="Test App" />
      </BrowserRouter>
    );

    expect(screen.getByText('Forgot password?')).toBeInTheDocument();
  });

  it('should navigate to /password-reset when "Forgot password?" is clicked', () => {
    const config: AuthConfig = {
      schemes: [],
      globalRequired: false,
      loginEndpoints: [
        {
          path: '/user/login',
          method: 'POST',
          requestBodySchema: {
            type: 'object',
            key: 'body',
            label: 'Body',
            required: true,
          },
          tokenPath: 'token',
        },
      ],
      passwordResetEndpoints: [
        {
          path: '/auth/reset-password',
          method: 'POST',
        },
      ],
    };

    render(
      <BrowserRouter>
        <LoginView config={config} appTitle="Test App" />
      </BrowserRouter>
    );

    const forgotPasswordLink = screen.getByText('Forgot password?');
    fireEvent.click(forgotPasswordLink);

    expect(mockNavigate).toHaveBeenCalledWith('/password-reset');
  });

  it('should show "Create account" link when sign-up endpoints exist', () => {
    const config: AuthConfig = {
      schemes: [],
      globalRequired: false,
      loginEndpoints: [
        {
          path: '/user/login',
          method: 'POST',
          requestBodySchema: {
            type: 'object',
            key: 'body',
            label: 'Body',
            required: true,
          },
          tokenPath: 'token',
        },
      ],
      signUpEndpoints: [
        {
          path: '/auth/register',
          method: 'POST',
        },
      ],
    };

    render(
      <BrowserRouter>
        <LoginView config={config} appTitle="Test App" />
      </BrowserRouter>
    );

    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
    expect(screen.getByText('Create account')).toBeInTheDocument();
  });

  it('should navigate to /signup when "Create account" is clicked', () => {
    const config: AuthConfig = {
      schemes: [],
      globalRequired: false,
      loginEndpoints: [
        {
          path: '/user/login',
          method: 'POST',
          requestBodySchema: {
            type: 'object',
            key: 'body',
            label: 'Body',
            required: true,
          },
          tokenPath: 'token',
        },
      ],
      signUpEndpoints: [
        {
          path: '/auth/register',
          method: 'POST',
        },
      ],
    };

    render(
      <BrowserRouter>
        <LoginView config={config} appTitle="Test App" />
      </BrowserRouter>
    );

    const createAccountLink = screen.getByText('Create account');
    fireEvent.click(createAccountLink);

    expect(mockNavigate).toHaveBeenCalledWith('/signup');
  });

  /**
   * Test multiple login endpoints (x-uigen-login annotation feature)
   * Validates that annotated endpoints are prioritized and displayed correctly
   */
  describe('Multiple Login Endpoints (x-uigen-login annotation)', () => {
    it('should show endpoint selector when multiple login endpoints exist', () => {
      const config: AuthConfig = {
        schemes: [],
        globalRequired: false,
        loginEndpoints: [
          {
            path: '/auth/authenticate',
            method: 'POST',
            requestBodySchema: {
              type: 'object',
              key: 'credentials',
              label: 'Credentials',
              required: false,
              children: [
                { type: 'string', key: 'username', label: 'Username', required: false },
                { type: 'string', key: 'password', label: 'Password', required: false },
              ],
            },
            tokenPath: 'accessToken',
            description: 'Primary authentication endpoint',
          },
          {
            path: '/auth/phone-login',
            method: 'POST',
            requestBodySchema: {
              type: 'object',
              key: 'credentials',
              label: 'Credentials',
              required: false,
              children: [
                { type: 'string', key: 'phone', label: 'Phone', required: false },
                { type: 'string', key: 'otp', label: 'OTP', required: false },
              ],
            },
            tokenPath: 'token',
            description: 'Phone authentication endpoint',
          },
        ],
      };

      render(
        <BrowserRouter>
          <LoginView config={config} appTitle="Test App" />
        </BrowserRouter>
      );

      // Should show endpoint selector
      expect(screen.getByLabelText('Login method')).toBeInTheDocument();
      
      // Should show first endpoint as default
      const selector = screen.getByLabelText('Login method') as HTMLSelectElement;
      expect(selector.value).toBe('/auth/authenticate');
      
      // Should show both endpoints in the dropdown
      expect(screen.getByText('Primary authentication endpoint')).toBeInTheDocument();
      expect(screen.getByText('Phone authentication endpoint')).toBeInTheDocument();
    });

    it('should not show endpoint selector when only one login endpoint exists', () => {
      const config: AuthConfig = {
        schemes: [],
        globalRequired: false,
        loginEndpoints: [
          {
            path: '/auth/login',
            method: 'POST',
            requestBodySchema: {
              type: 'object',
              key: 'credentials',
              label: 'Credentials',
              required: false,
              children: [
                { type: 'string', key: 'username', label: 'Username', required: false },
                { type: 'string', key: 'password', label: 'Password', required: false },
              ],
            },
            tokenPath: 'token',
            description: 'Login endpoint',
          },
        ],
      };

      render(
        <BrowserRouter>
          <LoginView config={config} appTitle="Test App" />
        </BrowserRouter>
      );

      // Should NOT show endpoint selector
      expect(screen.queryByLabelText('Login method')).not.toBeInTheDocument();
      
      // Should show login form directly
      expect(screen.getByLabelText('Username')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
    });

    it('should prioritize annotated endpoints (first endpoint is selected by default)', () => {
      const config: AuthConfig = {
        schemes: [],
        globalRequired: false,
        loginEndpoints: [
          // Annotated endpoint (should be first/default)
          {
            path: '/api/custom/authenticate',
            method: 'POST',
            requestBodySchema: {
              type: 'object',
              key: 'credentials',
              label: 'Credentials',
              required: false,
              children: [
                { type: 'string', key: 'username', label: 'Username', required: false },
                { type: 'string', key: 'password', label: 'Password', required: false },
              ],
            },
            tokenPath: 'accessToken',
            description: 'Custom authentication (annotated)',
          },
          // Auto-detected endpoint (should be second)
          {
            path: '/auth/login',
            method: 'POST',
            requestBodySchema: {
              type: 'object',
              key: 'credentials',
              label: 'Credentials',
              required: false,
              children: [
                { type: 'string', key: 'email', label: 'Email', required: false },
                { type: 'string', key: 'password', label: 'Password', required: false },
              ],
            },
            tokenPath: 'token',
            description: 'Standard login (auto-detected)',
          },
        ],
      };

      render(
        <BrowserRouter>
          <LoginView config={config} appTitle="Test App" />
        </BrowserRouter>
      );

      // Should show endpoint selector
      const selector = screen.getByLabelText('Login method') as HTMLSelectElement;
      
      // First endpoint (annotated) should be selected by default
      expect(selector.value).toBe('/api/custom/authenticate');
      
      // Should show form fields (LoginView uses hardcoded "Username" and "Password" labels)
      expect(screen.getByLabelText('Username')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
    });

    it('should handle email field detection in login endpoints', () => {
      const config: AuthConfig = {
        schemes: [],
        globalRequired: false,
        loginEndpoints: [
          {
            path: '/auth/email-login',
            method: 'POST',
            requestBodySchema: {
              type: 'object',
              key: 'credentials',
              label: 'Credentials',
              required: false,
              children: [
                { type: 'string', key: 'email', label: 'Email', required: false },
                { type: 'string', key: 'password', label: 'Password', required: false },
              ],
            },
            tokenPath: 'token',
            description: 'Email login',
          },
        ],
      };

      render(
        <BrowserRouter>
          <LoginView config={config} appTitle="Test App" />
        </BrowserRouter>
      );

      // Should show "Email" label instead of "Username" when email field is detected
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.queryByLabelText('Username')).not.toBeInTheDocument();
    });
  });

  /**
   * Test OAuth integration (Task 9)
   * Validates OAuth provider buttons, error handling, and OAuth-only mode
   */
  describe('OAuth Integration', () => {
    const mockOAuthProviders: OAuthProvider[] = [
      {
        provider: 'google',
        clientId: 'google-client-id',
        redirectUri: 'http://localhost:3000/auth/callback',
        scopes: ['openid', 'email', 'profile'],
        enabled: true,
        authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
        refreshTokenEndpoint: 'https://oauth2.googleapis.com/token',
      },
      {
        provider: 'github',
        clientId: 'github-client-id',
        redirectUri: 'http://localhost:3000/auth/callback',
        scopes: ['user:email'],
        enabled: true,
        authorizationUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        userInfoUrl: 'https://api.github.com/user',
        refreshTokenEndpoint: 'https://github.com/login/oauth/access_token',
      },
    ];

    it('should render OAuth buttons when providers are configured', () => {
      const config: AuthConfig = {
        schemes: [],
        globalRequired: false,
        loginEndpoints: [],
        oauthProviders: mockOAuthProviders,
      };

      render(
        <BrowserRouter>
          <LoginView config={config} appTitle="Test App" />
        </BrowserRouter>
      );

      // Should render OAuth buttons
      expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continue with github/i })).toBeInTheDocument();
    });

    it('should render credential form when x-uigen-login is configured', () => {
      const config: AuthConfig = {
        schemes: [],
        globalRequired: false,
        loginEndpoints: [
          {
            path: '/auth/login',
            method: 'POST',
            requestBodySchema: {
              type: 'object',
              key: 'credentials',
              label: 'Credentials',
              required: false,
              children: [
                { type: 'string', key: 'username', label: 'Username', required: false },
                { type: 'string', key: 'password', label: 'Password', required: false },
              ],
            },
            tokenPath: 'token',
          },
        ],
        oauthProviders: [],
      };

      render(
        <BrowserRouter>
          <LoginView config={config} appTitle="Test App" />
        </BrowserRouter>
      );

      // Should render credential form
      expect(screen.getByLabelText('Username')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should render both OAuth and credential with divider', () => {
      const config: AuthConfig = {
        schemes: [],
        globalRequired: false,
        loginEndpoints: [
          {
            path: '/auth/login',
            method: 'POST',
            requestBodySchema: {
              type: 'object',
              key: 'credentials',
              label: 'Credentials',
              required: false,
              children: [
                { type: 'string', key: 'username', label: 'Username', required: false },
                { type: 'string', key: 'password', label: 'Password', required: false },
              ],
            },
            tokenPath: 'token',
          },
        ],
        oauthProviders: mockOAuthProviders,
      };

      render(
        <BrowserRouter>
          <LoginView config={config} appTitle="Test App" />
        </BrowserRouter>
      );

      // Should render OAuth buttons
      expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continue with github/i })).toBeInTheDocument();

      // Should render divider with "OR" text
      expect(screen.getByText('OR')).toBeInTheDocument();

      // Should render credential form
      expect(screen.getByLabelText('Username')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
    });

    it('should render OAuth-only mode (no credential form)', () => {
      const config: AuthConfig = {
        schemes: [],
        globalRequired: false,
        loginEndpoints: [],
        oauthProviders: mockOAuthProviders,
      };

      render(
        <BrowserRouter>
          <LoginView config={config} appTitle="Test App" />
        </BrowserRouter>
      );

      // Should render OAuth buttons
      expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continue with github/i })).toBeInTheDocument();

      // Should NOT render divider
      expect(screen.queryByText('OR')).not.toBeInTheDocument();

      // Should NOT render credential form
      expect(screen.queryByLabelText('Username')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
    });

    it('should call OAuthStrategy.login when OAuth button is clicked', async () => {
      const mockLogin = vi.fn().mockResolvedValue({ success: true });
      (OAuthStrategy as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        login: mockLogin,
      }));

      const config: AuthConfig = {
        schemes: [],
        globalRequired: false,
        loginEndpoints: [],
        oauthProviders: [mockOAuthProviders[0]],
      };

      render(
        <BrowserRouter>
          <LoginView config={config} appTitle="Test App" />
        </BrowserRouter>
      );

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      fireEvent.click(googleButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          provider: mockOAuthProviders[0],
        });
      });
    });

    it('should disable all OAuth buttons during authorization', async () => {
      const mockLogin = vi.fn().mockImplementation(() => new Promise(() => {})); // Never resolves
      (OAuthStrategy as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        login: mockLogin,
      }));

      const config: AuthConfig = {
        schemes: [],
        globalRequired: false,
        loginEndpoints: [],
        oauthProviders: mockOAuthProviders,
      };

      render(
        <BrowserRouter>
          <LoginView config={config} appTitle="Test App" />
        </BrowserRouter>
      );

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      const githubButton = screen.getByRole('button', { name: /continue with github/i });

      // Click Google button
      fireEvent.click(googleButton);

      await waitFor(() => {
        // Google button should be in loading state
        expect(googleButton).toBeDisabled();
        // GitHub button should also be disabled
        expect(githubButton).toBeDisabled();
      });
    });

    it('should show loading indicator on clicked button', async () => {
      const mockLogin = vi.fn().mockImplementation(() => new Promise(() => {})); // Never resolves
      (OAuthStrategy as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        login: mockLogin,
      }));

      const config: AuthConfig = {
        schemes: [],
        globalRequired: false,
        loginEndpoints: [],
        oauthProviders: [mockOAuthProviders[0]],
      };

      render(
        <BrowserRouter>
          <LoginView config={config} appTitle="Test App" />
        </BrowserRouter>
      );

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      fireEvent.click(googleButton);

      await waitFor(() => {
        // Button should be disabled (loading state)
        expect(googleButton).toBeDisabled();
      });
    });

    it('should display OAuth error message', async () => {
      const mockLogin = vi.fn().mockResolvedValue({
        success: false,
        error: 'OAuth provider is unavailable',
      });
      (OAuthStrategy as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        login: mockLogin,
      }));

      const config: AuthConfig = {
        schemes: [],
        globalRequired: false,
        loginEndpoints: [],
        oauthProviders: [mockOAuthProviders[0]],
      };

      render(
        <BrowserRouter>
          <LoginView config={config} appTitle="Test App" />
        </BrowserRouter>
      );

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      fireEvent.click(googleButton);

      await waitFor(() => {
        expect(screen.getByText('OAuth provider is unavailable')).toBeInTheDocument();
      });
    });

    it('should allow user to dismiss error message', async () => {
      const mockLogin = vi.fn().mockResolvedValue({
        success: false,
        error: 'OAuth provider is unavailable',
      });
      (OAuthStrategy as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        login: mockLogin,
      }));

      const config: AuthConfig = {
        schemes: [],
        globalRequired: false,
        loginEndpoints: [],
        oauthProviders: [mockOAuthProviders[0]],
      };

      render(
        <BrowserRouter>
          <LoginView config={config} appTitle="Test App" />
        </BrowserRouter>
      );

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      fireEvent.click(googleButton);

      await waitFor(() => {
        expect(screen.getByText('OAuth provider is unavailable')).toBeInTheDocument();
      });

      // Dismiss error
      const dismissButton = screen.getByLabelText('Dismiss error');
      fireEvent.click(dismissButton);

      await waitFor(() => {
        expect(screen.queryByText('OAuth provider is unavailable')).not.toBeInTheDocument();
      });
    });

    it('should clear error message when user initiates new OAuth flow', async () => {
      const mockLogin = vi
        .fn()
        .mockResolvedValueOnce({
          success: false,
          error: 'OAuth provider is unavailable',
        })
        .mockResolvedValueOnce({ success: true });

      (OAuthStrategy as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        login: mockLogin,
      }));

      const config: AuthConfig = {
        schemes: [],
        globalRequired: false,
        loginEndpoints: [],
        oauthProviders: mockOAuthProviders,
      };

      render(
        <BrowserRouter>
          <LoginView config={config} appTitle="Test App" />
        </BrowserRouter>
      );

      // First attempt - fails
      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      fireEvent.click(googleButton);

      await waitFor(() => {
        expect(screen.getByText('OAuth provider is unavailable')).toBeInTheDocument();
      });

      // Second attempt - should clear error
      const githubButton = screen.getByRole('button', { name: /continue with github/i });
      fireEvent.click(githubButton);

      await waitFor(() => {
        expect(screen.queryByText('OAuth provider is unavailable')).not.toBeInTheDocument();
      });
    });

    it('should not render OAuth buttons when no providers are configured', () => {
      const config: AuthConfig = {
        schemes: [],
        globalRequired: false,
        loginEndpoints: [
          {
            path: '/auth/login',
            method: 'POST',
            requestBodySchema: {
              type: 'object',
              key: 'credentials',
              label: 'Credentials',
              required: false,
              children: [
                { type: 'string', key: 'username', label: 'Username', required: false },
                { type: 'string', key: 'password', label: 'Password', required: false },
              ],
            },
            tokenPath: 'token',
          },
        ],
        oauthProviders: [],
      };

      render(
        <BrowserRouter>
          <LoginView config={config} appTitle="Test App" />
        </BrowserRouter>
      );

      // Should NOT render OAuth buttons
      expect(screen.queryByRole('button', { name: /continue with/i })).not.toBeInTheDocument();

      // Should render credential form
      expect(screen.getByLabelText('Username')).toBeInTheDocument();
    });

    it('should filter out disabled OAuth providers', () => {
      const config: AuthConfig = {
        schemes: [],
        globalRequired: false,
        loginEndpoints: [],
        oauthProviders: [
          mockOAuthProviders[0],
          {
            ...mockOAuthProviders[1],
            enabled: false,
          },
        ],
      };

      render(
        <BrowserRouter>
          <LoginView config={config} appTitle="Test App" />
        </BrowserRouter>
      );

      // Should render only enabled provider
      expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /continue with github/i })).not.toBeInTheDocument();
    });

    it('should limit OAuth providers to maximum of 10', () => {
      const manyProviders: OAuthProvider[] = Array.from({ length: 15 }, (_, i) => ({
        provider: 'google' as const,
        clientId: `client-${i}`,
        redirectUri: 'http://localhost:3000/auth/callback',
        scopes: ['openid', 'email'],
        enabled: true,
        authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
        refreshTokenEndpoint: 'https://oauth2.googleapis.com/token',
      }));

      const config: AuthConfig = {
        schemes: [],
        globalRequired: false,
        loginEndpoints: [],
        oauthProviders: manyProviders,
      };

      render(
        <BrowserRouter>
          <LoginView config={config} appTitle="Test App" />
        </BrowserRouter>
      );

      // Should render only 10 buttons
      const oauthButtons = screen.getAllByRole('button', { name: /continue with/i });
      expect(oauthButtons).toHaveLength(10);
    });

    it('should re-enable buttons on error', async () => {
      const mockLogin = vi.fn().mockResolvedValue({
        success: false,
        error: 'OAuth provider is unavailable',
      });
      (OAuthStrategy as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        login: mockLogin,
      }));

      const config: AuthConfig = {
        schemes: [],
        globalRequired: false,
        loginEndpoints: [],
        oauthProviders: mockOAuthProviders,
      };

      render(
        <BrowserRouter>
          <LoginView config={config} appTitle="Test App" />
        </BrowserRouter>
      );

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      const githubButton = screen.getByRole('button', { name: /continue with github/i });

      // Click Google button
      fireEvent.click(googleButton);

      // Wait for error
      await waitFor(() => {
        expect(screen.getByText('OAuth provider is unavailable')).toBeInTheDocument();
      });

      // Both buttons should be enabled again
      expect(googleButton).not.toBeDisabled();
      expect(githubButton).not.toBeDisabled();
    });
  });
});
